import json
import numpy as np
import pandas as pd
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pipeline import ROOT,CLASSES
r=json.loads((ROOT/'reports/evaluation.json').read_text(encoding='utf-8'))['reports'];fig,axes=plt.subplots(2,2,figsize=(12,8));rows=[]
for i,h in enumerate(['1','7']):
 models=r[h]['models'];names=list(models);axes[i,0].bar(names,[models[n]['test']['macroF1'] for n in names]);axes[i,0].set_ylim(0,1);axes[i,0].tick_params(axis='x',rotation=25);axes[i,0].set_title(f'{h}-day exploratory test macro F1');cm=np.array(models['LSTM']['test']['confusionMatrix']);axes[i,1].imshow(cm,cmap='Blues');axes[i,1].set_xticks(range(3),CLASSES);axes[i,1].set_yticks(range(3),CLASSES);axes[i,1].set_xlabel('Predicted class');axes[i,1].set_ylabel('Actual class');axes[i,1].set_title(f'LSTM {h} days')
 for a in range(3):
  for b in range(3):axes[i,1].text(b,a,str(cm[a,b]),ha='center',va='center')
 for n,m in models.items():rows.append({'horizon':h,'model':n,'validation_macro_f1':m['validation']['macroF1'],'test_macro_f1':m['test']['macroF1'],'test_accuracy':m['test']['accuracy']})
fig.tight_layout();fig.savefig(ROOT/'reports/evaluation.png',dpi=150);plt.close(fig);pd.DataFrame(rows).to_csv(ROOT/'reports/model_comparison.csv',index=False)
