import os,sys,unittest,tempfile
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from oasis_repro.data import read_records,inventory,select_experiment,EXPERIMENTS
from oasis_repro.elm import ExtremeLearningMachine
from oasis_repro.metrics import evaluate
from oasis_repro.modeling import folds,make_pipeline

ROOT=Path(__file__).resolve().parents[1]

class DataAndMetricTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=ROOT/'data/processed/oasis_longitudinal.csv'
        cls.rows=read_records(cls.data) if cls.data.exists() else None

    def test_confusion_metrics_cohere(self):
        y=np.array([0,0,1,1]);pred=np.array([0,1,1,1]);proba=np.array([.05,.7,.8,.9])
        m=evaluate(y,pred,proba)
        self.assertAlmostEqual(m['accuracy'],(m['tp']+m['tn'])/len(y))
        self.assertAlmostEqual(m['sensitivity'],m['tp']/(m['tp']+m['fn']))
        self.assertAlmostEqual(m['specificity'],m['tn']/(m['tn']+m['fp']))
    def test_data_inventory(self):
        if self.rows is None:self.skipTest('Dataset not downloaded')
        r=inventory(self.rows)
        self.assertEqual((r['n_subjects'],r['n_sessions']),(150,373))
        self.assertEqual(r['subject_group_counts'],{'Converted':14,'Demented':64,'Nondemented':72})
        self.assertEqual(r['missing_by_column']['SES'],19)
    def test_no_subject_overlap(self):
        if self.rows is None:self.skipTest('Dataset not downloaded')
        for name in EXPERIMENTS:
            c=select_experiment(self.rows,name)
            for tr,te in folds(c):
                self.assertEqual(len(set(tr)&set(te)),0)
                if c['split']=='subject':
                    self.assertFalse(set(c['groups'][tr])&set(c['groups'][te]))
    def test_label_proxies_omit_cdr(self):
        if self.rows is None:self.skipTest('Dataset not downloaded')
        for name in ('baseline_ever','visit_cdr_proxy','group_subject_no_cdr'):
            self.assertNotIn('CDR',select_experiment(self.rows,name)['fields'])
    def test_feature_cleaning_fitted_inside_fold(self):
        clf=make_pipeline('LR')
        X=np.array([[1,np.nan],[2,3],[3,4],[4,6]],dtype=float);y=np.array([0,0,1,1])
        clf.fit(X,y)
        self.assertEqual(len(clf.predict(X)),4)

class SessionHoldoutTests(unittest.TestCase):
    def test_session_holdout_records_and_metrics(self):
        path=ROOT/'results/metrics/elm_session_holdout.json'
        if not path.exists():self.skipTest('Full experiment not run yet')
        import json
        value=json.loads(path.read_text())
        self.assertEqual(value['n_subjects_in_both_train_and_test'],44)
        self.assertEqual(value['metrics']['tp']+value['metrics']['tn'],59)
        self.assertEqual(value['metrics']['n'],60)
        self.assertEqual(value['feature_set'],['CDR','eTIV','EDUC','MMSE','nWBV'])
        self.assertEqual(value['final_elm']['ridge_alpha'],0.0)

class ELMTests(unittest.TestCase):
    def test_shapes_probability_and_seed(self):
        rng=np.random.default_rng(3);X=rng.normal(size=(80,6));y=(X[:,0]+X[:,1]>0).astype(int)
        a=ExtremeLearningMachine(random_state=11).fit(X,y)
        b=ExtremeLearningMachine(random_state=11).fit(X,y)
        self.assertTrue(np.allclose(a.predict_proba(X),b.predict_proba(X)))
        self.assertTrue(np.allclose(a.predict_proba(X).sum(axis=1),1))
        self.assertGreater(evaluate(y,a.predict(X),a.predict_proba(X)[:,1])['accuracy'],0.7)
    def test_activation_choices(self):
        X=np.arange(40,dtype=float).reshape(-1,2);y=np.arange(len(X))%2
        for activation in ('relu','tanh','sigmoid'):
            p=ExtremeLearningMachine(activation=activation).fit(X,y).predict_proba(X)
            self.assertTrue(np.isfinite(p).all())

if __name__=='__main__':unittest.main()
