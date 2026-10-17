# Materials and methods

## Cohort

Data source: OASIS-2 longitudinal demographic and MRI-derived measures. There are 373 sessions across 150 participants; subject-level diagnostic groups are Nondemented (72), Demented (64), Converted (14). The session-group binary target excludes Converted; other target definitions are specified in `src/oasis_repro/data.py`.

## Features and preprocessing

Numerical features are age, years of education (EDUC), socioeconomic status (SES), MMSE, eTIV, nWBV, ASF, visit index and MRI delay. Sex is binary coded from the dataset. Some experiments additionally use CDR. Missing data are imputed by training-set medians and continuous predictors are scaled via a `sklearn.Pipeline`, both learned exclusively on training partitions. The source CSV is not altered.

## ELM algorithm

The hidden representation is `H = activation(X @ W + b)` with randomly initialized and fixed `W` and `b`. For a binary one-hot matrix `T`, output weights are calculated by `beta = pinv(H) @ T` for alpha=0 or ridge-regularized least squares for alpha>0. Prediction scores use softmax. This formulation follows the random-hidden-layer and Moore–Penrose output estimation method described in section 3.5 of the study.

## ELM session holdout

- Cohort: non-converted diagnostic-group records (336 sessions).
- Partition: `StratifiedShuffleSplit(test_size=60, random_state=42)` across sessions.
- Feature selection: 5-step greedy forward selection by mean inner 3-fold ROC AUC on training sessions only.
- Selected predictors: CDR, eTIV, EDUC, MMSE, nWBV.
- Final ELM: 64 hidden units, tanh activation, alpha=0, seed 42.
- Outputs: exact 60-row held-out predictions, class scores, confusion matrix, ROC, feature trace and complete partition manifest.
- Interpretation: 44 subject IDs occur in both train and test. Therefore the result measures session-level performance, not performance on wholly unseen patients.

## Eight-classifier comparison

Models: LR (L2, balanced class weights), 7-neighbor kNN, Gaussian NB, RBF SVM, max-depth-5 decision tree, 120-tree random forest (depth≤8), gradient boosting with 100 estimators and learning rate 0.1, and ELM (64 tanh neurons; ridge alpha 0.01). The repository also includes a dummy-classifier baseline. Full definitions and seeds are in `src/oasis_repro/modeling.py`.

## Validation modes

| Experiment code | Outcome | Unit | CDR feature |
|---|---|---|---|
| `group_subject_no_cdr` | Demented vs Nondemented; Converted excluded | group-disjoint 5-fold CV | No |
| `group_subject_with_cdr` | Demented vs Nondemented; Converted excluded | group-disjoint 5-fold CV | Yes |
| `group_session_with_cdr` | Demented vs Nondemented; Converted excluded | session-stratified 5-fold CV | Yes |
| `baseline_ever` | Demented/Converted vs Nondemented on baseline visit | subject-stratified 5-fold CV | No |
| `visit_cdr_proxy` | Visit CDR>0 vs CDR=0 | group-disjoint 5-fold CV | No |

The nested feature-selection experiment has five outer folds and three inner folds per outer training subset. Five predictors are greedily selected; an eight-option ELM hyperparameter grid is tuned using inner mean ROC AUC. The final outer test predictions are saved separately.

## Performance metrics

Accuracy, sensitivity, specificity, precision, F1, AUC, Brier score and confusion matrix entries are calculated on explicit predictions. Five-fold CV point estimates are computed from pooled out-of-fold predictions. Fixed-prediction participant-cluster bootstrap intervals are used for the ELM.

## Software and evaluation

The complete experiment suite runs with `bash scripts/run_all.sh`. Fixed seeds and recorded split manifests make it possible to check the predictions with `python scripts/verify_results.py`. CDR-inclusive models should be interpreted as incorporating an existing clinical dementia rating rather than as MRI-only diagnostic models. The tabular dataset contains derived volumetric features, not the original scan images.
