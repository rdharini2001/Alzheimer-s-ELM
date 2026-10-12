"""Nested, fold-isolated forward feature selection and ELM hyperparameter tuning."""
from __future__ import annotations
import argparse,csv,json
from pathlib import Path
import numpy as np
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold,StratifiedGroupKFold
from .data import read_records,select_experiment
from .modeling import make_pipeline,folds
from .metrics import evaluate,cluster_bootstrap
from .runner import save_csv

def inner_splits(y,groups,seed, n_splits=3):
    if len(set(groups))==len(groups):
        return list(StratifiedKFold(n_splits=n_splits,shuffle=True,random_state=seed).split(np.zeros(len(y)),y))
    return list(StratifiedGroupKFold(n_splits=n_splits,shuffle=True,random_state=seed).split(np.zeros(len(y)),y,groups))

def score_candidate(X,y,splits,cols,params,seed):
    scores=[]
    for fold,(tr,te) in enumerate(splits):
        clf=make_pipeline('ELM',seed=seed+fold)
        clf.set_params(model__n_hidden=params['n_hidden'],model__alpha=params['alpha'],
                       model__activation=params['activation'])
        clf.fit(X[tr][:,cols],y[tr])
        if len(set(y[te]))<2:continue
        scores.append(roc_auc_score(y[te],clf.predict_proba(X[te][:,cols])[:,1]))
    return float(np.mean(scores)) if scores else float('-inf')

def greedy_selection(X,y,splits,max_features=5,seed=43):
    selected=[]; remaining=list(range(X.shape[1]));trace=[]
    params={'n_hidden':64,'alpha':.01,'activation':'tanh'}
    # Select exactly up to max_features so the search is a predefined protocol.
    for step in range(min(max_features,X.shape[1])):
        evaluations=[(score_candidate(X,y,splits,selected+[candidate],params,seed),candidate)
                     for candidate in remaining]
        value,choice=max(evaluations,key=lambda t:(t[0],-t[1]))
        selected.append(choice);remaining.remove(choice)
        trace.append({'step':step+1,'feature_index':choice,'inner_auc':value})
    return selected,trace

def run(root='.', data='data/processed/oasis_longitudinal.csv', experiment='baseline_ever',seed=42):
    root=Path(root);cohort=select_experiment(read_records(root/data),experiment)
    X,y,groups=cohort['X'],cohort['y'],cohort['groups']
    outer=folds(cohort,seed=seed)
    preds=np.full(len(y),-1,dtype=int);probs=np.full(len(y),np.nan)
    fold_results=[];features_rows=[]
    params_grid=[{'n_hidden':width,'alpha':alpha,'activation':activation}
                 for width in (32,64) for alpha in (0.01,1.0) for activation in ('tanh','relu')]
    for k,(tr,te) in enumerate(outer,1):
        if set(groups[tr])&set(groups[te]):raise AssertionError('Cross-subject contamination')
        # Both feature and parameter optimization are entirely contained in outer train set.
        inner=inner_splits(y[tr],groups[tr],seed+k)
        chosen,trace=greedy_selection(X[tr],y[tr],inner,max_features=5,seed=seed+k)
        candidates=[(score_candidate(X[tr],y[tr],inner,chosen,cfg,seed+k),i,cfg)
                    for i,cfg in enumerate(params_grid)]
        best_auc,_,cfg=max(candidates,key=lambda t:(t[0],-t[1]))
        clf=make_pipeline('ELM',seed=seed+k)
        clf.set_params(model__n_hidden=cfg['n_hidden'],model__alpha=cfg['alpha'],model__activation=cfg['activation'])
        clf.fit(X[tr][:,chosen],y[tr])
        preds[te]=clf.predict(X[te][:,chosen]);probs[te]=clf.predict_proba(X[te][:,chosen])[:,1]
        fold_results.append({'experiment':experiment,'fold':k,'n_train':len(tr),'n_test':len(te),
                             'n_train_subjects':len(set(groups[tr])),'n_test_subjects':len(set(groups[te])),
                             'chosen_features':';'.join(cohort['fields'][i] for i in chosen),
                             'inner_auc_best_params':best_auc,**cfg,**evaluate(y[te],preds[te],probs[te])})
        features_rows.extend({'experiment':experiment,'outer_fold':k,'selected_order':z['step'],
                              'feature':cohort['fields'][z['feature_index']],
                              'inner_auc_when_added':z['inner_auc']} for z in trace)
        print(f'Nested {experiment} fold {k}: {fold_results[-1]["chosen_features"]}; accuracy={fold_results[-1]["accuracy"]:.3f}',flush=True)
    metric=evaluate(y,preds,probs)
    ci=cluster_bootstrap(y,preds,probs,groups,n_boot=200,seed=seed+231)
    metadata={'experiment':experiment,'outer_cv':'5-fold subject-independent stratified CV',
              'inner_cv':'3-fold subject-independent stratified CV',
              'selection':'greedy forward to 5 predictors by mean inner AUC; inside each outer training fold only',
              'hyperparameters':params_grid,'seed':seed,
              'metrics':metric,'ci_from_fixed_oof_subject_bootstrap':ci,
              'selected_features_can_vary_across_folds':True}
    dest=root/'results'
    save_csv(dest/f'tables/nested_elm_{experiment}_folds.csv',fold_results)
    save_csv(dest/f'tables/nested_elm_{experiment}_features.csv',features_rows)
    save_csv(dest/f'predictions/nested_elm_{experiment}_oof.csv',[
        {'subject_id':groups[i],'mri_id':cohort['sessions'][i],'actual':y[i],
         'predicted':preds[i],'prob_positive':probs[i]} for i in range(len(y))])
    (dest/f'metrics/nested_elm_{experiment}.json').write_text(json.dumps(metadata,indent=2)+'\n')
    return metric

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--experiment',default='baseline_ever',
                                   choices=['baseline_ever','group_subject_no_cdr']);p.add_argument('--seed',type=int,default=42)
    a=p.parse_args();run(root=a.root,experiment=a.experiment,seed=a.seed)
if __name__=='__main__':main()
