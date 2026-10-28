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
  if (path === '/auth/v1/user') {if(body?.data)user.user_metadata={...user.user_metadata,...body.data};value = user;}
  else if (path.endsWith('/profiles')) value = {id,full_name:'Prueba',username:'prueba',birth_date:'2000-01-01',movement_mode:'simple'};
  else if (path.endsWith('/heda_account_active')) value = true;
  else if (path.endsWith('/heda_is_admin')) value = false;
  else if (path.endsWith('/goals')) value = [{id:entity,user_id:id,name:'Laptop',target_amount:10000,current_amount:0,status:'active',created_at:'2026-10-01T00:00:00Z'}];
  else if (path.endsWith('/transactions')) value = [{id:entity,user_id:id,type:'expense',amount:100,category:'Comida',description:'Movimiento prueba',transaction_date:'2026-10-26',created_at:'2026-10-26T12:00:00Z'}];
  else if (path.endsWith('/heda-notify')) value = {ok:true,configured:false};
  else if (path.endsWith('/heda_alert_preferences')) value = {ethereum:false};
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(value)});
 });

async function home(){await page.getByRole('tab',{name:'Inicio',exact:true}).click();}
async function priority(label){await page.getByRole('button',{name:'Cambiar mi prioridad',exact:true}).click();await page.getByRole('radio',{name:new RegExp(label)}).click();await page.getByRole('button',{name:'Guardar preferencias',exact:true}).click();}
await page.goto('http://127.0.0.1:4173');await page.getByText('Tu prioridad: controlar gastos',{exact:true}).waitFor();
await priority('Ahorrar para una meta');await page.getByText('Tu prioridad: ahorrar',{exact:true}).waitFor();
await page.getByRole('button',{name:'Agregar ahorro a mi meta',exact:true}).click();await page.getByPlaceholder('500',{exact:true}).click();await page.keyboard.type('30');assert.equal(await page.getByPlaceholder('500',{exact:true}).inputValue(),'30');
await page.keyboard.press('Escape');await home();
await priority('Recordar mis pagos');await page.getByRole('button',{name:'Crear un pago recurrente',exact:true}).click();await page.getByRole('textbox',{name:'Nombre del recurrente',exact:true}).waitFor();
await page.getByRole('button',{name:'Cerrar formulario',exact:true}).click();
const help=page.getByRole('button',{name:'Entendido: ¿Qué es un recurrente?',exact:true});await help.click();
await page.reload();await page.getByRole('tab',{name:'Movimientos',exact:true}).click();await page.getByRole('tab',{name:'Recurrentes',exact:true}).click();assert.equal(await help.count(),0);
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('heda:first-use:v1:11111111-1111-4111-8111-111111111111')));assert.deepEqual(saved,{recurring:true});
await home();await priority('Controlar mis gastos');await page.getByRole('button',{name:'Revisar mis presupuestos',exact:true}).click();await page.getByText('Tu plan de gasto',{exact:true}).waitFor();
await page.getByRole('tab',{name:'Perfil',exact:true}).click();await page.getByText('Volver a mostrar explicaciones',{exact:true}).click();await page.getByRole('button',{name:'Entendido',exact:true}).click();
await page.getByRole('tab',{name:'Movimientos',exact:true}).click();await page.getByRole('tab',{name:'Recurrentes',exact:true}).click();await help.waitFor();
await page.screenshot({path:'.tmp-usability-recurring.png'});
await home();await page.getByText('Tu prioridad: controlar gastos',{exact:true}).waitFor();await page.addScriptTag({path:process.env.TEMP+'/heda-accessibility-audit/node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));assert.deepEqual(violations,[]);
await page.screenshot({path:'.tmp-usability-home.png'});
await priority('Ahorrar para una meta');await page.getByRole('tab',{name:'Perfil',exact:true}).click();await page.getByText('Ver visita guiada',{exact:true}).click();await page.getByText('Paso 1 de 6',{exact:true}).waitFor();await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.getByText('Paso 2 de 6',{exact:true}).waitFor();await page.getByRole('button',{name:'Probar: crear una meta',exact:true}).click();await page.getByPlaceholder('Ej. Laptop nueva').click();await page.keyboard.type('Meta guiada');assert.equal(await page.getByPlaceholder('Ej. Laptop nueva').inputValue(),'Meta guiada');await page.screenshot({path:'.tmp-usability-guided-goal.png'});
assert.equal(writes.filter(w=>['/goals','/transactions','/recurring_movements'].some(end=>w.path.endsWith(end))).length,0);assert.deepEqual(errors,[]);console.log('Priorities open the right forms; helps persist and reset; no financial writes or page errors; selected accessibility checks clear.');
} finally { await browser.close(); }
})().catch(e=>{console.error(e.stack);process.exit(1);});

