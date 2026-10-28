"""Predeclared window-only LSTM study using the production architecture/features.
Same origin dates for 14/30/60 days; three seeds and expanding temporal folds.
Original historical test is already inspected: all conclusions are exploratory.
No published model or CSV is changed by this experiment.
"""
import copy,hashlib,json,random,time
from datetime import datetime,timezone
import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from pipeline import ROOT,REPO,FEATURES,features,validate_frame,targets,metrics,write_json

PROTOCOL={'windows':[14,30,60],'seeds':[42,17,73],'horizons':[1,7],'outerFolds':3,'hiddenSize':32,'epochs':45,'patience':8,'learningRate':.001,'weightDecay':.0001,'batchSize':128,'testFraction':.15,'innerValidationFraction':.15,'minimumMeanF1Gain':.01,'minimumWinningFolds':2,'minimumWinningSeeds':2,'regimeLookback':30,'regimeThreshold':.05,'selection':'Mean outer-validation macro F1 over all folds and seeds; never select a seed using test. Window 30 is the fixed control.','deployment':'Never automatically replace production; prospective evaluation required.'}

class WindowLSTM(nn.Module):
 def __init__(self):
  super().__init__();self.lstm=nn.LSTM(len(FEATURES),PROTOCOL['hiddenSize'],batch_first=True);self.head=nn.Linear(PROTOCOL['hiddenSize'],3)
 def forward(self,x):return self.head(self.lstm(x)[0][:,-1])

def inner_split(train_ids,horizon):
 boundary=int(len(train_ids)*(1-PROTOCOL['innerValidationFraction']));inner=train_ids[boundary:];train=train_ids[:boundary];train=train[train+horizon<inner[0]]
 if len(train)<20 or len(inner)<10:raise ValueError('Insufficient inner samples')
 return train,inner

def regime_labels(close,lookback=30,threshold=.05):
 labels=np.full(len(close),'unavailable',dtype=object);ret=close[lookback:]/close[:-lookback]-1
 labels[lookback:]=np.where(ret>threshold,'alcista',np.where(ret< -threshold,'bajista','lateral'));return labels

def grouped_metrics(y,pred,groups):
 return {str(group):metrics(y[groups==group],pred[groups==group]) for group in np.unique(groups) if np.any(groups==group)}

def fit_window(raw,y,train_ids,eval_ids,window,seed,horizon):
 if train_ids[-1]+horizon>=eval_ids[0]:raise ValueError('Outer target crosses validation boundary')
 train,inner=inner_split(train_ids,horizon)
 random.seed(seed);np.random.seed(seed);torch.manual_seed(seed)
 scaler=StandardScaler().fit(raw[:train[-1]+1]);scaled=scaler.transform(raw).astype(np.float32)
 def seq(ids):return torch.from_numpy(np.stack([scaled[i-window+1:i+1] for i in ids]))
 x=seq(train);x_inner=seq(inner);x_eval=seq(eval_ids);labels=torch.from_numpy(y[train]);counts=np.bincount(y[train],minlength=3)
 model=WindowLSTM();optimizer=torch.optim.Adam(model.parameters(),lr=PROTOCOL['learningRate'],weight_decay=PROTOCOL['weightDecay']);loss_fn=nn.CrossEntropyLoss(weight=torch.tensor((len(train)/(3*np.maximum(counts,1))).astype(np.float32)))
 best=-1;state=None;wait=0;best_epoch=0
 for epoch in range(PROTOCOL['epochs']):
  model.train();order=torch.randperm(len(train))
  for start in range(0,len(order),PROTOCOL['batchSize']):
   ids=order[start:start+PROTOCOL['batchSize']];optimizer.zero_grad();loss=loss_fn(model(x[ids]),labels[ids]);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),1);optimizer.step()
  model.eval()
  with torch.no_grad():score=metrics(y[inner],model(x_inner).argmax(1).numpy())['macroF1']
  if score>best+1e-5:best=score;state=copy.deepcopy(model.state_dict());wait=0;best_epoch=epoch+1
  else:wait+=1
  if wait>=PROTOCOL['patience']:break
 model.load_state_dict(state);model.eval()
 with torch.no_grad():probs=torch.softmax(model(x_eval),dim=1).numpy()
 artifact={'window':window,'seed':seed,'state':state,'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'bestEpoch':best_epoch}
 trace={'bestEpoch':best_epoch,'epochsRun':epoch+1,'scalerLastIndex':int(train[-1]),'innerTrainLastOrigin':int(train[-1]),'innerTrainLastTarget':int(train[-1]+horizon),'innerValidationFirstOrigin':int(inner[0]),'outerTrainLastTarget':int(train_ids[-1]+horizon),'outerEvaluationFirstOrigin':int(eval_ids[0])}
 return probs,artifact,trace

def reference_predictions(raw,close,y,train_ids,eval_ids,horizon):
 train,_=inner_split(train_ids,horizon);scaler=StandardScaler().fit(raw[:train[-1]+1]);x=scaler.transform(raw)
 flat=lambda ids:np.stack([x[i-29:i+1].reshape(-1) for i in ids])
 out={};a,b=flat(train),flat(eval_ids)
 for name,model in [('LogisticRegression',LogisticRegression(C=.1,class_weight='balanced',max_iter=1500,random_state=42)),('RandomForest',RandomForestClassifier(n_estimators=160,max_depth=8,min_samples_leaf=10,class_weight='balanced',random_state=42,n_jobs=2))]:
  model.fit(a,y[train]);out[name]=model.predict(b)
 majority=int(np.bincount(y[train],minlength=3).argmax());out['Majority']=np.full(len(eval_ids),majority)
 past=close[eval_ids]/close[eval_ids-horizon]-1;out['Persistence']=np.where(past>.01,2,np.where(past< -.01,0,1));return out

def select_window(runs):
 means={w:float(np.mean([row['macroF1'] for row in rows])) for w,rows in runs.items()};best=max(means,key=means.get);base=runs['30'];candidate=runs[best]
 differences=[c['macroF1']-b['macroF1'] for c,b in zip(candidate,base)]
 fold_gains={str(f):float(np.mean([d for d,row in zip(differences,candidate) if row['fold']==f])) for f in range(3)}
 seed_gains={str(seed):float(np.mean([d for d,row in zip(differences,candidate) if row['seed']==seed])) for seed in PROTOCOL['seeds']}
 supported=best!='30' and means[best]-means['30']>=.01 and sum(v>0 for v in fold_gains.values())>=2 and sum(v>0 for v in seed_gains.values())>=2
 return {'selectedWindow':int(best) if supported else 30,'bestMeanWindow':int(best),'validationMeanMacroF1':means,'meanGainVs30':means[best]-means['30'],'foldGainsVs30':fold_gains,'seedGainsVs30':seed_gains,'historicalValidationGatePassed':bool(supported)}

def main():
 start=time.monotonic();torch.set_num_threads(2);torch.use_deterministic_algorithms(True)
 path=ROOT/'data/eth_usd_daily.csv';frame=validate_frame(pd.read_csv(path));raw,aligned=features(frame);close=aligned.Close.to_numpy();dates=aligned.Date.to_numpy();regimes=regime_labels(close);cut=int(len(raw)*.85)
 production=REPO/'supabase/functions/ethereum-forecast/models.json';production_hash=hashlib.sha256(production.read_bytes()).hexdigest()
 report={'experiment':'Window-only production-equivalent LSTM; 14/30/60 days, three seeds','startedAt':datetime.now(timezone.utc).isoformat(),'protocol':PROTOCOL,'dataSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'productionSha256Before':production_hash,'datasetStart':dates[0],'datasetEnd':dates[-1],'featureNames':FEATURES,'reports':{},'limitations':['Historical test was already inspected; this is exploratory research, not a new blind holdout.','Comparisons concern retrained models with identical procedure; they are not retrospective scores of the published frozen weights.','Market regimes use the past 30-day return at issue time; regime scores with small samples are unstable.','Hyperparameter search increases overfitting risk; no automatic production promotion.','No sentiment/news is included; those observations are being collected separately.']}
 report_path=ROOT/'reports/window_study.json';write_json(ROOT/'reports/window_study_protocol.json',{'declaredBeforeRun':report['startedAt'],'protocol':PROTOCOL,'dataSha256':report['dataSha256'],'productionSha256':production_hash})
 for horizon in PROTOCOL['horizons']:
  y=targets(close,horizon);origins=np.arange(max(PROTOCOL['windows'])-1,cut-horizon);splits=list(TimeSeriesSplit(n_splits=3,gap=horizon).split(origins));runs={str(w):[] for w in PROTOCOL['windows']};oof={str(w):{seed:[] for seed in PROTOCOL['seeds']} for w in PROTOCOL['windows']};oof_ids=[];baselines={}
  for fold,(tr,va) in enumerate(splits):
   train_ids=origins[tr];eval_ids=origins[va];oof_ids.extend(eval_ids.tolist())
   for name,pred in reference_predictions(raw,close,y,train_ids,eval_ids,horizon).items():baselines.setdefault(name,[]).extend(pred.tolist())
   for window in PROTOCOL['windows']:
    for seed in PROTOCOL['seeds']:
     probs,_,trace=fit_window(raw,y,train_ids,eval_ids,window,seed,horizon);score=metrics(y[eval_ids],probs.argmax(1));oof[str(window)][seed].extend(probs.tolist())
     row={'fold':fold,'seed':seed,**score,'trace':trace,'trainTargetEnd':dates[int(train_ids[-1]+horizon)],'validationStart':dates[int(eval_ids[0])],'validationEnd':dates[int(eval_ids[-1])]};runs[str(window)].append(row)
     print(json.dumps({'horizon':horizon,'fold':fold+1,'window':window,'seed':seed,'macroF1':score['macroF1'],'elapsedSeconds':round(time.monotonic()-start)}),flush=True)
  selection=select_window(runs);ids=np.array(oof_ids);ensemble={w:np.mean([oof[w][seed] for seed in PROTOCOL['seeds']],axis=0).argmax(1) for w in runs};validation={w:{'aggregate':metrics(y[ids],pred),'byRegime':grouped_metrics(y[ids],pred,regimes[ids]),'byYear':grouped_metrics(y[ids],pred,np.array([d[:4] for d in dates[ids]]))} for w,pred in ensemble.items()}
  references={name:metrics(y[ids],np.array(pred)) for name,pred in baselines.items()};final_ids=np.arange(cut,len(raw)-horizon);final={}
  for window in sorted({30,selection['selectedWindow']}):
   probs=[];artifacts=[]
   for seed in PROTOCOL['seeds']:
    p,artifact,trace=fit_window(raw,y,origins,final_ids,window,seed,horizon);probs.append(p);artifacts.append(artifact)
   pred=np.mean(probs,axis=0).argmax(1);checkpoint=ROOT/f'checkpoints/window_study_{horizon}d_{window}.pt';checkpoint.parent.mkdir(exist_ok=True);torch.save({'protocol':PROTOCOL,'horizon':horizon,'artifacts':artifacts},checkpoint)
   final[str(window)]={'aggregate':metrics(y[final_ids],pred),'byRegime':grouped_metrics(y[final_ids],pred,regimes[final_ids]),'byYear':grouped_metrics(y[final_ids],pred,np.array([d[:4] for d in dates[final_ids]])),'checkpointSha256':hashlib.sha256(checkpoint.read_bytes()).hexdigest()}
  final_references={name:metrics(y[final_ids],pred) for name,pred in reference_predictions(raw,close,y,origins,final_ids,horizon).items()}
  report['reports'][str(horizon)]={'selection':selection,'individualRuns':runs,'validationEnsembles':validation,'validationReferences':references,'exploratoryTest':final,'testReferences':final_references,'testStart':dates[cut],'testEnd':dates[int(final_ids[-1])],'testSamples':len(final_ids),'productionChanged':False};write_json(report_path,report)
  print(json.dumps({'horizonCompleted':horizon,'selection':selection,'testF1':{w:m['aggregate']['macroF1'] for w,m in final.items()}}),flush=True)
 report['productionSha256After']=hashlib.sha256(production.read_bytes()).hexdigest()
 if report['productionSha256After']!=production_hash:raise RuntimeError('Production artifact changed during experiment')
 report['completedAt']=datetime.now(timezone.utc).isoformat();report['elapsedSeconds']=round(time.monotonic()-start);write_json(report_path,report)
 render_summary(report)

def render_summary(report):
 lines=['# Comparación de ventanas Ethereum — 27/10/2026','','Estudio exploratorio; no modifica el modelo publicado. La prueba histórica ya había sido observada.','','| Horizonte | Ventana elegida por validación | F1 validación (semillas/periodos) | F1 prueba del ensamble | F1 prueba control 30 días |','| --- | --- | --- | --- | --- |']
 for h,row in report['reports'].items():
  selection=row['selection'];w=str(selection['selectedWindow']);lines.append(f"| {h} días | {w} | {selection['validationMeanMacroF1'][w]:.4f} | {row['exploratoryTest'][w]['aggregate']['macroF1']:.4f} | {row['exploratoryTest']['30']['aggregate']['macroF1']:.4f} |")
 lines+=['','Regímenes definidos con el rendimiento de los 30 días ANTERIORES al origen: alcista >5%, bajista <-5%, lateral en otro caso. No se usan rendimientos futuros para clasificarlos.','','Se comparan los mismos orígenes de pronóstico, tres semillas (42/17/73), tres ventanas (14/30/60) y tres particiones cronológicas por horizonte. El escalador y el early stopping solo usan el entrenamiento interno. Cada frontera excluye objetivos que alcanzan el periodo siguiente.','','El ganador es una ventana, no la semilla con mejor prueba. Para superar al control se exige ganancia media de F1 >=0.01 y mejoras en al menos dos particiones y dos semillas. La evaluación del ensamble promedia las probabilidades de las tres semillas; no se interpreta como confianza calibrada.','','Las referencias Majority, Persistence, LogisticRegression y RandomForest usan los mismos periodos; la exactitud no sustituye al F1 macro ni a métricas por clase. Las puntuaciones de regímenes pequeños se deben leer junto con su número de muestras.','','No se cambian pesos de producción automáticamente, aunque un candidato supere las reglas históricas. Se requiere evaluación prospectiva independiente. JSON completo: window_study.json. Protocolo fijado antes de ejecutar: window_study_protocol.json. Pesos de candidatos: checkpoints locales, ignorados por Git.']
 for h,row in report['reports'].items():
  w=str(row['selection']['selectedWindow']);lines+=['',f'## Regímenes en prueba exploratoria, {h} días (ventana {w})','','| Régimen | Muestras | F1 macro | Exactitud |','| --- | --- | --- | --- |']
  for regime,score in row['exploratoryTest'][w]['byRegime'].items():lines.append(f"| {regime} | {score['samples']} | {score['macroF1']:.4f} | {score['accuracy']:.1%} |")
 (ROOT/'reports/window_study_summary.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
if __name__=='__main__':main()
