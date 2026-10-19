// Supply the narrow WebCrypto API used by Supabase PKCE; never replace a full implementation.
export function installNativeCrypto(target,native){
  if(!target.crypto)Object.defineProperty(target,'crypto',{value:{},configurable:true,writable:true});
  if(typeof target.crypto.getRandomValues!=='function')target.crypto.getRandomValues=values=>native.getRandomValues(values);
  if(!target.crypto.subtle)Object.defineProperty(target.crypto,'subtle',{value:{},configurable:true});
  if(typeof target.crypto.subtle.digest!=='function')target.crypto.subtle.digest=(algorithm,data)=>{
    const name=typeof algorithm==='string'?algorithm:algorithm?.name;
    if(!['SHA-256','SHA-384','SHA-512'].includes(name))return Promise.reject(new Error('Unsupported secure digest'));
    return native.digest(name,data);
  };
}
