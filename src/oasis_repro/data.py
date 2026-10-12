"""OASIS-2 schema, label definitions, and explicit experimental cohorts.

Every target is defined here. Source 'Group' and 'CDR' must never be silently
used both as outcome proxies and as input features in a primary analysis.
"""
from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path
import numpy as np

SOURCE_FIELDS = ("Subject ID", "MRI ID", "Group", "Visit", "MR Delay", "M/F",
                 "Hand", "Age", "EDUC", "SES", "MMSE", "CDR", "eTIV", "nWBV", "ASF")
COMMON_FEATURES = ("Age", "EDUC", "SES", "MMSE", "eTIV", "nWBV", "ASF", "M/F")
VISIT_FEATURES = COMMON_FEATURES + ("Visit", "MR Delay")
EXPERIMENTS = (
    "baseline_ever", "visit_cdr_proxy", "group_subject_no_cdr",
    "group_subject_with_cdr", "group_session_with_cdr"
)

def read_records(file: str | Path) -> list[dict]:
    with Path(file).open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if tuple(reader.fieldnames or ()) != SOURCE_FIELDS:
            raise ValueError(f"Unexpected schema: {reader.fieldnames}")
        rows = list(reader)
    if not rows:
        raise ValueError("Empty input")
    ids = [(x["Subject ID"], x["MRI ID"]) for x in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicated MRI session identifiers")
    for row in rows:
        if row["Group"] not in {"Demented", "Nondemented", "Converted"}:
            raise ValueError("Invalid group label")
    return rows

def inventory(rows: list[dict]) -> dict:
    subject_groups = defaultdict(set)
    subject_rows = Counter()
    for row in rows:
        subject_groups[row["Subject ID"]].add(row["Group"])
        subject_rows[row["Subject ID"]] += 1
    return {
        "n_sessions": len(rows), "n_subjects": len(subject_groups),
        "session_group_counts": dict(sorted(Counter(r["Group"] for r in rows).items())),
        "subject_group_counts": dict(sorted(Counter(next(iter(v)) for v in subject_groups.values()).items())),
        "session_per_subject": dict(sorted(Counter(subject_rows.values()).items())),
        "missing_by_column": {k: sum(r[k] == "" or r[k] is None for r in rows) for k in SOURCE_FIELDS},
        "group_label_change_within_subject": sum(len(g)>1 for g in subject_groups.values()),
        "nondemented_cdr_positive_sessions": sum(r["Group"] == "Nondemented" and float(r["CDR"]) > 0 for r in rows),
        "converted_cdr_zero_sessions": sum(r["Group"] == "Converted" and float(r["CDR"]) == 0 for r in rows),
    }

def select_experiment(rows: list[dict], name: str):
    if name not in EXPERIMENTS:
        raise ValueError(f"Unknown experiment {name!r}")
    ordered = sorted(rows, key=lambda r: (r["Subject ID"], int(r["Visit"])))
    if name == "baseline_ever":
        # Ever-demented is observed during available follow-up, not at baseline.
        subset = [r for r in ordered if int(r["Visit"]) == 1]
        y = np.array([int(r["Group"] in ("Demented", "Converted")) for r in subset])
        fields = COMMON_FEATURES
        strategy = "subject"
    elif name == "visit_cdr_proxy":
        # Explicitly a CDR>0 surrogate label; not a verified AD diagnosis.
        subset = ordered
        y = np.array([int(float(r["CDR"]) > 0) for r in subset])
        fields = VISIT_FEATURES
        strategy = "subject"
    else:
        subset = [r for r in ordered if r["Group"] != "Converted"]
        y = np.array([int(r["Group"] == "Demented") for r in subset])
        fields = VISIT_FEATURES + (("CDR",) if "with_cdr" in name else ())
        strategy = "row" if name.startswith("group_session_") else "subject"
    if not subset or len(np.unique(y)) != 2:
        raise ValueError("Cohort has fewer than two classes")
    X = np.array([[get_numeric(r, key) for key in fields] for r in subset], dtype=float)
    subjects = np.array([r["Subject ID"] for r in subset])
    sessions = np.array([r["MRI ID"] for r in subset])
    return {"X": X, "y": y, "groups": subjects, "sessions": sessions,
            "fields": list(fields), "split": strategy, "name": name, "n_subjects": len(set(subjects))}

def get_numeric(row: dict, name: str) -> float:
    if name == "M/F":
        return {"M": 1.0, "F": 0.0}[row[name]]
    value = row[name]
    return float(value) if value is not None and value != "" else float("nan")
