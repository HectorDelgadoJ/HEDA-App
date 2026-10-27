"""Future-only comparison gate. RSS published in the past is not retroactive training data."""
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import HistGradientBoostingClassifier
from pipeline import ROOT,validate_frame,targets,metrics,write_json
from market_context_experiment import indicators

def observed_news_features(dates,archive):
 # An uncaptured day is unknown, never automatically treated as a zero-news day.
 captures=pd.to_datetime([c['observedAt'] for c in archive.get('captures',[]) if any(s.get('ok') for s in c.get('sources',[]))],utc=True)
 items=[]
 for item in archive.get('items',[]):
  observed=pd.to_datetime(item['observedAt'],utc=True);published=pd.to_datetime(item['publishedAt'],utc=True)
  if published>observed:raise ValueError('News cannot be observed before publication')
  score=item.get('tone',{}).get('score',0)
  if score not in [-1,0,1]:raise ValueError('Invalid tone score')
  items.append((observed,score))
 rows=[]
 for day in dates:
  start=pd.Timestamp(day,tz='UTC');end=start+pd.Timedelta(days=1)
  available=any(start<=c<end for c in captures);observed=[score for time,score in items if start<=time<end]
  rows.append({'newsObserved':available,'newsCount':len(observed),'headlineTone':float(np.mean(observed)) if observed else 0.})
 return pd.DataFrame(rows)

def main():
 file=ROOT/'data/news_observations.json';archive=json.loads(file.read_text(encoding='utf-8')) if file.exists() else {'items':[],'captures':[]}
 eth=validate_frame(pd.read_csv(ROOT/'data/eth_usd_daily.csv'));last_closed=(pd.Timestamp.now(tz='UTC').normalize()-pd.Timedelta(days=1)).date().isoformat()
 # Training prices remain frozen until explicitly replaced by a validated same-source dataset.
 prices=eth[eth.Date<=last_closed].reset_index(drop=True);news=observed_news_features(prices.Date,archive);base=indicators(prices,'eth_');valid=base.notna().all(axis=1)&news.newsObserved
 indices=np.where(valid)[0];report={'method':'Same temporal folds, ETH indicators versus ETH plus observed headline count/tone. First observation time, not publication date, determines availability.','minimumObservedOrigins':180,'priceDatasetEnd':prices.Date.iloc[-1],'archiveItems':len(archive.get('items',[])),'observedOriginsWithPrices':len(indices),'productionChanged':False,'reports':{}}
 for h in [1,7]:
  y=targets(prices.Close.to_numpy(),h);ids=indices[y[indices]>=0]
  if len(ids)<180:report['reports'][str(h)]={'status':'insufficient_observed_data','origins':len(ids)};continue
  splits=list(TimeSeriesSplit(n_splits=3).split(ids));runs={}
  for group,x in {'prices':base.to_numpy(),'prices_news':pd.concat([base,news[['newsCount','headlineTone']]],axis=1).to_numpy()}.items():
   folds=[]
   for tr,va in splits:
    train=ids[tr];validation=ids[va];train=train[train+h<validation[0]]
    if len(train)<30:continue
    model=HistGradientBoostingClassifier(max_iter=100,max_leaf_nodes=7,l2_regularization=1,class_weight='balanced',random_state=42);model.fit(x[train],y[train]);score=metrics(y[validation],model.predict(x[validation]));folds.append({'trainTargetEnd':prices.Date.iloc[int(train[-1]+h)],'validationStart':prices.Date.iloc[int(validation[0])],**score})
   runs[group]=folds
  report['reports'][str(h)]={'status':'exploratory_temporal_evaluation','runs':runs,'note':'No automatic deployment or claim of causality.'}
 write_json(ROOT/'reports/sentiment_experiment.json',report);print(json.dumps(report,indent=2))
if __name__=='__main__':main()
