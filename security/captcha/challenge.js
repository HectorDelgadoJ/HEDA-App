const params=new URLSearchParams(location.search),nonce=params.get('nonce')||'',sitekey=params.get('sitekey')||'';
function send(token='',error=false){
 const data={type:'heda-captcha',nonce,token,error};
 if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));
 else if(window.parent!==window && document.referrer){try{window.parent.postMessage(data,new URL(document.referrer).origin);}catch{}}
}
window.hedaReady=()=>{
 if(!sitekey || !/^[a-zA-Z0-9_-]{10,100}$/.test(sitekey)||!/^[a-zA-Z0-9-]{10,100}$/.test(nonce)){document.querySelector('#status').textContent='Configuración incompleta.';send('',true);return;}
 window.turnstile.render('#challenge',{sitekey,theme:'auto',size:'compact',callback:token=>send(token),'expired-callback':()=>send(''),'error-callback':()=>{send('',true);return true;}});
};
