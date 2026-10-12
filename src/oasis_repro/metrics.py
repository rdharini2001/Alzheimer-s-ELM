"""Binary classification metrics and subject-cluster uncertainty intervals."""
import numpy as np
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, brier_score_loss, confusion_matrix)

def evaluate(y, pred, proba):
    y, pred, proba = np.asarray(y, dtype=int), np.asarray(pred, dtype=int), np.asarray(proba, dtype=float)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "n": int(len(y)), "positive_n": int(y.sum()),
        "accuracy": float(accuracy_score(y, pred)),
        "sensitivity": float(recall_score(y, pred, zero_division=0)),
        "specificity": float(tn / (tn+fp)) if tn+fp else float("nan"),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "auc": float(roc_auc_score(y, proba)) if len(np.unique(y)) == 2 else float("nan"),
        "brier": float(brier_score_loss(y, proba)),
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
    }

def cluster_bootstrap(y, pred, proba, groups, seed=2023, n_boot=300):
    """95% percentile CI on fixed OOF predictions, resampling participants.

    Does not include model-refitting/algorithmic or split uncertainty.
    """
    groups = np.asarray(groups)
    unique = np.unique(groups)
    positions = {s: np.where(groups == s)[0] for s in unique}
    rng = np.random.default_rng(seed)
    metrics = {m: [] for m in ("accuracy", "sensitivity", "specificity", "f1", "auc")}
    for _ in range(n_boot):
        ids = rng.choice(unique, size=len(unique), replace=True)
        ix = np.concatenate([positions[s] for s in ids])
        if len(np.unique(y[ix])) != 2:
            continue
        m = evaluate(y[ix], pred[ix], proba[ix])
        for metric in metrics:
            if np.isfinite(m[metric]):
                metrics[metric].append(m[metric])
    return {f"{k}_{b}": float(np.percentile(v, pct)) if v else float("nan")
            for k, v in metrics.items() for b, pct in (("ci_low", 2.5), ("ci_high", 97.5))}

