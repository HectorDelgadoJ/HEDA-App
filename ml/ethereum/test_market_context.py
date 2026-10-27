import unittest
import numpy as np
import pandas as pd
from market_context_experiment import indicators
class TemporalFeaturesTest(unittest.TestCase):
 def test_future_changes_do_not_change_past_features(self):
  n=110;c=np.arange(n,dtype=float)+100
  frame=pd.DataFrame({'Open':c,'High':c+1,'Low':c-1,'Close':c,'Volume':np.arange(n)+1000})
  original=indicators(frame,'eth_');frame.loc[81:,'Close']*=2
  changed=indicators(frame,'eth_');np.testing.assert_allclose(original.iloc[:81],changed.iloc[:81],equal_nan=True)
if __name__=='__main__':unittest.main()
