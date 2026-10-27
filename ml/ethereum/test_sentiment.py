import unittest
from sentiment_experiment import observed_news_features
class NewsAvailabilityTest(unittest.TestCase):
 def test_publication_date_cannot_make_a_later_observation_available_in_the_past(self):
  archive={'captures':[{'observedAt':'2026-10-27T12:00:00Z','sources':[{'ok':True}]}],'items':[{'publishedAt':'2026-10-25T01:00:00Z','observedAt':'2026-10-27T12:00:00Z','tone':{'score':-1}}]}
  values=observed_news_features(['2026-10-25','2026-10-26','2026-10-27'],archive)
  self.assertEqual(values.newsCount.tolist(),[0,0,1]);self.assertEqual(values.newsObserved.tolist(),[False,False,True])
 def test_invalid_future_publication_is_rejected(self):
  with self.assertRaises(ValueError):observed_news_features(['2026-10-27'],{'items':[{'publishedAt':'2026-10-28T01:00:00Z','observedAt':'2026-10-27T12:00:00Z'}]})
if __name__=='__main__':unittest.main()
