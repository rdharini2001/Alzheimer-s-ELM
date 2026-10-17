# Model card: OASIS-2 tabular extreme learning machine

**Task.** Classify dementia-related group labels from OASIS-2 longitudinal clinical and MRI-derived volumetric measurements. The implementation uses a fixed-random-feature, single-hidden-layer ELM with an analytic linear output solve.

**Data.** OASIS-2 longitudinal demographic table (150 participants; 373 sessions). Features include eTIV, nWBV, ASF, MMSE, education, age, and socioeconomic status. Select experiments also incorporate CDR and visit-related fields.

**Training.** Randomized hidden weights remain fixed. Output weights are solved using Moore–Penrose least squares or a ridge-regularized variant. Pipelines fit imputation and standardization using training data only. Random seeds and settings are in `docs/METHODS.md` and the runnable source code.

**Evaluation.** `elm_session_holdout` uses a 60-session holdout; 44 participants appear in both train and test and its result should be interpreted as session-level accuracy. A separate grouped cross-validation track estimates predictions for participants not in the corresponding training folds. Nested CV evaluates forward selection and ELM hyperparameter tuning on outer held-out participant groups.

**Performance.** All metrics for each task and validation design are saved in `docs/RESULTS.md` and `results/tables/model_comparison.csv`. Outputs include confusion matrices and per-session probabilities. CDR-inclusive accuracy is not equivalent to MRI-only identification.

**Limitations.** Small cohort, incomplete variables, correlated longitudinal sessions, diagnostic grouping labels, and no independent external dataset. The provided table contains derived imaging measures rather than MRI scans.

**Intended use.** Research, method comparison, education, and method evaluation only. Not suitable for clinical diagnostic, prognostic, or treatment decisions.
