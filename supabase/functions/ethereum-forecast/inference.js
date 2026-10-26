// LSTM inference exported from PyTorch; no Gemini, training or user finances here.
const ethMean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const ethStd=values=>{const mean=ethMean(values);return Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/(values.length-1));};
export function ethFeatures(bars){
 const out=[];
 for(let i=29;i<bars.length;i++){
  const row=bars[i],close=row.close,returns=[];
  for(let j=i-6;j<=i;j++)returns.push(bars[j].close/bars[j-1].close-1);
  const ma=n=>ethMean(bars.slice(i-n+1,i+1).map(x=>x.close));
  out.push([Math.log(close),row.open/close-1,row.high/close-1,row.low/close-1,Math.log1p(row.volume),close/bars[i-1].close-1,close/ma(7)-1,close/ma(15)-1,close/ma(30)-1,ethStd(returns)]);
 }
 return out;
}
export function ethLSTM(input,model){
 const size=model.hiddenSize;let h=Array(size).fill(0),c=Array(size).fill(0);
 const sigmoid=x=>1/(1+Math.exp(-Math.max(-50,Math.min(50,x))));
 for(const x of input){
  const gates=model.weightIh.map((row,k)=>row.reduce((sum,w,i)=>sum+w*x[i],model.biasIh[k]+model.biasHh[k])+model.weightHh[k].reduce((sum,w,i)=>sum+w*h[i],0));
  const nextC=c.map((old,j)=>sigmoid(gates[size+j])*old+sigmoid(gates[j])*Math.tanh(gates[2*size+j]));
  h=h.map((_,j)=>sigmoid(gates[3*size+j])*Math.tanh(nextC[j]));c=nextC;
 }
 const logits=model.weightOut.map((row,k)=>row.reduce((sum,w,i)=>sum+w*h[i],model.biasOut[k])),max=Math.max(...logits),exp=logits.map(x=>Math.exp(x-max)),total=exp.reduce((a,b)=>a+b,0);
 return exp.map(x=>x/total);
}
export function validateEthBars(bars){
 if(!Array.isArray(bars)||bars.length<60||bars.length>10000)throw new Error('ETH_INVALID_DATA');
 for(let i=0;i<bars.length;i++){
  const b=bars[i];if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!['open','high','low','close','volume'].every(k=>Number.isFinite(b[k]))||Math.min(b.open,b.high,b.low,b.close)<=0||b.volume<0||b.high<Math.max(b.open,b.low,b.close)||b.low>Math.min(b.open,b.high,b.close))throw new Error('ETH_INVALID_DATA');
  if(i&&Date.parse(b.date)-Date.parse(bars[i-1].date)!==86400000)throw new Error('ETH_MISSING_DAYS');
 }
 return bars;
}
export function parseYahooEth(data,now=new Date()){
 const result=data?.chart?.result?.[0],q=result?.indicators?.quote?.[0];if(!q||result.meta?.currency!=='USD')throw new Error('ETH_PROVIDER_DATA');
 const cutoff=now.toISOString().slice(0,10),seen=new Map();
 for(let i=0;i<(result.timestamp||[]).length;i++){
  const date=new Date(result.timestamp[i]*1000).toISOString().slice(0,10);if(date>=cutoff)continue;
  seen.set(date,{date,open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume[i]});
 }
 const bars=[...seen.values()].sort((a,b)=>a.date.localeCompare(b.date));
 // Yahoo may publish an empty trailing daily slot before the candle is available.
 // Drop only trailing null slots; never bridge internal gaps or invalid candles.
 while(bars.length&&['open','high','low','close','volume'].some(k=>bars.at(-1)[k]==null))bars.pop();
 return validateEthBars(bars);
}
export function forecastEthereum(bundle,input,{now=new Date(),dataMode='provider',warning=null}={}){
 const bars=validateEthBars(input),features=ethFeatures(bars).slice(-bundle.window);if(features.length!==bundle.window)throw new Error('ETH_NOT_ENOUGH_DATA');
 const last=bars.at(-1),forecasts=[1,7].map(horizon=>{
  const model=bundle.models[String(horizon)],normalized=features.map(row=>row.map((v,i)=>(v-model.mean[i])/model.scale[i]));
  const probabilities=ethLSTM(normalized,model),winner=probabilities.indexOf(Math.max(...probabilities));
  return {horizonDays:horizon,targetDate:new Date(Date.parse(last.date)+horizon*86400000).toISOString().slice(0,10),trend:bundle.classes[winner],distribution:Object.fromEntries(bundle.classes.map((label,i)=>[label,probabilities[i]]))};
 });
 const ageDays=Math.floor((Date.parse(now.toISOString().slice(0,10))-Date.parse(last.date))/86400000),snapshot=dataMode!=='provider';
 return {ok:true,ethereumVersion:1,symbol:'ETH-USD',currency:'USD',source:'Yahoo Finance',interval:'1d',timezone:'UTC',generatedAt:now.toISOString(),asOf:last.date,dataMode,stale:snapshot||ageDays>1,warning:warning||(ageDays>1?'Los datos del mercado no están actualizados.':null),lastCandle:last,history:bars.slice(-90),forecasts,model:{name:'LSTM experimental',version:bundle.modelVersion,trainedAt:bundle.trainedAt,datasetEnd:bundle.lastTrainingDatasetDate,datasetStart:bundle.source.firstDate,datasetRows:bundle.source.rows,window:bundle.window,threshold:bundle.threshold,reports:bundle.reports,limitations:['Clasificación experimental de tendencias, no predicción de un precio exacto.','La LSTM no superó a todos los modelos base en esta evaluación.','Los porcentajes son salidas softmax sin calibración: no son probabilidades reales garantizadas.','Una sola partición temporal y una semilla no prueban estabilidad futura.','El mercado puede cambiar y el rendimiento pasado no garantiza resultados futuros.']}};
}
export async function loadYahooEth(fetcher=fetch,now=new Date()){
 const end=Math.floor(now.getTime()/1000),start=end-200*86400;
 const response=await fetcher(`https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?period1=${start}&period2=${end}&interval=1d`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw new Error(response.status===429?'ETH_PROVIDER_LIMIT':'ETH_PROVIDER_UNAVAILABLE');
 return parseYahooEth(await response.json(),now);
}
export function createEthereumService(bundle,fetcher=fetch,clock=()=>new Date()){
 let cached=null,expires=0,pending=null;
 return async function getForecast(){
  const now=clock();if(cached&&now.getTime()<expires)return cached;if(pending)return pending;
  pending=(async()=>{let bars,mode='provider',warning=null;
   try{bars=await loadYahooEth(fetcher,now);}catch{bars=bundle.referenceBars;mode='training_snapshot';warning='No se pudo actualizar Yahoo Finance. Se muestra una estimación histórica con datos reales del entrenamiento, no una predicción actual.';}
   cached=forecastEthereum(bundle,bars,{now,dataMode:mode,warning});expires=now.getTime()+(mode==='provider'?3600000:300000);return cached;
  })();try{return await pending;}finally{pending=null;}
 };
}
