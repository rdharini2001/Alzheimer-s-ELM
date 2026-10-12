"""Single-hidden-layer Extreme Learning Machine (ELM) for binary classification.

Random hidden-layer parameters are fixed; output weights use Moore-Penrose
pseudo-inverse or regularized least-squares; softmax converts scores to probabilities.
Hidden width, activation, random seed, and regularization are configurable.
"""
from __future__ import annotations
import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.utils.validation import check_array, check_is_fitted

class ExtremeLearningMachine(ClassifierMixin, BaseEstimator):
    def __init__(self, n_hidden=64, activation="tanh", alpha=0.0, random_state=42):
        self.n_hidden = n_hidden
        self.activation = activation
        self.alpha = alpha
        self.random_state = random_state

    def _hidden(self, X):
        z = X @ self.input_weights_ + self.bias_
        if self.activation == "tanh":
            return np.tanh(z)
        if self.activation == "relu":
            return np.maximum(0.0, z)
        if self.activation == "sigmoid":
            return 1.0 / (1.0 + np.exp(-np.clip(z, -50, 50)))
        raise ValueError(f"Unknown activation: {self.activation}")

    def fit(self, X, y):
        X = check_array(X, dtype=float, ensure_all_finite=True)
        y = np.asarray(y).ravel()
        self.classes_ = np.unique(y)
        if len(self.classes_) != 2:
            raise ValueError("This implementation requires exactly two labels")
        if self.n_hidden < 1 or self.alpha < 0:
            raise ValueError("n_hidden must be positive and alpha non-negative")
        rng = np.random.default_rng(self.random_state)
        self.input_weights_ = rng.normal(0.0, 1.0 / np.sqrt(X.shape[1]),
                                         size=(X.shape[1], self.n_hidden))
        self.bias_ = rng.normal(size=self.n_hidden)
        H = np.column_stack([np.ones(len(X)), self._hidden(X)])
        Y = np.column_stack([y == c for c in self.classes_]).astype(float)
        if self.alpha == 0:
            self.output_weights_ = np.linalg.pinv(H) @ Y
        else:
            # Primal/dual ridge depending on dimensions; do not penalize bias.
            reg = np.eye(H.shape[1]) * self.alpha
            reg[0, 0] = 0.0
            self.output_weights_ = np.linalg.solve(H.T @ H + reg, H.T @ Y)
        self.n_features_in_ = X.shape[1]
        return self

    def decision_function(self, X):
        check_is_fitted(self, "output_weights_")
        X = check_array(X, dtype=float, ensure_all_finite=True)
        return np.column_stack([np.ones(len(X)), self._hidden(X)]) @ self.output_weights_

    def predict_proba(self, X):
        scores = self.decision_function(X)
        scores = scores - scores.max(axis=1, keepdims=True)
        exp = np.exp(scores)
        return exp / exp.sum(axis=1, keepdims=True)

    def predict(self, X):
        return self.classes_[np.argmax(self.predict_proba(X), axis=1)]
