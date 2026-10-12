import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Optional local integration check. The temporary PostgreSQL runtime is not an app dependency.
test('card modes and payment RPCs on PostgreSQL with authenticated RLS', { skip: !process.env.PGLITE_TEST_MODULE }, async t => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
  const db = new PGlite();
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const card = '33333333-3333-4333-8333-333333333333';
  const charge = '44444444-4444-4444-8444-444444444444';
  const rule = '55555555-5555-4555-8555-555555555555';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user', true), '')::uuid$$;
      grant usage on schema auth to authenticated, anon;`);
    for (const name of ['202610110001_initial_heda.sql', '202610110002_recurring_movements.sql', '202610110003_custom_recurring_intervals.sql', '202610110004_card_payments.sql']) {
      await db.exec(readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
    }
    await db.query('insert into auth.users(id) values ($1),($2)', [owner, other]);
    await db.query(`insert into public.transactions(user_id,type,amount,category) values ($1,'income',10000,'Salario'),($1,'expense',200,'Comida')`, [owner]);
    await db.query(`insert into public.card_payments(id,user_id,name,amount,due_date) values ($1,$2,'Nu',1000,'2026-10-20')`, [card, owner]);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610110005_movement_modes.sql', import.meta.url), 'utf8'));
    await db.exec('set role authenticated');
    await db.query("select set_config('app.test_user',$1,false)", [owner]);
    await t.test('existing records and reminder debt are preserved when choosing card mode', async () => {
      await db.query("select public.heda_set_movement_mode('cards')");
      const result = await db.query('select opening_balance,ledger_enabled from public.card_payments where id=$1', [card]);
      assert.equal(Number(result.rows[0].opening_balance), 1000);
      assert.equal(result.rows[0].ledger_enabled, true);
      assert.equal((await db.query('select count(*)::int as n from public.transactions where card_id is null')).rows[0].n, 2);
    });
    await t.test('charge and edits keep the card ownership lock valid', async () => {
      await db.query(`insert into public.transactions(id,user_id,type,amount,category,card_id) values ($1,$2,'expense',100,'Comida',$3)`, [charge, owner, card]);
      await db.query('update public.transactions set amount=150 where id=$1', [charge]);
      await db.query('update public.transactions set amount=100 where id=$1', [charge]);
    });
    await t.test('full payment is atomic and retrying does not insert twice', async () => {
      await assert.rejects(db.query('select public.heda_pay_tracked_card($1,1000)', [card]));
      await db.query('select public.heda_pay_tracked_card($1,1100)', [card]);
      await db.query('select public.heda_pay_tracked_card($1,1100)', [card]);
      const result = await db.query(`select sum(case when card_id is null or is_card_payment then case when type='income' then amount else -amount end else 0 end) as cash,
        sum(case when type='expense' and not is_card_payment then amount else 0 end) as spending,
        count(*) filter(where is_card_payment)::int as payments from public.transactions`);
      assert.equal(Number(result.rows[0].cash), 8700);
      assert.equal(Number(result.rows[0].spending), 300);
      assert.equal(result.rows[0].payments, 1);
    });
    await t.test('confirming a recurring card charge uses the same ledger exactly once', async () => {
      await db.query(`insert into public.recurring_movements(id,user_id,name,type,amount,category,frequency,next_date,anchor_day,anchor_month,card_id) values ($1,$2,'Netflix','expense',200,'Servicios','monthly','2026-01-15',15,1,$3)`, [rule, owner, card]);
      await db.query("select public.heda_confirm_recurring($1,'2026-01-15')", [rule]);
      await db.query("select public.heda_confirm_recurring($1,'2026-01-15')", [rule]);
      const result = await db.query('select card_id,is_card_payment from public.transactions where recurring_movement_id=$1', [rule]);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].card_id, card);
      assert.equal(result.rows[0].is_card_payment, false);
    });
    await t.test('switching back to Simple does not erase or reinterpret card entries', async () => {
      await db.query("select public.heda_set_movement_mode('simple')");
      assert.equal((await db.query('select ledger_enabled from public.card_payments where id=$1', [card])).rows[0].ledger_enabled, true);
      await assert.rejects(db.query('update public.card_payments set ledger_enabled=false where id=$1', [card]));
      await assert.rejects(db.query('delete from public.card_payments where id=$1', [card]));
    });
    await t.test('another user cannot read, charge, schedule or pay this card', async () => {
      await db.query("select set_config('app.test_user',$1,false)", [other]);
      assert.equal((await db.query('select * from public.card_payments')).rows.length, 0);
      await assert.rejects(db.query('select public.heda_pay_tracked_card($1,200)', [card]));
      await assert.rejects(db.query(`insert into public.transactions(user_id,type,amount,category,card_id) values ($1,'expense',10,'Comida',$2)`, [other, card]));
      await assert.rejects(db.query(`insert into public.recurring_movements(user_id,name,type,amount,category,frequency,next_date,anchor_day,anchor_month,card_id) values ($1,'Netflix','expense',10,'Servicios','monthly','2026-01-15',15,1,$2)`, [other, card]));
    });
    await t.test('anonymous users have no card access', async () => {
      await db.exec('reset role; set role anon');
      await assert.rejects(db.query('select * from public.card_payments'));
      await assert.rejects(db.query("select public.heda_set_movement_mode('cards')"));
    });
  } finally { await db.close(); }
});
