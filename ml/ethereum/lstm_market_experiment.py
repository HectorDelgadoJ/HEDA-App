"""Fixed ETH vs ETH+BTC LSTM experiment. Does not replace production artifacts.
Outer folds select feature group; early stopping uses only an inner training tail.
The previously inspected original test remains exploratory, not a new blind test.
"""
import copy,hashlib,json,random
import numpy as np
import pandas as pd
import torch
from torch import nn
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from pipeline import ROOT,validate_frame,targets,metrics,write_json
from market_context_experiment import indicators

CONFIG={'seed':42,'window':30,'hiddenSize':24,'epochs':30,'patience':5,'learningRate':.001,'weightDecay':.001,'folds':3,'minimumMeanF1Gain':.01,'minimumWinningFolds':2}
class MarketLSTM(nn.Module):
 def __init__(self,size):
  super().__init__();self.lstm=nn.LSTM(size,CONFIG['hiddenSize'],batch_first=True);self.head=nn.Linear(CONFIG['hiddenSize'],3)
 def forward(self,x):return self.head(self.lstm(x)[0][:,-1])

def fit_and_score(x,y,train_ids,eval_ids,horizon):
 random.seed(CONFIG['seed']);np.random.seed(CONFIG['seed']);torch.manual_seed(CONFIG['seed'])
 split=int(len(train_ids)*.85);train=train_ids[:split-horizon];inner=train_ids[split:]
 if not len(train) or train[-1]+horizon>=inner[0] or train_ids[-1]+horizon>=eval_ids[0]:raise ValueError('Temporal label leakage')
 scaler=StandardScaler().fit(x[:train[-1]+1]);scaled=scaler.transform(x).astype(np.float32);w=CONFIG['window']
 def sequences(ids):return torch.from_numpy(np.stack([scaled[i-w+1:i+1] for i in ids]))
 tensors={k:sequences(v) for k,v in {'train':train,'inner':inner,'evaluation':eval_ids}.items()};labels=torch.from_numpy(y[train]);counts=np.bincount(y[train],minlength=3)
 model=MarketLSTM(x.shape[1]);loss_fn=nn.CrossEntropyLoss(weight=torch.tensor((len(train)/(3*np.maximum(counts,1))).astype(np.float32)));optimizer=torch.optim.Adam(model.parameters(),lr=CONFIG['learningRate'],weight_decay=CONFIG['weightDecay'])
 best=-1.;state=None;wait=0;best_epoch=0
 for epoch in range(CONFIG['epochs']):
  model.train();order=torch.randperm(len(train))
  for start in range(0,len(train),128):
   ids=order[start:start+128];optimizer.zero_grad();loss=loss_fn(model(tensors['train'][ids]),labels[ids]);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),1);optimizer.step()
  model.eval()
  with torch.no_grad():score=metrics(y[inner],model(tensors['inner']).argmax(1).numpy())['macroF1']
  if score>best+1e-5:best=score;state=copy.deepcopy(model.state_dict());wait=0;best_epoch=epoch+1
  else:wait+=1
  if wait>=CONFIG['patience']:break
 model.load_state_dict(state);model.eval()
 with torch.no_grad():result=metrics(y[eval_ids],model(tensors['evaluation']).argmax(1).numpy())
 return result,{'state':state,'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'bestEpoch':best_epoch,'innerTrainLastOrigin':int(train[-1]),'innerValidationFirstOrigin':int(inner[0])}

def main():
 torch.set_num_threads(2);torch.use_deterministic_algorithms(True)
 paths={name:ROOT/f'data/{name}_usd_daily.csv' for name in ['eth','btc']};frames={name:validate_frame(pd.read_csv(path)) for name,path in paths.items()}
 dates=frames['eth'].Date;btc=frames['btc'].set_index('Date').reindex(dates).reset_index();eth=frames['eth']
 if btc.isna().any().any():raise ValueError('BTC does not cover ETH dates')
 ex=indicators(eth,'eth_');bx=indicators(btc,'btc_');bx['eth_btc_return7']=eth.Close.pct_change(7)-btc.Close.pct_change(7)
 valid=pd.concat([ex,bx],axis=1).notna().all(axis=1);dates=dates[valid].reset_index(drop=True);close=eth.Close[valid].to_numpy();sets={'ETH':ex[valid].to_numpy(),'ETH_BTC':pd.concat([ex,bx],axis=1)[valid].to_numpy()};cut=int(len(close)*.85);reports={}
 for h in [1,7]:
  y=targets(close,h);origins=np.arange(CONFIG['window']-1,cut-h);splits=list(TimeSeriesSplit(n_splits=3,gap=h).split(origins));runs={}
  for group,x in sets.items():
   folds=[]
   for fold,(tr,va) in enumerate(splits):
    train=origins[tr];validation=origins[va];score,artifact=fit_and_score(x,y,train,validation,h)
    folds.append({'trainTargetEnd':dates.iloc[int(train[-1]+h)],'validationStart':dates.iloc[int(validation[0])],'validationEnd':dates.iloc[int(validation[-1])],'macroF1':score['macroF1'],'accuracy':score['accuracy'],'bestEpoch':artifact['bestEpoch']})
    print(json.dumps({'horizon':h,'features':group,'fold':fold+1,'macroF1':score['macroF1']}),flush=True)
   runs[group]={'folds':folds,'meanValidationMacroF1':float(np.mean([v['macroF1'] for v in folds]))}
  differences=[b['macroF1']-a['macroF1'] for a,b in zip(runs['ETH']['folds'],runs['ETH_BTC']['folds'])];gain=float(np.mean(differences));wins=sum(d>0 for d in differences);selected='ETH_BTC' if gain>=CONFIG['minimumMeanF1Gain'] and wins>=CONFIG['minimumWinningFolds'] else 'ETH'
  train=origins;test=np.arange(cut,len(close)-h);score,artifact=fit_and_score(sets[selected],y,train,test,h)
  checkpoint=ROOT/f'checkpoints/market_lstm_{h}d.pt';checkpoint.parent.mkdir(exist_ok=True);torch.save({'config':CONFIG,'group':selected,'horizon':h,'artifact':artifact},checkpoint)
  reports[str(h)]={'runs':runs,'pairedFoldF1Gain':differences,'meanBTCGain':gain,'BTCWinningFolds':wins,'selectedByValidation':selected,'exploratoryTest':score,'testStart':dates.iloc[cut],'checkpointSha256':hashlib.sha256(checkpoint.read_bytes()).hexdigest(),'productionChanged':False}
 write_json(ROOT/'reports/lstm_market_experiment.json',{'experiment':'LSTM stationary ETH vs ETH+BTC','config':CONFIG,'sourceHashes':{name:hashlib.sha256(path.read_bytes()).hexdigest() for name,path in paths.items()},'start':dates.iloc[0],'end':dates.iloc[-1],'reports':reports,'limitations':['Previously inspected test; exploratory results only.','Not directly comparable to production LSTM: feature representation and fitting differ.','No news or social sentiment was included in these scores.','Candidate checkpoints are local; published weights were not replaced.']})
if __name__=='__main__':main()
