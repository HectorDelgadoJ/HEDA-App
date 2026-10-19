export function createAlertQueue(){
 let items=[],listener=null,nextId=0;
 const emit=()=>listener?.(items[0]||null);
 const api={
  show(title,message='',buttons,options={}){items.push({id:++nextId,title:String(title||''),message:String(message||''),buttons:Array.isArray(buttons)&&buttons.length?buttons:[{text:'Entendido'}],options});emit();},
  subscribe(callback){listener=callback;emit();return()=>{if(listener===callback){listener=null;items=[];}};},
  choose(id,index){const item=items[0],button=item?.buttons[index];if(item?.id!==id||!button)return;items.shift();emit();try{Promise.resolve(button.onPress?.()).catch(()=>api.show('No se completó la operación','Vuelve a intentarlo.'));}catch{api.show('No se completó la operación','Vuelve a intentarlo.');}},
  dismiss(id){const item=items[0];if(item?.id!==id||item.options.cancelable===false)return;const cancel=item.buttons.findIndex(button=>button.style==='cancel');if(cancel>=0)api.choose(id,cancel);else{items.shift();emit();}item.options.onDismiss?.();}
 };return api;
}
export const webAlerts=createAlertQueue();
