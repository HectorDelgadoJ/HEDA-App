"""Validation-selected reference model; retained holdout, explicit exploratory revision."""
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from pipeline import ROOT,REPO,features,validate_frame,split_samples,targets,metrics,write_json
frame=validate_frame(pd.read_csv(ROOT/'data/eth_usd_daily.csv'));raw,aligned=features(frame)
artifact=json.loads((REPO/'supabase/functions/ethereum-forecast/models.json').read_text(encoding='utf-8'))
comparators={};report={}
for h in (1,7):
 split,a,b=split_samples(len(raw),30,h);scaler=StandardScaler().fit(raw[:a]);scaled=scaler.transform(raw);labels=targets(aligned.Close.to_numpy(),h)
 x={k:np.stack([scaled[i-29:i+1].reshape(-1) for i in ids]) for k,ids in split.items()};y={k:labels[ids] for k,ids in split.items()}
 choices=[('LogisticRegression',LogisticRegression(C=.1,class_weight='balanced',max_iter=1500,random_state=42)),('RandomForest',RandomForestClassifier(n_estimators=160,max_depth=8,min_samples_leaf=10,class_weight='balanced',random_state=42,n_jobs=2))]
 results=[]
 for name,m in choices:m.fit(x['train'],y['train']);results.append((metrics(y['validation'],m.predict(x['validation']))['macroF1'],name,m))
 _,name,m=max(results,key=lambda v:v[0]);test=metrics(y['test'],m.predict(x['test']))
 export={'name':name,'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'classes':m.classes_.tolist(),'validationMacroF1':max(r[0] for r in results),'test':test}
 if name=='LogisticRegression':export.update(coef=m.coef_.tolist(),intercept=m.intercept_.tolist())
 else:export['trees']=[{'left':t.tree_.children_left.tolist(),'right':t.tree_.children_right.tolist(),'feature':t.tree_.feature.tolist(),'threshold':t.tree_.threshold.tolist(),'value':[v[0].tolist() for v in t.tree_.value]} for t in m.estimators_]
 latest=scaled[-30:].reshape(1,-1);export['parity']={'input':latest[0].tolist(),'probabilities':m.predict_proba(latest)[0].tolist()};comparators[str(h)]=export
 # Expanding-window validation restricted to ORIGINAL training/validation period.
 # Each fold scaler fits only its training rows, and target horizon is purged.
 origins=np.arange(29,b-h);folds=[]
 for train_idx,val_idx in TimeSeriesSplit(n_splits=3,gap=h).split(origins):
  tr,va=origins[train_idx],origins[val_idx];fold_scaler=StandardScaler().fit(raw[:max(tr)+1]);z=fold_scaler.transform(raw)
  xx=lambda ids:np.stack([z[i-29:i+1].reshape(-1) for i in ids]);candidate=LogisticRegression(C=.1,class_weight='balanced',max_iter=1500,random_state=42) if name=='LogisticRegression' else RandomForestClassifier(n_estimators=80,max_depth=8,min_samples_leaf=10,class_weight='balanced',random_state=42,n_jobs=2)
  candidate.fit(xx(tr),labels[tr]);folds.append({'trainEnd':aligned.Date.iloc[max(tr)],'trainTargetEnd':aligned.Date.iloc[max(tr)+h],'validationStart':aligned.Date.iloc[min(va)],'validationEnd':aligned.Date.iloc[max(va)],**metrics(labels[va],candidate.predict(xx(va)))})
 report[str(h)]={'selectedBy':'validation macro F1 only, between predeclared LogisticRegression and RandomForest','selected':name,'validationMacroF1':export['validationMacroF1'],'test':test,'expandingWindowFolds':folds}
artifact['comparators']=comparators
write_json(REPO/'supabase/functions/ethereum-forecast/models.json',artifact)
write_json(ROOT/'reports/reference_models.json',{'note':'Exploratory revision. The original test had already been inspected in v1; these results are not a fresh blind evaluation. No test result selects the exported model. Walk-forward folds exclude the original test period. A new prospective holdout is still required.','reports':report})
print(json.dumps({h:{'model':r['selected'],'testF1':r['test']['macroF1'],'foldF1':[x['macroF1'] for x in r['expandingWindowFolds']]} for h,r in report.items()}))
