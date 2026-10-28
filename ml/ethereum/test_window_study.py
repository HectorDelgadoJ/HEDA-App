import unittest
import numpy as np
from window_study import inner_split,regime_labels,select_window,PROTOCOL
class WindowStudyIntegrity(unittest.TestCase):
 def test_inner_boundary_excludes_labels_from_validation(self):
  for horizon in [1,7]:
   train,validation=inner_split(np.arange(59,1000),horizon);self.assertLess(train[-1]+horizon,validation[0])
 def test_regimes_never_change_when_future_prices_change(self):
  close=np.arange(150,dtype=float)+100;original=regime_labels(close);changed=close.copy();changed[100:]*=3;self.assertEqual(original[:100].tolist(),regime_labels(changed)[:100].tolist())
 def test_window_selection_requires_repeated_improvement_not_one_lucky_seed(self):
  def rows(scores):return [{'fold':f,'seed':s,'macroF1':scores(f,s)} for f in range(3) for s in PROTOCOL['seeds']]
  base=rows(lambda f,s:.35);lucky=rows(lambda f,s:.6 if s==42 else .33)
  self.assertEqual(select_window({'14':lucky,'30':base,'60':base})['selectedWindow'],30)
  better=rows(lambda f,s:.37);self.assertEqual(select_window({'14':better,'30':base,'60':base})['selectedWindow'],14)
if __name__=='__main__':unittest.main()
