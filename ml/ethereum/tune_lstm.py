"""Small predeclared seed search selected by validation, never test score."""
import copy,json
from pipeline import ROOT,REPO,train,write_json
path=REPO/'supabase/functions/ethereum-forecast/models.json';original=json.loads(path.read_text(encoding='utf-8'));best=copy.deepcopy(original);runs=[]
for seed in (7,17,73):
 candidate=train(ROOT/'data/eth_usd_daily.csv',epochs=70,window=30,seed=seed)
 runs.append({'seed':seed,'validationMacroF1':{h:candidate['reports'][h]['models']['LSTM']['validation']['macroF1'] for h in ['1','7']}})
 for h in ['1','7']:
  if candidate['reports'][h]['models']['LSTM']['validation']['macroF1']>best['reports'][h]['models']['LSTM']['validation']['macroF1']:
   best['models'][h]=candidate['models'][h];best['parity'][h]=candidate['parity'][h];best['reports'][h]['models']['LSTM']=candidate['reports'][h]['models']['LSTM'];best['reports'][h]['selectedLSTMSeed']=seed
for h in ['1','7']:best['reports'][h]['selectedByValidation']=max(best['reports'][h]['models'],key=lambda name:best['reports'][h]['models'][name]['validation']['macroF1'])
best['modelVersion']='heda-eth-lstm-v2';best['tuning']={'seeds':[42,7,17,73],'selection':'highest validation macro F1 per horizon','note':'Exploratory search after v1 test inspection; original holdout is no longer a fresh blind test. Prospective validation required.','runs':runs}
write_json(path,best);write_json(ROOT/'reports/evaluation.json',{k:v for k,v in best.items() if k not in ['models','parity','referenceBars','comparators']})
write_json(ROOT/'reports/lstm_search.json',best['tuning'])
print(json.dumps({h:{'validationF1':best['reports'][h]['models']['LSTM']['validation']['macroF1'],'testF1':best['reports'][h]['models']['LSTM']['test']['macroF1'],'seed':best['reports'][h].get('selectedLSTMSeed',42)} for h in ['1','7']}))

# Regenerate figures after selecting models; the last candidate is not necessarily the winner.
import subprocess,sys
subprocess.run([sys.executable,str(ROOT/'render_results.py')],check=True)
