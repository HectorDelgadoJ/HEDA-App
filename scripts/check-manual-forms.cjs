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
 const user = { id, email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { heda_experience: { version: 1, configured: true, welcomeDone: true, tourDone: true, mode: 'complete', theme: process.env.HEDA_QA_DARK ? 'dark' : 'light', accessibility: process.env.HEDA_QA_LARGE ? {textScale: 2, reduceMotion: true} : {} } } };
 const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'test'].join('.');
 await page.addInitScript(({user,token}) => localStorage.setItem('sb-ixzqwihpdvwnmawztret-auth-token', JSON.stringify({access_token:token,refresh_token:'test-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})), {user,token});
 await page.route('https://*.supabase.co/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname, body = req.postData() ? JSON.parse(req.postData()) : null;
  if (!['GET','OPTIONS'].includes(req.method())) writes.push({path,body});
  let value = [];
  if (path === '/auth/v1/user') value = user;
  else if (path.endsWith('/profiles')) value = {id,full_name:'Prueba',username:'prueba',birth_date:'2000-01-01',movement_mode:'simple'};
  else if (path.endsWith('/heda_account_active')) value = true;
  else if (path.endsWith('/heda_is_admin')) value = false;
  else if (path.endsWith('/goals')) value = [{id:entity,user_id:id,name:'Laptop',target_amount:10000,current_amount:0,status:'active',created_at:'2026-10-01T00:00:00Z'}];
  else if (path.endsWith('/transactions')) value = [{id:entity,user_id:id,type:'expense',amount:100,category:'Comida',description:'Movimiento prueba',transaction_date:'2026-10-26',created_at:'2026-10-26T12:00:00Z'}];
  else if (path.endsWith('/heda-notify')) value = {ok:true,configured:false};
  else if (path.endsWith('/heda_alert_preferences')) value = {ethereum:false};
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(value)});
 });
async function navigate(name){const menu=page.getByRole('button',{name:'Abrir navegación principal',exact:true});if(process.env.HEDA_QA_LARGE)await menu.waitFor();if(await menu.count())await menu.click();await page.getByRole('tab',{name,exact:true}).click();}
async function typeInto(field,text){await field.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(text);assert.equal(await field.inputValue(),text,'El campo debe conservar el foco y aceptar escritura');}
await page.goto('http://127.0.0.1:4173');
await navigate('Reportes');
await page.getByText('Nueva meta',{exact:true}).first().click();
await typeInto(page.getByPlaceholder('Ej. Laptop nueva'),'Meta teclado');
await typeInto(page.getByPlaceholder('10000',{exact:true}),'750');
await page.getByText('Crear meta',{exact:true}).click();
await page.getByText('Meta creada',{exact:true}).waitFor();await page.getByRole('button',{name:'Entendido',exact:true}).click();
console.log('CREATE GOAL OK');

await page.getByText('Agregar ahorro',{exact:true}).click();
await typeInto(page.getByPlaceholder('500',{exact:true}),'125');
await page.getByText('Registrar ahorro',{exact:true}).click();
await page.getByRole('button',{name:'Entendido',exact:true}).click();
assert(writes.some(w=>w.path.endsWith('/goals')&&w.body.current_amount===125));console.log('SAVINGS OK');
await navigate('Movimientos');
await page.getByRole('tab',{name:'Historial',exact:true}).click();
await page.getByText('Movimiento prueba',{exact:true}).click();
await typeInto(page.getByPlaceholder('0.00',{exact:true}),'150');
console.log('EDIT MOVEMENT INPUT OK');

await page.keyboard.press('Escape');
await page.getByRole('tab',{name:'Recurrentes',exact:true}).click();
await page.getByText('Crear pago o ingreso recurrente',{exact:true}).click();
await typeInto(page.getByRole('textbox',{name:'Nombre del recurrente',exact:true}),'Renta teclado');
await typeInto(page.getByRole('textbox',{name:'Monto del recurrente',exact:true}),'500');
await typeInto(page.getByRole('textbox',{name:'Nota del recurrente',exact:true}),'Nota editable');
await page.getByText('Guardar recurrente',{exact:true}).click();
assert(writes.some(w=>w.path.endsWith('/recurring_movements')&&w.body.name==='Renta teclado'));console.log('RECURRING OK');
assert.deepEqual(errors,[]);console.log('NO PAGE ERRORS');} finally { await browser.close(); }
})().catch(e=>{console.error(e.stack);process.exit(1);});

