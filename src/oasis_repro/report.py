"""Publish a Markdown report and clean classifier tables from saved experiment outputs."""
from __future__ import annotations
import csv, json
from pathlib import Path
from .runner import save_csv

def read_table(path):
    with Path(path).open(newline='',encoding='utf-8') as f:
        return list(csv.DictReader(f))

def percent(value):
    return f"{float(value)*100:.2f}%"

def metric(value):
    return f"{float(value):.4f}"

def run(root='.'):
    root=Path(root)
    table=read_table(root/'results/tables/model_comparison.csv')
    hold=json.loads((root/'results/metrics/elm_session_holdout.json').read_text())
    meta=json.loads((root/'results/metrics/data_inventory.json').read_text())
    nested={name:json.loads((root/f'results/metrics/nested_elm_{name}.json').read_text()) for name in ('baseline_ever','group_subject_no_cdr')}
    exp={name:{r['model']:r for r in table if r['experiment']==name} for name in sorted({r['experiment'] for r in table})}
    primary=exp['group_subject_no_cdr']
    fields=('model','n','accuracy','sensitivity','specificity','precision','f1','auc','brier','tn','fp','fn','tp')
    save_csv(root/'results/tables/primary_classifier_metrics.csv',[{k:r[k] for k in fields} for r in (primary[name] for name in ('LR','kNN','NB','SVM','DT','RFC','GB','ELM'))])
    v=hold['metrics']
    lines=['# Results', '', '## Dataset', '',
       f"OASIS-2 cohort: **{meta['n_subjects']} participants** and **{meta['n_sessions']} MRI sessions**. Participant diagnostic groups: Nondemented {meta['subject_group_counts']['Nondemented']}, Demented {meta['subject_group_counts']['Demented']}, Converted {meta['subject_group_counts']['Converted']}.",
       '', '## ELM session holdout', '', '| Metric | Value |','|---|---:|',
       f"| Accuracy | **{percent(v['accuracy'])}** ({v['tn']+v['tp']}/{v['n']}) |",
       f"| Sensitivity | {metric(v['sensitivity'])} |", f"| Specificity | {metric(v['specificity'])} |",
       f"| Precision | {metric(v['precision'])} |",f"| F1 | {metric(v['f1'])} |",f"| ROC AUC | {metric(v['auc'])} |",
       f"| Confusion matrix (TN/FP/FN/TP) | {v['tn']}/{v['fp']}/{v['fn']}/{v['tp']} |",
       f"| Selected features | {', '.join(hold['feature_set'])} |",
       f"| Train/test participant overlap | {hold['n_subjects_in_both_train_and_test']} |",
       '', '![ELM session test confusion matrix](../results/figures/elm_session_holdout_confusion.png)',
       '', '## Eight-model evaluation: participant-disjoint 5-fold CV, without CDR', '',
       '| Model | Accuracy | Sensitivity | Specificity | F1 | ROC AUC |',
       '|---|---:|---:|---:|---:|---:|']
    for name in ('LR','kNN','NB','SVM','DT','RFC','GB','ELM'):
        r=primary[name]
        lines.append(f"| {name} | {percent(r['accuracy'])} | {metric(r['sensitivity'])} | {metric(r['specificity'])} | {metric(r['f1'])} | {metric(r['auc'])} |")
    lines.extend(['','## ELM outcomes by evaluation protocol','','| Protocol | Samples | Accuracy | Sensitivity | Specificity | F1 | ROC AUC |','|---|---:|---:|---:|---:|---:|---:|'])
    labels=[('baseline_ever','Baseline-only, ever-demented grouping'),('visit_cdr_proxy','Visit CDR target, grouped'),('group_subject_no_cdr','Recorded group, CDR excluded, grouped'),('group_subject_with_cdr','Recorded group, CDR included, grouped'),('group_session_with_cdr','Recorded group, CDR included, session CV')]
    for key,label in labels:
        r=exp[key]['ELM']
        lines.append(f"| {label} | {r['n']} | {percent(r['accuracy'])} | {metric(r['sensitivity'])} | {metric(r['specificity'])} | {metric(r['f1'])} | {metric(r['auc'])} |")
    lines.extend(['','## Nested ELM: subject-independent selection and tuning', '', '| Experiment | Samples | Accuracy | Sensitivity | Specificity | F1 | ROC AUC |','|---|---:|---:|---:|---:|---:|---:|'])
    for key in ('baseline_ever','group_subject_no_cdr'):
        r=nested[key]['metrics'];lines.append(f"| `{key}` | {r['n']} | {percent(r['accuracy'])} | {metric(r['sensitivity'])} | {metric(r['specificity'])} | {metric(r['f1'])} | {metric(r['auc'])} |")
    lines.extend(['','## Interpretation','','The session-level holdout and participant-disjoint cross-validation answer different prediction questions. Sessions from the same person occur in both partitions in the session holdout. CDR is a recorded clinical dementia rating strongly related to the diagnostic outcome. Therefore the high CDR-inclusive scores are not equivalent to MRI-derived-feature-only prediction on unseen people.','',
       'The OASIS demographic spreadsheet includes derived neuroimaging volumes and clinical data; original voxel-level MRI images are not inputs to this program. This software is for research and is not a clinical decision tool.','',
       'See [Methods](METHODS.md) for exact class definitions, partition rules, model hyperparameters, feature selection and evaluation. Saved metrics appear in `results/metrics/`; model comparison tables in `results/tables/`; row-level predictions in the local complete research archive.'])
    (root/'docs/RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    return len(table)

if __name__=='__main__':run()
