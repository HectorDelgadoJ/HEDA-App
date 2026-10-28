// Run against npm run preview:web. All Supabase requests are intercepted.
// Set HEDA_PLAYWRIGHT_MODULE if Playwright is installed outside this project.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.HEDA_PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
 const page = await browser.newPage({ viewport: { width: Number(process.env.HEDA_QA_WIDTH || 390), height: 844 } });
 const errors = [], writes = [];
 page.on('pageerror', e => errors.push(e.message));
 const id = '11111111-1111-4111-8111-111111111111', entity = '22222222-2222-4222-8222-222222222222';
 const stamp=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 let goalRows=[{id:entity,user_id:id,name:'Ahorro de prueba',target_amount:1000,current_amount:250,target_date:stamp(20),status:'active',created_at:stamp(-30)+'T12:00:00Z'}];
 let rows=[],rules=[['44444444-4444-4444-8444-444444444444','Renta','expense',null],['55555555-5555-4555-8555-555555555555','Salario','income',null],['66666666-6666-4666-8666-666666666666','Netflix','expense','77777777-7777-4777-8777-777777777777']].map(([ruleId,name,type,card_id])=>({id:ruleId,user_id:id,name,type,card_id,amount:100,category:type==='income'?'Salario':'Hogar',description:'',frequency:'monthly',interval_count:1,anchor_day:1,anchor_month:1,next_date:stamp(-1),active:true}));
 const user = { id, email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { heda_experience: { version: 1, configured: true, welcomeDone: true, tourDone: true, mode: 'complete', theme: process.env.HEDA_QA_DARK ? 'dark' : 'light', accessibility: process.env.HEDA_QA_LARGE ? {textScale: 2, reduceMotion: true} : {} } } };
 const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'test'].join('.');
 await page.addInitScript(({user,token}) => localStorage.setItem('sb-ixzqwihpdvwnmawztret-auth-token', JSON.stringify({access_token:token,refresh_token:'test-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})), {user,token});
 await page.route('https://*.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname,body=req.postData()?JSON.parse(req.postData()):null;let value=[],status=200;
 if(!['GET','OPTIONS'].includes(req.method()))writes.push({path,body});
 if(path==='/auth/v1/user')value=user;
 else if(path.endsWith('/profiles'))value={id,full_name:'Prueba',username:'prueba',birth_date:'2000-01-01',movement_mode:'simple'};
 else if(path.endsWith('/heda_account_active'))value=true;
 else if(path.endsWith('/heda_is_admin'))value=false;
 else if(path.endsWith('/heda_confirm_recurring')){
   assert.deepEqual(Object.keys(body).sort(),['p_date','p_id']);const rule=rules.find(r=>r.id===body.p_id);assert.equal(body.p_date,rule.next_date);
   const transaction={id:`99999999-9999-4999-8999-${String(rows.length+1).padStart(12,'0')}`,user_id:id,type:rule.type,amount:rule.amount,category:rule.category,description:rule.name,transaction_date:rule.next_date,recurring_movement_id:rule.id,recurring_date:rule.next_date,card_id:rule.card_id,created_at:new Date().toISOString()};rows.push(transaction);rule.next_date=stamp(30);value=transaction.id;
 }
 else if(path.endsWith('/recurring_movements'))value=rules;
 else if(path.endsWith('/transactions'))value=rows;
 else if(path.endsWith('/goals')){
  const goalId=url.searchParams.get('id')?.replace('eq.','');
  if(req.method()==='PATCH'){
   const g=goalRows.find(g=>g.id===goalId);assert.equal(url.searchParams.get('user_id'),'eq.'+id);
   if(body.current_amount!==undefined){assert.equal(url.searchParams.get('current_amount'),'eq.'+g.current_amount);assert.equal(url.searchParams.get('status'),'eq.active');}
   Object.assign(g,body);
  }
  const statusFilter=url.searchParams.get('status');const visible=req.method()==='GET'?goalRows.filter(g=>!statusFilter||statusFilter===('eq.'+g.status)||statusFilter.startsWith('in.')&&statusFilter.slice(4,-1).split(',').includes(g.status)):goalRows;value=req.headers().accept?.includes('vnd.pgrst.object')?goalRows.find(g=>g.id===goalId):visible;
 }
 else if(path.endsWith('/heda-notify'))value={ok:true,configured:false};
 else if(path.endsWith('/heda_alert_preferences'))value={ethereum:false};
 await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(value)});
 });
 async function navigate(name){const menu=page.getByRole('button',{name:'Abrir navegación principal',exact:true});if(process.env.HEDA_QA_LARGE)await menu.waitFor();if(await menu.count())await menu.click();await page.getByRole('tab',{name,exact:true}).click();}
 async function typeInto(field,text){await field.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(text);assert.equal(await field.inputValue(),text);}
 await page.goto('http://127.0.0.1:4173');await navigate('Movimientos');await page.getByRole('tab',{name:'Recurrentes',exact:true}).click();
 for(const [label,message] of [['Confirmar pago','Gasto registrado'],['Confirmar cobro','Ingreso registrado'],['Confirmar cargo','Cargo registrado en la tarjeta']]){await page.getByRole('button',{name:new RegExp('^'+label)}).click();await page.getByText(new RegExp('^'+message)).waitFor();}
 assert.equal(rows.length,3);assert.equal(rows.find(r=>r.description==='Netflix').card_id,'77777777-7777-4777-8777-777777777777');assert.equal(writes.filter(w=>w.path.endsWith('/heda_confirm_recurring')).length,3);console.log('Payment, income and credit charge confirmed with exact RPC contract.');
 await navigate('Reportes');const bar=page.getByRole('progressbar',{name:'Avance de Ahorro de prueba',exact:true});await bar.waitFor();assert.equal(await bar.getAttribute('aria-valuenow'),'25');
 await page.getByText('Agregar ahorro',{exact:true}).click();await typeInto(page.getByPlaceholder('500',{exact:true}),'250');await page.getByText('Registrar ahorro',{exact:true}).click();await page.getByText('Ahorro registrado',{exact:true}).waitFor();await page.getByRole('button',{name:'Entendido',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="Avance de Ahorro de prueba"]')?.getAttribute('aria-valuenow')==='50');
 await page.waitForTimeout(450);const ratio=await bar.evaluate(n=>n.firstElementChild.getBoundingClientRect().width/n.getBoundingClientRect().width);assert.ok(Math.abs(ratio-.5)<.02);await page.getByText('Conviene ajustar tu plan',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Ideas para la meta Ahorro de prueba',exact:true}).click();await page.getByText('Ajustar fecha de la meta',{exact:true}).click();await page.getByRole('button',{name:'Dejar la meta sin fecha límite',exact:true}).click();await page.getByText('Guardar fecha',{exact:true}).click();await page.getByText('Pon una fecha si quieres planear tu ahorro',{exact:true}).waitFor();assert.equal(goalRows[0].target_date,null);
 await page.getByText('Guardar fecha',{exact:true}).waitFor({state:'hidden'});await bar.locator('..').screenshot({path:'.tmp-goal-plan-50.png'});
 await page.getByText('Agregar ahorro',{exact:true}).click();await typeInto(page.getByPlaceholder('500',{exact:true}),'500');await page.getByText('Registrar ahorro',{exact:true}).click();await page.getByText('¡Meta alcanzada!',{exact:true}).last().waitFor();await page.getByRole('button',{name:'Entendido',exact:true}).click();assert.equal(await bar.getAttribute('aria-valuenow'),'100');await page.getByText('Agregar ahorro',{exact:true}).waitFor({state:'hidden'});await page.reload();await navigate('Reportes');await bar.waitFor();assert.equal(await bar.getAttribute('aria-valuenow'),'100');
 await page.addScriptTag({path:process.env.TEMP+'/heda-accessibility-audit/node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));assert.deepEqual(violations,[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('Goal progress 25→50→100, deadline update, completed goal after reload, no page errors, selected accessibility checks clear.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exit(1);});
