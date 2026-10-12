#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"
# Source workbook is preserved; only regenerate a missing derived CSV.
if [ ! -s data/processed/oasis_longitudinal.csv ]; then
    python scripts/ingest_xlsx.py data/raw/oasis_longitudinal_demographics.xlsx
fi
python -m oasis_repro.runner --root . --data data/processed/oasis_longitudinal.csv "$@"
python -m oasis_repro.nested --root . --experiment baseline_ever
python -m oasis_repro.nested --root . --experiment group_subject_no_cdr
python -m oasis_repro.sensitivity
python -m oasis_repro.session_holdout --root .
python -m oasis_repro.figures --root .
python -m oasis_repro.report
python -m unittest discover -s tests -v
python scripts/verify_results.py
