// Saved chats contain completed text only, never permissions or executable proposals.
export const savedChatsKey = owner => `heda:chats:v1:${owner}`;
export function cleanSavedMessages(messages) {
 if (!Array.isArray(messages)) return [];
 const result=[];
 for(let i=0;i<messages.length-1;i++){
  const a=messages[i],b=messages[i+1];
  if(a?.role!=='user'||b?.role!=='assistant'||a.status!=='complete'||b.status!=='complete'||typeof a.text!=='string'||typeof b.text!=='string'||a.text.length>2000||b.text.length>12000)continue;
  for(const [j,m] of [a,b].entries())result.push({id:`saved-${i}-${j}`,role:m.role,status:'complete',text:m.text,sources:[],proposals:[],webEnabled:false});
  i++;
 }
 return result.slice(-40);
}
export function readSavedChats(raw,owner){
 if(typeof raw!=='string'||raw.length>650000)return [];
 try{const data=JSON.parse(raw);if(data?.version!==1||data.owner!==owner||!Array.isArray(data.chats))return [];
 return data.chats.slice(0,2).filter(c=>typeof c?.id==='string'&&typeof c.title==='string').map(c=>({id:c.id,title:c.title.slice(0,65),messages:cleanSavedMessages(c.messages)})).filter(c=>c.messages.length);
 }catch{return [];}
}
export function saveChatSlot(chats,messages,id){
 const clean=cleanSavedMessages(messages);if(!clean.length)throw new Error('Espera a recibir una respuesta antes de guardar el chat.');
 if(!chats.some(c=>c.id===id)&&chats.length>=2)throw new Error('Ya guardaste dos chats. Borra uno para guardar otro.');
 const chat={id,title:clean[0].text.slice(0,65),messages:clean};
 return [...chats.filter(c=>c.id!==id),chat];
}
