// Serialized, atomic chunk storage for large Supabase sessions. No plaintext fallback.
export function createSecureSessionStorage(secure,legacy,randomId){
  let queue=Promise.resolve();
  const serial=work=>{const next=queue.then(work,work);queue=next.catch(()=>{});return next;};
  const manifestKey=key=>`${key}.secure.v1`;
  const partKey=(key,manifest,index)=>`${key}.part.${manifest.id}.${index}`;
  async function manifest(key){
    const raw=await secure.getItemAsync(manifestKey(key));if(raw===null)return null;
    let data;try{data=JSON.parse(raw);}catch{throw new Error('SECURE_SESSION_INVALID');}
    if(data?.version!==1 || !/^[a-zA-Z0-9-]+$/.test(data.id) || !Number.isInteger(data.count)||data.count<1||data.count>256)throw new Error('SECURE_SESSION_INVALID');
    return data;
  }
  async function eraseParts(key,data){if(data)for(let i=0;i<data.count;i++)await secure.deleteItemAsync(partKey(key,data,i));}
  async function write(key,value){
    const old=await manifest(key),chars=Array.from(value),parts=[];
    for(let i=0;i<chars.length;i+=400)parts.push(chars.slice(i,i+400).join(''));
    if(!parts.length)parts.push('');if(parts.length>256)throw new Error('SECURE_SESSION_TOO_LARGE');
    const next={version:1,id:randomId(),count:parts.length};
    try{
      for(let i=0;i<parts.length;i++)await secure.setItemAsync(partKey(key,next,i),parts[i]);
      await secure.setItemAsync(manifestKey(key),JSON.stringify(next));
    }catch(error){await eraseParts(key,next).catch(()=>{});throw error;}
    // The new generation is durable before deleting the old session or legacy plaintext.
    await legacy.removeItem(key);
    await eraseParts(key,old).catch(()=>{});
  }
  return {
    getItem:key=>serial(async()=>{
      const data=await manifest(key);
      if(data){await legacy.removeItem(key);const parts=[];for(let i=0;i<data.count;i++){const value=await secure.getItemAsync(partKey(key,data,i));if(value===null)throw new Error('SECURE_SESSION_INCOMPLETE');parts.push(value);}return parts.join('');}
      const value=await legacy.getItem(key);if(value!==null)await write(key,value);return value;
    }),
    setItem:(key,value)=>serial(()=>write(key,value)),
    removeItem:key=>serial(async()=>{
      const data=await manifest(key);
      // Remove plaintext first: a failed deletion must never resurrect the old session.
      await legacy.removeItem(key);await secure.deleteItemAsync(manifestKey(key));await eraseParts(key,data);
    }),
  };
}
