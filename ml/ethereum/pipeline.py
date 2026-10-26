"""HEDA TT: daily ETH-USD, leakage-safe 1/7-day trend classification."""
from __future__ import annotations
import argparse, copy, hashlib, json, random, sys, urllib.request
from datetime import datetime, timezone, date
from pathlib import Path
import numpy as np
import pandas as pd

CLASSES=['bajista','estable','alcista']
FEATURES=['log_close','open_relative','high_relative','low_relative','log_volume','daily_return','ma7_relative','ma15_relative','ma30_relative','volatility7']
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent

def write_json(path,obj):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(obj,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')

def download(as_of):
 end=int(datetime.combine(as_of,datetime.min.time(),tzinfo=timezone.utc).timestamp())
 url=f'https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?period1=1483228800&period2={end}&interval=1d'
 request=urllib.request.Request(url,headers={'User-Agent':'HEDA-Academic-Research/1.0'})
 with urllib.request.urlopen(request,timeout=30) as response: result=json.load(response)['chart']['result'][0]
 quotes=result['indicators']['quote'][0]
 rows=[{'Date':datetime.fromtimestamp(ts,timezone.utc).date().isoformat(),**{key.title():quotes[key][i] for key in ['open','high','low','close','volume']}} for i,ts in enumerate(result['timestamp']) if datetime.fromtimestamp(ts,timezone.utc).date()<as_of]
 frame=validate_frame(pd.DataFrame(rows));path=ROOT/'data/eth_usd_daily.csv';path.parent.mkdir(exist_ok=True);frame.to_csv(path,index=False)
 manifest={'source':'Yahoo Finance','symbol':'ETH-USD','currency':'USD','interval':'1d','timezone':'UTC','asOfExclusive':as_of.isoformat(),'retrievedAt':datetime.now(timezone.utc).isoformat(),'url':url,'firstDate':frame.Date.iloc[0],'lastDate':frame.Date.iloc[-1],'rows':len(frame),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'cleaning':'Sorted by date, duplicate dates removed; only fully closed candles before as-of. Invalid OHLCV and missing days are rejected, never forward-filled.'}
 write_json(ROOT/'data/manifest.json',manifest);print(json.dumps(manifest),flush=True);return path

def validate_frame(frame):
 required=['Date','Open','High','Low','Close','Volume']
 if any(col not in frame for col in required): raise ValueError('CSV must contain Date,Open,High,Low,Close,Volume')
 frame=frame[required].copy();frame.Date=pd.to_datetime(frame.Date,format='%Y-%m-%d',errors='raise').dt.strftime('%Y-%m-%d')
 frame=frame.sort_values('Date').drop_duplicates('Date',keep='last').reset_index(drop=True)
 values=frame[required[1:]].apply(pd.to_numeric,errors='raise');frame[required[1:]]=values
 if not np.isfinite(values.to_numpy()).all() or (values[['Open','High','Low','Close']]<=0).any().any() or (frame.Volume<0).any(): raise ValueError('Invalid/non-finite OHLCV')
 if (frame.High<frame[['Open','Close','Low']].max(axis=1)).any() or (frame.Low>frame[['Open','Close','High']].min(axis=1)).any(): raise ValueError('Inconsistent OHLC candle')
 dates=pd.to_datetime(frame.Date)
 if len(frame)<300 or not dates.diff().dropna().eq(pd.Timedelta(days=1)).all(): raise ValueError('Need >=300 consecutive daily observations; missing dates cannot be treated as adjacent days')
 return frame

def features(frame):
 c=frame.Close.astype(float);returns=c.pct_change()
 result=pd.DataFrame({'log_close':np.log(c),'open_relative':frame.Open/c-1,'high_relative':frame.High/c-1,'low_relative':frame.Low/c-1,'log_volume':np.log1p(frame.Volume),'daily_return':returns,'ma7_relative':c/c.rolling(7).mean()-1,'ma15_relative':c/c.rolling(15).mean()-1,'ma30_relative':c/c.rolling(30).mean()-1,'volatility7':returns.rolling(7).std(ddof=1)})
 valid=result.notna().all(axis=1).to_numpy();return result.loc[valid,FEATURES].to_numpy(dtype=np.float64),frame.loc[valid].reset_index(drop=True)

def targets(close,horizon,threshold=.01):
 result=np.full(len(close),-1,dtype=np.int64)
 future=close[horizon:]/close[:-horizon]-1
 result[:-horizon]=np.where(future>threshold,2,np.where(future < -threshold,0,1))
 return result

def split_samples(n,window,horizon):
 train_end=int(n*.70);valid_end=int(n*.85)
 origins=np.arange(window-1,n-horizon)
 # Purge origins whose labels reach across the next chronological split.
 parts={'train':origins[origins+horizon<train_end],'validation':origins[(origins>=train_end)&(origins+horizon<valid_end)],'test':origins[origins>=valid_end]}
 if any(len(x)<20 for x in parts.values()): raise ValueError('Not enough samples after chronological purge')
 return parts,train_end,valid_end

def metrics(y,pred):
 from sklearn.metrics import accuracy_score,precision_recall_fscore_support,confusion_matrix
 p,r,f,s=precision_recall_fscore_support(y,pred,labels=[0,1,2],zero_division=0)
 return {'accuracy':float(accuracy_score(y,pred)),'macroF1':float(np.mean(f)),'perClass':{label:{'precision':float(p[i]),'recall':float(r[i]),'f1':float(f[i]),'support':int(s[i])} for i,label in enumerate(CLASSES)},'confusionMatrix':confusion_matrix(y,pred,labels=[0,1,2]).tolist(),'samples':int(len(y))}

def train(csv_path,epochs=45,window=30,seed=42):
 import torch
 from torch import nn
 from sklearn.preprocessing import StandardScaler
 from sklearn.linear_model import LogisticRegression
 from sklearn.tree import DecisionTreeClassifier
 from sklearn.ensemble import RandomForestClassifier
 from sklearn.dummy import DummyClassifier
 random.seed(seed);np.random.seed(seed);torch.manual_seed(seed);torch.set_num_threads(2);torch.use_deterministic_algorithms(True)
 frame=validate_frame(pd.read_csv(csv_path));raw,aligned=features(frame)
 all_reports={};models={};parity={}
 class TrendLSTM(nn.Module):
  def __init__(self):
   super().__init__();self.lstm=nn.LSTM(len(FEATURES),32,batch_first=True);self.head=nn.Linear(32,3)
  def forward(self,x): return self.head(self.lstm(x)[0][:,-1,:])
 for horizon in [1,7]:
  print(f'Training horizon {horizon} days',flush=True)
  split,train_end,valid_end=split_samples(len(raw),window,horizon)
  scaler=StandardScaler().fit(raw[:train_end]);scaled=scaler.transform(raw).astype(np.float32)
  y=targets(aligned.Close.to_numpy(),horizon)
  x={key:np.stack([scaled[i-window+1:i+1] for i in ids]) for key,ids in split.items()};ys={key:y[ids] for key,ids in split.items()}
  flat={key:values.reshape(len(values),-1) for key,values in x.items()}
  reports={}
  baselines={'Majority':DummyClassifier(strategy='most_frequent'),'LogisticRegression':LogisticRegression(max_iter=1500,C=.1,class_weight='balanced',random_state=seed),'DecisionTree':DecisionTreeClassifier(max_depth=5,min_samples_leaf=20,class_weight='balanced',random_state=seed),'RandomForest':RandomForestClassifier(n_estimators=160,max_depth=8,min_samples_leaf=10,class_weight='balanced',random_state=seed,n_jobs=2)}
  for name,model in baselines.items():
   model.fit(flat['train'],ys['train']);reports[name]={'validation':metrics(ys['validation'],model.predict(flat['validation'])),'test':metrics(ys['test'],model.predict(flat['test']))}
  model=TrendLSTM();optimizer=torch.optim.Adam(model.parameters(),lr=.001,weight_decay=1e-4)
  counts=np.bincount(ys['train'],minlength=3);weights=torch.tensor((len(ys['train'])/(3*np.maximum(counts,1))).astype(np.float32));loss_fn=nn.CrossEntropyLoss(weight=weights)
  tensors={key:torch.from_numpy(v) for key,v in x.items()};labels=torch.from_numpy(ys['train']);best_f1=-1.;best_state=None;wait=0;history=[]
  for epoch in range(epochs):
   model.train();order=torch.randperm(len(labels));loss_total=0.
   for start in range(0,len(order),128):
    ids=order[start:start+128];optimizer.zero_grad();loss=loss_fn(model(tensors['train'][ids]),labels[ids]);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),1.0);optimizer.step();loss_total+=float(loss.detach())*len(ids)
   model.eval()
   with torch.no_grad(): prediction=model(tensors['validation']).argmax(1).numpy()
   validation=metrics(ys['validation'],prediction);history.append({'epoch':epoch+1,'trainLoss':loss_total/len(labels),'validationMacroF1':validation['macroF1']})
   if validation['macroF1']>best_f1+1e-5: best_f1=validation['macroF1'];best_state=copy.deepcopy(model.state_dict());wait=0
   else: wait+=1
   if wait>=8: break
  model.load_state_dict(best_state);model.eval()
  with torch.no_grad():
   val_probs=torch.softmax(model(tensors['validation']),dim=1).numpy();test_probs=torch.softmax(model(tensors['test']),dim=1).numpy();last_probs=torch.softmax(model(torch.from_numpy(scaled[-window:][None])),dim=1).numpy()[0]
  reports['LSTM']={'validation':metrics(ys['validation'],val_probs.argmax(1)),'test':metrics(ys['test'],test_probs.argmax(1)),'epochsRun':len(history),'bestEpoch':max(history,key=lambda item:item['validationMacroF1'])['epoch'],'trainingCurve':history}
  # Selection is reported from validation only; the app deliberately shows the TT's primary LSTM with its limitations.
  selected=max(reports,key=lambda name:reports[name]['validation']['macroF1'])
  date_ranges={key:{'originStart':aligned.Date.iloc[int(ids[0])],'originEnd':aligned.Date.iloc[int(ids[-1])],'lastTargetDate':aligned.Date.iloc[int(ids[-1]+horizon)],'samples':len(ids)} for key,ids in split.items()}
  all_reports[str(horizon)]={'models':reports,'selectedByValidation':selected,'deployedModel':'LSTM','ranges':date_ranges,'purgeDays':horizon,'classCounts':{key:np.bincount(value,minlength=3).tolist() for key,value in ys.items()}}
  state=model.state_dict();models[str(horizon)]={'hiddenSize':32,'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'weightIh':state['lstm.weight_ih_l0'].tolist(),'weightHh':state['lstm.weight_hh_l0'].tolist(),'biasIh':state['lstm.bias_ih_l0'].tolist(),'biasHh':state['lstm.bias_hh_l0'].tolist(),'weightOut':state['head.weight'].tolist(),'biasOut':state['head.bias'].tolist()}
  parity[str(horizon)]={'input':scaled[-window:].tolist(),'probabilities':last_probs.tolist()}
  print(json.dumps({'horizon':horizon,'selectedByValidation':selected,'lstmTestMacroF1':reports['LSTM']['test']['macroF1'],'majorityTestMacroF1':reports['Majority']['test']['macroF1'],'epochs':len(history)}),flush=True)
 manifest=json.loads((ROOT/'data/manifest.json').read_text(encoding='utf-8')) if (ROOT/'data/manifest.json').exists() else {'source':'User supplied CSV','symbol':'ETH-USD','sha256':hashlib.sha256(csv_path.read_bytes()).hexdigest()}
 artifact={'schemaVersion':1,'modelVersion':'heda-eth-lstm-v1','trainedAt':datetime.now(timezone.utc).isoformat(),'source':manifest,'featureNames':FEATURES,'window':window,'threshold':.01,'classes':CLASSES,'seed':seed,'lastTrainingDatasetDate':frame.Date.iloc[-1],'reports':all_reports,'models':models,'parity':parity,'referenceBars':frame.tail(90).rename(columns=str.lower).to_dict('records'),'methodology':'Chronological 70/15/15; horizon-purged split boundaries; scaler fitted to training period only; early stopping uses validation macro-F1; test never selects hyperparameters; LSTM remains primary even if a baseline is stronger.'}
 write_json(REPO/'supabase/functions/ethereum-forecast/models.json',artifact)
 write_json(ROOT/'reports/evaluation.json',{k:v for k,v in artifact.items() if k not in ['models','parity','referenceBars']})
 predictions=[]
 for h,r in all_reports.items():
  for name,m in r['models'].items(): predictions.append({'horizon':h,'model':name,'validation_macro_f1':m['validation']['macroF1'],'test_macro_f1':m['test']['macroF1'],'test_accuracy':m['test']['accuracy']})
 pd.DataFrame(predictions).to_csv(ROOT/'reports/model_comparison.csv',index=False)
 import matplotlib;matplotlib.use('Agg');import matplotlib.pyplot as plt
 fig,axes=plt.subplots(2,2,figsize=(12,8))
 for row,h in enumerate(['1','7']):
  models_report=all_reports[h]['models'];names=list(models_report)
  axes[row,0].bar(names,[models_report[name]['test']['macroF1'] for name in names]);axes[row,0].set_ylim(0,1);axes[row,0].tick_params(axis='x',rotation=25);axes[row,0].set_title(f'{h}-day held-out test macro F1')
  cm=np.array(models_report['LSTM']['test']['confusionMatrix']);axes[row,1].imshow(cm,cmap='Blues');axes[row,1].set_title(f'LSTM confusion matrix: {h} days');axes[row,1].set_xticks(range(3),CLASSES);axes[row,1].set_yticks(range(3),CLASSES);axes[row,1].set_xlabel('Predicted class');axes[row,1].set_ylabel('Actual class')
  for a in range(3):
   for b in range(3): axes[row,1].text(b,a,str(cm[a,b]),ha='center',va='center')
 fig.tight_layout();fig.savefig(ROOT/'reports/evaluation.png',dpi=150);plt.close(fig)
 return artifact

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--as-of',type=date.fromisoformat,default=datetime.now(timezone.utc).date());parser.add_argument('--csv',type=Path);parser.add_argument('--epochs',type=int,default=45);parser.add_argument('--window',type=int,default=30)
 args=parser.parse_args();path=args.csv or download(args.as_of);train(path,args.epochs,args.window)
