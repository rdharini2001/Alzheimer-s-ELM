.PHONY: install ingest run holdout nested figures report tests verify
install:
	python -m pip install -e .
ingest:
	python scripts/ingest_xlsx.py data/raw/oasis_longitudinal_demographics.xlsx
run:
	bash scripts/run_all.sh
holdout:
	PYTHONPATH=src python -m oasis_repro.session_holdout
nested:
	PYTHONPATH=src python -m oasis_repro.nested --experiment group_subject_no_cdr
figures:
	PYTHONPATH=src python -m oasis_repro.figures
report:
	PYTHONPATH=src python -m oasis_repro.report
tests:
	PYTHONPATH=src python -m unittest discover -s tests -v
verify:
	PYTHONPATH=src python scripts/verify_results.py
