"""Run common-fold classification experiments and save out-of-fold estimates."""
from __future__ import annotations
import argparse, csv, json, platform, sys
from pathlib import Path
from collections import Counter
import numpy as np
import sklearn
from .data import EXPERIMENTS, inventory, read_records, select_experiment
from .modeling import MODEL_NAMES, make_pipeline, folds
from .metrics import evaluate, cluster_bootstrap

def save_csv(path, rows):
    path = Path(path);path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return
    keys = list(rows[0].keys())
    with path.open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=keys)
        writer.writeheader();writer.writerows(rows)

def run(data_path, root, experiments=EXPERIMENTS, models=MODEL_NAMES, seed=42, n_boot=100):
    root=Path(root)
    records=read_records(data_path)
    meta=inventory(records)
    meta.update({"seed":seed,"python":platform.python_version(),"numpy":np.__version__,"scikit_learn":sklearn.__version__,
                 "split_protocol":"StratifiedKFold for one-visit subjects; StratifiedGroupKFold for grouped longitudinal sessions; StratifiedKFold for session-level analysis"})
    (root/'results/metrics').mkdir(parents=True,exist_ok=True)
    (root/'results/metrics/data_inventory.json').write_text(json.dumps(meta,indent=2)+'\n')
    summary=[];foldrows=[];predictions=[];manifest=[]
    for experiment in experiments:
        cohort=select_experiment(records, experiment)
        splits=folds(cohort, seed=seed)
        for fold, (tr,te) in enumerate(splits,1):
            overlap=len(set(cohort['groups'][tr]) & set(cohort['groups'][te]))
            if cohort['split']=='subject' and overlap:
                raise AssertionError('Participant appeared in both train and test partitions')
            manifest.extend({"experiment":experiment,"fold":fold,"mri_id":cohort['sessions'][i],
                             "subject_id":cohort['groups'][i],"partition":"test"} for i in te)
        for model in models:
            y=cohort['y'];pred=np.full(len(y),-1,dtype=int);prob=np.full(len(y),np.nan)
            for fold,(tr,te) in enumerate(splits,1):
                m=make_pipeline(model,seed=seed+fold)
                m.fit(cohort['X'][tr],y[tr])
                pred[te]=m.predict(cohort['X'][te])
                prob[te]=m.predict_proba(cohort['X'][te])[:,1]
                stats=evaluate(y[te],pred[te],prob[te])
                foldrows.append({"experiment":experiment,"model":model,"fold":fold,**stats,
                                 "train_subjects":len(set(cohort['groups'][tr])),
                                 "test_subjects":len(set(cohort['groups'][te]))})
            assert np.all(pred>=0) and np.isfinite(prob).all()
            overall=evaluate(y,pred,prob)
            # Report participant-bootstrap uncertainty for ELM out-of-fold predictions.
            ci_keys=(f'{k}_{b}' for k in ('accuracy','sensitivity','specificity','f1','auc') for b in ('ci_low','ci_high'))
            ci=cluster_bootstrap(y,pred,prob,cohort['groups'],seed=seed+2023,n_boot=n_boot) if (n_boot and model=='ELM') else {key:'' for key in ci_keys}
            summary.append({"experiment":experiment,"model":model,
                            "n_subjects":cohort['n_subjects'],"n_features":len(cohort['fields']),
                            "features":";".join(cohort['fields']),
                            "split":cohort['split'],**overall,**ci})
            predictions.extend({"experiment":experiment,"model":model,
                                "subject_id":cohort['groups'][i],"mri_id":cohort['sessions'][i],
                                "actual":int(y[i]),"predicted":int(pred[i]),"prob_positive":float(prob[i])}
                               for i in range(len(y)))
        print(f"Done {experiment}: {len(y)} visits, {cohort['n_subjects']} participants, {len(models)} models",flush=True)
    save_csv(root/'results/tables/model_comparison.csv',summary)
    save_csv(root/'results/tables/cv_fold_metrics.csv',foldrows)
    save_csv(root/'results/predictions/oof_predictions.csv',predictions)
    save_csv(root/'results/tables/test_fold_manifest.csv',manifest)
    summary_by_exp={exp:[r for r in summary if r['experiment']==exp] for exp in experiments}
    (root/'results/metrics/summary.json').write_text(json.dumps(summary_by_exp,indent=2)+'\n')
    return summary

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--data',default='data/processed/oasis_longitudinal.csv')
    p.add_argument('--root',default='.')
    p.add_argument('--experiments',nargs='+',choices=EXPERIMENTS,default=EXPERIMENTS)
    p.add_argument('--models',nargs='+',choices=MODEL_NAMES,default=MODEL_NAMES)
    p.add_argument('--seed',type=int,default=42)
    p.add_argument('--bootstraps',type=int,default=100)
    args=p.parse_args()
    run(args.data,args.root,args.experiments,args.models,args.seed,args.bootstraps)
if __name__=='__main__':main()
