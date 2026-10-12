"""Between-seed stability and sex-stratified descriptive error audit."""
from pathlib import Path
import numpy as np
from .data import read_records,select_experiment
from .modeling import folds,make_pipeline
from .metrics import evaluate
from .runner import save_csv

def run(root='.'):
    root=Path(root);rows=read_records(root/'data/processed/oasis_longitudinal.csv')
    stability=[];subgroups=[]
    for experiment in ('baseline_ever','group_subject_no_cdr'):
        cohort=select_experiment(rows,experiment)
        X,y,groups=cohort['X'],cohort['y'],cohort['groups']
        for seed in (7,21,42,101,2023):
            cv=folds(cohort,seed=seed)
            for model in ('LR','ELM'):
                pred=np.full(len(y),-1,dtype=int);prob=np.full(len(y),np.nan)
                for k,(tr,te) in enumerate(cv):
                    pipe=make_pipeline(model,seed=seed+k)
                    pipe.fit(X[tr],y[tr])
                    pred[te]=pipe.predict(X[te])
                    prob[te]=pipe.predict_proba(X[te])[:,1]
                stats=evaluate(y,pred,prob)
                stability.append({'experiment':experiment,'seed':seed,'model':model,**stats})
                if seed==42:
                    # Sex is descriptive, not a protected-class fairness certification.
                    ix=cohort['fields'].index('M/F')
                    for code,name in ((0,'Female'),(1,'Male')):
                        mask=X[:,ix]==code
                        subgroups.append({'experiment':experiment,'model':model,'recorded_sex':name,
                                          'n_subjects':len(set(groups[mask])),**evaluate(y[mask],pred[mask],prob[mask])})
    save_csv(root/'results/tables/random_seed_stability.csv',stability)
    save_csv(root/'results/tables/sex_subgroup_descriptive.csv',subgroups)
if __name__=='__main__':run()
