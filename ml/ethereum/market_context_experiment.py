"""Predeclared ETH-only versus ETH+BTC experiment; never overwrites deployed weights.
Three expanding temporal folds before the original test; scalers fit per fold.
The existing test period has already been inspected, so it is exploratory.
"""
import json,hashlib,urllib.request
from datetime import datetime,timezone
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import TimeSeriesSplit
from pipeline import ROOT,validate_frame,targets,metrics,write_json

def indicators(frame,prefix):
 c=frame.Close;ret=c.pct_change();delta=c.diff();gain=delta.clip(lower=0).rolling(14).mean();loss=(-delta.clip(upper=0)).rolling(14).mean()
 return pd.DataFrame({prefix+'return1':ret,prefix+'return7':c.pct_change(7),prefix+'return30':c.pct_change(30),prefix+'ma7':c/c.rolling(7).mean()-1,prefix+'ma30':c/c.rolling(30).mean()-1,prefix+'vol7':ret.rolling(7).std(),prefix+'vol30':ret.rolling(30).std(),prefix+'range':(frame.High-frame.Low)/c,prefix+'body':c/frame.Open-1,prefix+'volume_relative':frame.Volume/(frame.Volume.rolling(30).mean()+1)-1,prefix+'rsi14':gain/(gain+loss+1e-12)})
def obtain_btc(last):
 end=int((pd.Timestamp(last,tz='UTC')+pd.Timedelta(days=1)).timestamp());errors=[]
 for host in ['query1.finance.yahoo.com','query2.finance.yahoo.com']:
  url=f'https://{host}/v8/finance/chart/BTC-USD?period1=1483228800&period2={end}&interval=1d'
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'HEDA-Academic-Research/1.0'})
   with urllib.request.urlopen(req,timeout=15) as r:result=json.load(r)['chart']['result'][0]
   q=result['indicators']['quote'][0];rows=[{'Date':datetime.fromtimestamp(ts,timezone.utc).date().isoformat(),**{k.title():q[k][i] for k in ['open','high','low','close','volume']}} for i,ts in enumerate(result['timestamp']) if datetime.fromtimestamp(ts,timezone.utc).date().isoformat()<=last]
   # Only empty trailing unpublished rows may be removed; no internal gap filling.
   while rows and any(rows[-1][k] is None for k in ['Open','High','Low','Close','Volume']):rows.pop()
   frame=validate_frame(pd.DataFrame(rows));path=ROOT/'data/btc_usd_daily.csv';frame.to_csv(path,index=False)
   write_json(ROOT/'data/btc_manifest.json',{'source':'Yahoo Finance','symbol':'BTC-USD','retrievedAt':datetime.now(timezone.utc).isoformat(),'firstDate':frame.Date.iloc[0],'lastDate':frame.Date.iloc[-1],'rows':len(frame),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'url':url});return frame
  except Exception as e:errors.append(type(e).__name__)
 raise RuntimeError('BTC data unavailable: '+','.join(errors))
def main():
 eth=validate_frame(pd.read_csv(ROOT/'data/eth_usd_daily.csv'));btc=obtain_btc(eth.Date.iloc[-1]);joined=eth.merge(btc,on='Date',suffixes=('_eth','_btc'),validate='one_to_one').sort_values('Date').reset_index(drop=True)
 if not pd.to_datetime(joined.Date).diff().dropna().eq(pd.Timedelta(days=1)).all():raise ValueError('Aligned series contains gaps')
 ef=joined.rename(columns={k+'_eth':k for k in ['Open','High','Low','Close','Volume']})[['Date','Open','High','Low','Close','Volume']];bf=joined.rename(columns={k+'_btc':k for k in ['Open','High','Low','Close','Volume']})[['Date','Open','High','Low','Close','Volume']]
 ex=indicators(ef,'eth_');bx=indicators(bf,'btc_');bx['eth_btc_return7']=ef.Close.pct_change(7)-bf.Close.pct_change(7);valid=pd.concat([ex,bx],axis=1).notna().all(axis=1);dates=joined.Date[valid].reset_index(drop=True);close=ef.Close[valid].to_numpy();sets={'ETH':ex[valid].to_numpy(),'ETH_BTC':pd.concat([ex,bx],axis=1)[valid].to_numpy()};cut=int(len(close)*.85);reports={}
 for h in (1,7):
  y=targets(close,h);origins=np.arange(0,cut-h);splits=list(TimeSeriesSplit(n_splits=3,gap=h).split(origins));runs={}
  for group,x in sets.items():
   for name in ('LogisticRegression','HistGradientBoosting'):
    fold_results=[]
    for tr,va in splits:
     scaler=StandardScaler().fit(x[tr]);m=LogisticRegression(C=.1,class_weight='balanced',max_iter=2000,random_state=42) if name=='LogisticRegression' else HistGradientBoostingClassifier(max_iter=100,max_leaf_nodes=7,l2_regularization=1,class_weight='balanced',random_state=42)
     m.fit(scaler.transform(x[tr]),y[tr]);fold_results.append({'trainEnd':dates.iloc[int(tr[-1])],'trainTargetEnd':dates.iloc[int(tr[-1]+h)],'validationStart':dates.iloc[int(va[0])],'validationEnd':dates.iloc[int(va[-1])],'macroF1':metrics(y[va],m.predict(scaler.transform(x[va])))['macroF1']})
    runs[group+'_'+name]={'folds':fold_results,'meanValidationMacroF1':float(np.mean([f['macroF1'] for f in fold_results]))}
  # Select the candidate strictly from pre-test temporal folds, then evaluate once.
  selected=max(runs,key=lambda k:runs[k]['meanValidationMacroF1']);group='ETH_BTC' if selected.startswith('ETH_BTC_') else 'ETH';name=selected[len(group)+1:];x=sets[group];tr=np.arange(cut-h);te=np.arange(cut,len(close)-h);scaler=StandardScaler().fit(x[tr]);m=LogisticRegression(C=.1,class_weight='balanced',max_iter=2000,random_state=42) if name=='LogisticRegression' else HistGradientBoostingClassifier(max_iter=100,max_leaf_nodes=7,l2_regularization=1,class_weight='balanced',random_state=42);m.fit(scaler.transform(x[tr]),y[tr]);reports[str(h)]={'runs':runs,'selectedByTemporalValidation':selected,'exploratoryTest':metrics(y[te],m.predict(scaler.transform(x[te]))),'testStart':dates.iloc[cut]};print(json.dumps({'horizon':h,'selected':selected,'validationF1':runs[selected]['meanValidationMacroF1'],'exploratoryTestF1':reports[str(h)]['exploratoryTest']['macroF1']}),flush=True)
 write_json(ROOT/'reports/market_context_experiment.json',{'experiment':'ETH versus ETH+BTC stationary indicators','createdAt':datetime.now(timezone.utc).isoformat(),'alignedStart':dates.iloc[0],'alignedEnd':dates.iloc[-1],'samples':len(close),'selection':'Mean validation macro F1 over three expanding folds, purge equal to horizon; original test excluded from selection. Fixed configurations declared before run.','limitations':['Original test already inspected: not a new blind holdout.','No deployed model was changed. BTC is not proof of predictive improvement.','Live LSTM still expects ETH OHLCV from its original feature schema.','News and social posts were not scraped or fabricated.'],'reports':reports})
if __name__=='__main__':main()
