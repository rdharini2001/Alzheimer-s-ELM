"""Repeatable ELM session-level holdout and forward feature selection."""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
from sklearn.model_selection import StratifiedShuffleSplit, StratifiedKFold
from sklearn.metrics import confusion_matrix, roc_curve
from .data import read_records, select_experiment
from .nested import greedy_selection
from .modeling import make_pipeline
from .metrics import evaluate
from .runner import save_csv


def run(root='.', seed=42):
    root = Path(root)
    cohort = select_experiment(read_records(root/'data/processed/oasis_longitudinal.csv'),
                               'group_subject_with_cdr')
    X, y, subjects = cohort['X'], cohort['y'], cohort['groups']
    sessions = cohort['sessions']
    # Stratified split by session. Subject overlap is quantified and saved.
    outer = StratifiedShuffleSplit(n_splits=1, test_size=60, random_state=seed)
    tr, te = next(outer.split(X, y))
    # Greedy forward selection is carried out on the training sessions only.
    inner = list(StratifiedKFold(n_splits=3, shuffle=True,
                                random_state=seed+1).split(X[tr], y[tr]))
    selected, trace = greedy_selection(X[tr], y[tr], inner,
                                       max_features=5, seed=seed+1)
    # Alpha=0 invokes the Moore–Penrose pseudoinverse.
    pipe = make_pipeline('ELM', seed=seed)
    pipe.set_params(model__n_hidden=64, model__activation='tanh', model__alpha=0.0)
    pipe.fit(X[tr][:, selected], y[tr])
    pred = pipe.predict(X[te][:, selected])
    prob = pipe.predict_proba(X[te][:, selected])[:, 1]
    metrics = evaluate(y[te], pred, prob)
    overlap = sorted(set(subjects[tr]) & set(subjects[te]))
    outputs = {
        'experiment': 'elm_session_holdout',
        'source_data_target': 'OASIS Group: Demented=1 / Nondemented=0; Converted excluded',
        'split': 'StratifiedShuffleSplit over MRI VISITS; 60 session test; seed=42',
        'n_train_sessions': int(len(tr)),
        'n_test_sessions': int(len(te)),
        'n_train_unique_subjects': int(len(set(subjects[tr]))),
        'n_test_unique_subjects': int(len(set(subjects[te]))),
        'n_subjects_in_both_train_and_test': int(len(overlap)),
        'feature_selection': 'Greedy forward 5 steps by inner 3-fold CV ROC AUC on training sessions ONLY',
        'feature_selection_base_elm': {'n_hidden':64,'activation':'tanh','ridge_alpha':0.01},
        'feature_set': [cohort['fields'][i] for i in selected],
        'final_elm': {'n_hidden':64,'activation':'tanh','ridge_alpha':0.0,
                      'output_solution':'Moore-Penrose pseudoinverse', 'seed':seed},
        'metrics': metrics,
        'validation_unit': 'MRI session; subjects may appear in both partitions',
    }
    dest = root/'results'
    (dest/'metrics').mkdir(parents=True, exist_ok=True)
    (dest/'metrics/elm_session_holdout.json').write_text(json.dumps(outputs, indent=2)+'\n')
    save_csv(dest/'tables/elm_session_holdout_feature_trace.csv',
             [{'step':v['step'],'feature':cohort['fields'][v['feature_index']],
               'inner_mean_auc':v['inner_auc']} for v in trace])
    trainset, testset = set(tr), set(te)
    save_csv(dest/'tables/elm_session_holdout_manifest.csv', [
        {'subject_id':subjects[i], 'mri_id':sessions[i],
         'partition':'train' if i in trainset else 'test',
         'shared_participant_with_opposite_partition':int(subjects[i] in overlap)}
        for i in range(len(y))])
    save_csv(dest/'predictions/elm_session_predictions.csv', [
        {'subject_id':subjects[i], 'mri_id':sessions[i],
         'actual':int(y[i]),'predicted':int(pred[k]),'prob_positive':float(prob[k])}
        for k,i in enumerate(te)])
    print('ELM session holdout accuracy: {:.3%} ({} correct / {} MRI sessions); '
          'participants overlapping train and test: {}'.format(metrics['accuracy'],
               metrics['tp']+metrics['tn'],len(te),len(overlap)), flush=True)
    return outputs

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--root',default='.')
    ap.add_argument('--seed',type=int,default=42)
    args = ap.parse_args()
    run(args.root,args.seed)
