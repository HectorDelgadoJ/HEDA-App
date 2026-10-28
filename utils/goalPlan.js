const DAY=86400000;
function dayNumber(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split('-').map(Number),stamp=Date.UTC(y,m-1,d),date=new Date(stamp);
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?stamp/DAY:null;
}
function createdDay(value){
 if(typeof value!=='string')return null;
 if(value.length===10)return dayNumber(value);
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
 return dayNumber(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
}
const cents=value=>Math.round(Number(value)*100);
const roundedUp=value=>Math.ceil(value)/100;
export function goalPlan(goal,today){
 const now=dayNumber(today),target=cents(goal.target_amount),saved=cents(goal.current_amount);
 if(now===null||!Number.isSafeInteger(target)||target<=0||!Number.isSafeInteger(saved)||saved<0)return {status:'unavailable',percent:0};
 const left=Math.max(0,target-saved),deadline=dayNumber(goal.target_date),created=createdDay(goal.created_at);
 const elapsed=created===null?0:Math.max(0,now-created),daysLeft=deadline===null?null:deadline-now;
 const rate=elapsed>=7&&saved>0?saved/elapsed:null;
 const projected=rate!==null&&daysLeft!==null&&daysLeft>=0?saved+rate*daysLeft:null;
 const daysNeeded=rate===null?null:Math.ceil(left/rate);
 const finish=daysNeeded!==null&&daysNeeded<=36500?new Date((now+daysNeeded)*DAY).toISOString().slice(0,10):null;
 const status=left===0?'complete':deadline===null?'noDate':daysLeft<0?'overdue':daysLeft===0?'today':rate===null?'insufficient':projected>=target?'onTrack':'behind';
 return {status,percent:Math.min(100,saved/target*100),saved:saved/100,target:target/100,remaining:left/100,daysLeft,elapsedDays:elapsed,
  dailyRequired:daysLeft!==null&&daysLeft>=0?roundedUp(left/Math.max(1,daysLeft)):null,
  weeklyRequired:daysLeft!==null&&daysLeft>=0?roundedUp(Math.min(left,left*Math.min(7,Math.max(1,daysLeft))/Math.max(1,daysLeft))):null,
  projectedAmount:projected===null?null:Math.round(projected)/100,estimatedDate:finish,weeklyAverage:rate===null?null:Math.round(rate*7)/100};
}
export function validateGoalDate(value,today){return value===''||value===null?'':dayNumber(value)===null?'Elige una fecha válida.':dayNumber(value)<dayNumber(today)?'Elige hoy o una fecha posterior.':'';}
export function contributionPatch(goal,value){
 const text=String(value??'').trim().replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(text)||Number(text)<=0)throw new Error('Escribe una cantidad mayor a cero, con hasta dos decimales.');
 const total=cents(goal.current_amount)+cents(text);
 if(!Number.isSafeInteger(total)||total>99999999999999)throw new Error('La cantidad supera el máximo permitido para una meta.');
 return {current_amount:total/100,status:total>=cents(goal.target_amount)?'completed':'active'};
}
