import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const load=async p=>import('data:text/javascript;base64,'+Buffer.from(read(p)).toString('base64'));
const {installPlatform,installInstructions}=await load('../utils/webInstall.js');
const {createAlertQueue}=await load('../utils/alertQueue.js');
test('install guidance detects iPhone, iPad desktop UA, Android and installed standalone apps',()=>{
 assert.equal(installPlatform({userAgent:'iPhone Safari'}),'ios');assert.equal(installPlatform({platform:'MacIntel',maxTouchPoints:5}),'ios');
 assert.equal(installPlatform({platform:'MacIntel',maxTouchPoints:0}),'desktop');assert.equal(installPlatform({userAgent:'Android Chrome'}),'android');
 assert.equal(installPlatform({userAgent:'iPhone',standalone:true}),'installed');assert.equal(installPlatform({displayStandalone:true}),'installed');
 assert.ok(installInstructions('ios').some(x=>x.includes('Safari')));assert.ok(installInstructions('android').some(x=>x.includes('tres puntos')));
});
test('web confirmations never run destructive actions until that exact button is selected',()=>{
 const queue=createAlertQueue();let current,deleted=0,cancelled=0;queue.subscribe(value=>current=value);
 queue.show('Eliminar','Irreversible',[{text:'Cancelar',style:'cancel',onPress:()=>cancelled++},{text:'Eliminar',style:'destructive',onPress:()=>deleted++}]);
 const first=current.id;assert.equal(deleted,0);queue.dismiss(first);assert.equal(cancelled,1);assert.equal(deleted,0);assert.equal(current,null);
 queue.show('Eliminar','Irreversible',[{text:'Eliminar',onPress:()=>deleted++}]);queue.choose(first,0);assert.equal(deleted,0);queue.choose(current.id,0);assert.equal(deleted,1);
});
test('dialog queue preserves multiple options and unmount clears pending callbacks',()=>{
 const queue=createAlertQueue();let current,called=0;const unsubscribe=queue.subscribe(value=>current=value);
 queue.show('A','',[{text:'One'},{text:'Two'},{text:'Three',onPress:()=>called++}],{cancelable:false});const id=current.id;
 queue.show('B');queue.dismiss(id);assert.equal(current.id,id);queue.choose(id,2);assert.equal(called,1);assert.equal(current.title,'B');unsubscribe();queue.subscribe(value=>current=value);assert.equal(current,null);
});
test('web install metadata and hosting output share the intended root and actual icon sizes',()=>{
 const manifest=JSON.parse(read('../public/manifest.webmanifest'));assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const bytes=readFileSync(new URL('../public'+icon.src,import.meta.url)),size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
 const apple=readFileSync(new URL('../public/icons/apple-touch-icon.png',import.meta.url));assert.equal(apple.readUInt32BE(16),180);
 const html=read('../public/index.html');assert.ok(html.includes('viewport-fit=cover'));assert.ok(html.includes('rel="manifest"'));assert.ok(html.includes('apple-touch-icon'));
 assert.ok(read('../public/_redirects').includes('/* /index.html 200'));assert.equal(JSON.parse(read('../vercel.json')).outputDirectory,'dist');
});
