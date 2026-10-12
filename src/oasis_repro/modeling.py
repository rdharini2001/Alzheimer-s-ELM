"""Cross-validation pipelines and mutually comparable classical models."""
import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, StratifiedGroupKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from .elm import ExtremeLearningMachine

MODEL_NAMES = ("Dummy", "LR", "kNN", "NB", "SVM", "DT", "RFC", "GB", "ELM")

def make_pipeline(name, seed=42):
    models = {
        "Dummy": DummyClassifier(strategy="prior"),
        "LR": LogisticRegression(max_iter=3000, class_weight="balanced", random_state=seed),
        "kNN": KNeighborsClassifier(n_neighbors=7),
        "NB": GaussianNB(),
        "SVM": SVC(kernel="rbf", C=1.0, probability=True, random_state=seed),
        "DT": DecisionTreeClassifier(max_depth=5, random_state=seed),
        "RFC": RandomForestClassifier(n_estimators=120, max_depth=8, random_state=seed, n_jobs=1),
        "GB": GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, random_state=seed),
        "ELM": ExtremeLearningMachine(n_hidden=64, activation="tanh", alpha=0.01, random_state=seed),
    }
    if name not in models:
        raise ValueError(f"Unknown model {name}")
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("scaler", StandardScaler()),
        ("model", models[name]),
    ])

def folds(cohort, seed=42, n_splits=5):
    y, groups = cohort["y"], cohort["groups"]
    if cohort["split"] == "row":
        splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
        return list(splitter.split(cohort["X"], y))
    if len(np.unique(groups)) == len(groups):
        splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
        return list(splitter.split(cohort["X"], y))
    splitter = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed)
    return list(splitter.split(cohort["X"], y, groups))
