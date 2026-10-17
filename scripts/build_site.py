#!/usr/bin/env python3
"""Build the public GitHub Pages site from aggregate experiment results.

Only aggregated statistics and ROC coordinates are embedded. Individual visit
identifiers, labels and prediction rows are not included in the HTML.
"""
from __future__ import annotations
import csv, json
from pathlib import Path
from collections import Counter
from sklearn.metrics import roc_curve

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
SOURCE=ROOT/'data/processed/oasis_longitudinal.csv'
COHORT_SUMMARY=ROOT/'results/metrics/site_cohort.json'


def read_rows(path):
    with path.open(newline='',encoding='utf8') as fd:
        return list(csv.DictReader(fd))


def cohort():
    info=json.loads((ROOT/'results/metrics/data_inventory.json').read_text())
    if SOURCE.exists():
        baseline={}
        for row in read_rows(SOURCE):
            uid=row['Subject ID']
            if uid not in baseline or int(row['Visit'])<int(baseline[uid]['Visit']):
                baseline[uid]=row
        vals=Counter(int(float(row['Age']))//5*5 for row in baseline.values())
        ages=[{'age':f'{age}–{age+4}','count':vals.get(age,0)} for age in range(60,100,5)]
        result={'sessions':info['n_sessions'],'subjects':info['n_subjects'],'groups':info['subject_group_counts'],'ages':ages}
        COHORT_SUMMARY.write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
        return result
    if COHORT_SUMMARY.exists():
        return json.loads(COHORT_SUMMARY.read_text())
    # Baseline cohort summary remains usable without the separately licensed dataset.
    return {'sessions':info['n_sessions'],'subjects':info['n_subjects'],'groups':info['subject_group_counts'],'ages':[]}


def get_roc():
    saved=ROOT/'results/metrics/site_roc.json'
    oof=ROOT/'results/predictions/oof_predictions.csv'
    hold=ROOT/'results/predictions/elm_session_predictions.csv'
    curves={}
    if oof.exists():
        grouped={}
        for r in read_rows(oof):
            grouped.setdefault((r['experiment'],r['model']),[]).append(r)
        for (exp,model),rs in grouped.items():
            y=[int(r['actual']) for r in rs]
            p=[float(r['prob_positive']) for r in rs]
            fpr,tpr,_=roc_curve(y,p)
            curves[f'{exp}/{model}']=[[round(float(a),6),round(float(b),6)] for a,b in zip(fpr,tpr)]
    if hold.exists():
        rs=read_rows(hold)
        fpr,tpr,_=roc_curve([int(r['actual']) for r in rs],[float(r['prob_positive']) for r in rs])
        curves['session_holdout/ELM']=[[round(float(a),6),round(float(b),6)] for a,b in zip(fpr,tpr)]
    if curves:
        saved.write_text(json.dumps(curves,separators=(',',':'))+'\n',encoding='utf8')
        return curves
    return json.loads(saved.read_text()) if saved.exists() else {}


def main():
    experiments={}
    for row in read_rows(ROOT/'results/tables/model_comparison.csv'):
        if row['experiment'] not in ('group_subject_no_cdr','group_subject_with_cdr','group_session_with_cdr'):
            continue
        d={'model':row['model'],'n':int(row['n'])}
        for key in ('accuracy','sensitivity','specificity','f1','auc'):
            d[key]=float(row[key])
        for key in ('tn','fp','fn','tp'):
            d[key]=int(row[key])
        experiments.setdefault(row['experiment'],[]).append(d)
    item=json.loads((ROOT/'results/metrics/elm_session_holdout.json').read_text())['metrics']
    d={'model':'ELM','n':int(item['n'])}
    for key in ('accuracy','sensitivity','specificity','f1','auc'):
        d[key]=float(item[key])
    for key in ('tn','fp','fn','tp'):
        d[key]=int(item[key])
    experiments['session_holdout']=[d]
    curves=get_roc()
    for name,rr in experiments.items():
        for r in rr:
            r['roc']=curves.get(f"{name}/{r['model']}",[[0,0],[1,1]])
    payload={'cohort':cohort(),'experiments':experiments}
    text=(DOCS/'site.template.html').read_text(encoding='utf8')
    text=text.replace('__PROJECT_DATA__',json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('</','<\\/'))
    (DOCS/'index.html').write_text(text,encoding='utf8')
    print(f"Built docs/index.html: {sum(map(len,experiments.values()))} computed model rows, {len(curves)} aggregate ROC curves")

if __name__=='__main__':main()
