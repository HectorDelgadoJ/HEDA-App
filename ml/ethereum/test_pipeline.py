import unittest
import numpy as np
from pipeline import split_samples,targets
class TemporalIntegrity(unittest.TestCase):
 def test_purged_boundaries(self):
  for horizon in (1,7):
   split,a,b=split_samples(1000,30,horizon)
   self.assertLess(max(split['train'])+horizon,a)
   self.assertGreaterEqual(min(split['validation']),a)
   self.assertLess(max(split['validation'])+horizon,b)
   self.assertGreaterEqual(min(split['test']),b)
 def test_future_labels_unavailable(self):
  result=targets(np.array([100.,105.,95.,100.,100.]),1)
  self.assertEqual(result.tolist(),[2,0,2,1,-1])
if __name__=='__main__':unittest.main()
