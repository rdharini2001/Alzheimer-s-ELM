#!/usr/bin/env python3
"""Verify predictions, confusion matrices, cohort counts and split structure."""
import csv, json, hashlib, math, sys
from pathlib import Path
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, recall_score, roc_auc_score

ROOT=Path(__file__).resolve().parents[1]

def rows(path):
    with (ROOT/path).open(newline='',encoding='utf-8') as f:
        return list(csv.DictReader(f))

def fail(msg):
    raise AssertionError(msg)

def check_close(actual,expected,msg,tol=1e-12):
    if not math.isclose(float(actual),float(expected),abs_tol=tol,rel_tol=0):fail(f'{msg}: {actual} != {expected}')

def main():
    # Ensure the saved machine-readable full study can be rebuilt from source.
    checksum_file=ROOT/'docs/SHA256SUMS.txt'
    if checksum_file.exists():
        for line in checksum_file.read_text().splitlines():
            digest,rel=line.split(maxsplit=1)
            rel=rel.strip()
            f=ROOT/rel
            if f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()!=digest:
                fail(f'Input changed without recorded checksum update: {rel}')
    inv=json.loads((ROOT/'results/metrics/data_inventory.json').read_text())
    if (inv['n_sessions'],inv['n_subjects']) !=(373,150):fail('OASIS input cohort shape unexpectedly changed')
    # Recompute session holdout metrics from saved predictions.
    recon=json.loads((ROOT/'results/metrics/elm_session_holdout.json').read_text())
    holdout=rows('results/predictions/elm_session_predictions.csv')
    if len(holdout)!=60:fail('holdout must contain exactly 60 records')
    y=np.array([int(v['actual']) for v in holdout]);p=np.array([int(v['predicted']) for v in holdout]);q=np.array([float(v['prob_positive']) for v in holdout])
    if len(set(v['mri_id'] for v in holdout))!=len(holdout):fail('duplicated held-out session')
    m=recon['metrics'];tn,fp,fn,tp=confusion_matrix(y,p,labels=[0,1]).ravel()
    for k,v in [('tn',tn),('fp',fp),('fn',fn),('tp',tp)]:
        if m[k]!=v:fail('saved confusion-matrix counts do not match predictions')
    check_close(accuracy_score(y,p),m['accuracy'],'holdout accuracy')
    check_close(recall_score(y,p),m['sensitivity'],'holdout sensitivity')
    check_close(tn/(tn+fp),m['specificity'],'holdout specificity')
    check_close(f1_score(y,p),m['f1'],'holdout F1')
    check_close(roc_auc_score(y,q),m['auc'],'holdout AUC')
    manifest=rows('results/tables/elm_session_holdout_manifest.csv')
    tr={r['subject_id'] for r in manifest if r['partition']=='train'}
    te={r['subject_id'] for r in manifest if r['partition']=='test'}
    if len(tr&te)!=recon['n_subjects_in_both_train_and_test']:fail('Participant overlap inaccurate')
    # Group-disjoint folds must really be disjoint and have complete predictions.
    oof=rows('results/predictions/oof_predictions.csv')
    scores=rows('results/tables/model_comparison.csv')
    for score in scores:
        matched=[r for r in oof if r['experiment']==score['experiment'] and r['model']==score['model']]
        if len(matched)!=int(score['n']):fail('Missing/extra out-of-fold rows')
        actual=np.array([int(r['actual']) for r in matched]);pr=np.array([int(r['predicted']) for r in matched]);pro=np.array([float(r['prob_positive']) for r in matched])
        check_close(accuracy_score(actual,pr),score['accuracy'],f"{score['experiment']} {score['model']} accuracy")
        check_close(f1_score(actual,pr,zero_division=0),score['f1'],f"{score['experiment']} {score['model']} F1")
        check_close(roc_auc_score(actual,pro),score['auc'],f"{score['experiment']} {score['model']} AUC")
    testing=rows('results/tables/test_fold_manifest.csv')
    for experiment in ('visit_cdr_proxy','group_subject_no_cdr','group_subject_with_cdr','baseline_ever'):
        group=[r for r in testing if r['experiment']==experiment]
        folded={}
        for row in group:folded.setdefault(int(row['fold']),set()).add(row['subject_id'])
        for f,ids in folded.items():
            if ids & set.union(*(v for k,v in folded.items() if k!=f)):
                fail('A participant appears in >1 subject-disjoint test fold')
    print(f'VERIFIED: {len(scores)} model/protocol metrics; all saved predictions; session-holdout prediction checks; overlap independently computed; source checksums; no grouped test-fold overlap.')

if __name__=='__main__':main()
