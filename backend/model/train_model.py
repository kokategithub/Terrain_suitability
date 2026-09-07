"""
EcoTourism Suitability Model — Training Script
===============================================

Model: Random Forest Classifier (scikit-learn)
Features: 11 bands matching GEE training script exactly
Output: ecotourism_model.pkl (joblib)

HOW TO RUN:
    python backend/model/train_model.py

WHAT IT DOES:
    1. If you have real .tif patches from GEE exports → reads them
    2. If no patches found → generates synthetic training data
       (replace with your real data when available)
    3. Trains RandomForestClassifier
    4. Saves model + scaler to backend/model/
    5. Prints accuracy and feature importance

FEATURE ORDER (must match backend/config/suitability.js FEATURE_NAMES):
    B4, B3, B2, NDVI, Slope, Elevation, WaterDistance, Temperature, Rainfall, SAR_VV, SAR_VH
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# ── Configuration ─────────────────────────────────────────────────────────────
MODEL_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(MODEL_DIR, 'ecotourism_model.pkl')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')
LABELS_PATH = os.path.join(MODEL_DIR, 'class_labels.pkl')

# Feature order — MUST match FEATURE_NAMES in backend/config/suitability.js
FEATURE_NAMES = [
    'B4', 'B3', 'B2', 'NDVI', 'Slope',
    'Elevation', 'WaterDistance', 'Temperature', 'Rainfall',
    'SAR_VV', 'SAR_VH'
]

# Suitability classes
# 0 = Not Suitable, 1 = Low, 2 = Moderate, 3 = Suitable, 4 = Highly Suitable
CLASS_NAMES = ['Not Suitable', 'Low Suitability', 'Moderately Suitable', 'Suitable', 'Highly Suitable']

# ── Try to load real GEE-exported patches ─────────────────────────────────────
def load_real_patches(patches_dir):
    """
    Load .tif or .npy patch files exported from GEE.
    Each patch: 256x256 pixels, 11 bands.
    Label is determined by folder name (Suitable/ or Not_suitable/).
    """
    try:
        import rasterio
    except ImportError:
        print("[train] rasterio not installed — skipping real patch loading.")
        print("[train] Install with: pip install rasterio")
        return None, None

    X, y = [], []
    folders = {
        'Suitable':     4,   # Highly Suitable
        'Not_suitable': 0,   # Not Suitable
        'Moderate':     2,   # Moderately Suitable
    }

    for folder, label in folders.items():
        folder_path = os.path.join(patches_dir, folder)
        if not os.path.exists(folder_path):
            continue
        for fname in os.listdir(folder_path):
            if not fname.endswith('.tif'):
                continue
            fpath = os.path.join(folder_path, fname)
            try:
                with rasterio.open(fpath) as src:
                    data = src.read()  # shape: (11, 256, 256)
                    # Sample center pixel + 8 neighbours for robustness
                    h, w = data.shape[1], data.shape[2]
                    cx, cy = h // 2, w // 2
                    for di in range(-1, 2):
                        for dj in range(-1, 2):
                            pixel = data[:, cx+di, cy+dj]
                            if not np.any(np.isnan(pixel)):
                                X.append(pixel)
                                y.append(label)
            except Exception as e:
                print(f"[train] Skipping {fname}: {e}")

    if len(X) == 0:
        return None, None

    print(f"[train] Loaded {len(X)} samples from real patches.")
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


# ── Generate synthetic training data ─────────────────────────────────────────
def generate_synthetic_data(n_samples=500, random_state=42):
    """
    Generate synthetic training data using domain knowledge about
    ecotourism suitability in India.

    Rules based on:
    - High NDVI (dense vegetation) → more suitable
    - Moderate elevation (500–2500m) → suitable
    - Low slope (< 30°) → suitable
    - Close to water (< 3000m) → suitable
    - Moderate temperature (15–30°C) → suitable
    - High rainfall (1000–3000mm/yr) → suitable

    All values are in the NORMALIZED 0-1 space (matching training script).
    """
    np.random.seed(random_state)
    n = n_samples

    def norm_range(lo, hi, size):
        return np.random.uniform(lo, hi, size).astype(np.float32)

    # ── Class 4: Highly Suitable ──────────────────────────────────────────────
    n4 = n // 5
    hs = {
        'B4':           norm_range(0.02, 0.10, n4),   # low red = dense veg
        'B3':           norm_range(0.04, 0.14, n4),
        'B2':           norm_range(0.02, 0.10, n4),
        'NDVI':         norm_range(0.65, 0.95, n4),   # high NDVI
        'Slope':        norm_range(0.00, 0.25, n4),   # gentle slopes
        'Elevation':    norm_range(0.12, 0.55, n4),   # 500-2200m
        'WaterDistance':norm_range(0.00, 0.25, n4),   # close to water
        'Temperature':  norm_range(0.30, 0.60, n4),   # 15-30°C
        'Rainfall':     norm_range(0.80, 1.00, n4),   # high rainfall
        'SAR_VV':       norm_range(0.60, 0.90, n4),
        'SAR_VH':       norm_range(0.55, 0.85, n4),
    }

    # ── Class 3: Suitable ─────────────────────────────────────────────────────
    n3 = n // 5
    s = {
        'B4':           norm_range(0.05, 0.15, n3),
        'B3':           norm_range(0.06, 0.18, n3),
        'B2':           norm_range(0.04, 0.14, n3),
        'NDVI':         norm_range(0.45, 0.70, n3),
        'Slope':        norm_range(0.05, 0.35, n3),
        'Elevation':    norm_range(0.08, 0.60, n3),
        'WaterDistance':norm_range(0.05, 0.40, n3),
        'Temperature':  norm_range(0.25, 0.70, n3),
        'Rainfall':     norm_range(0.60, 0.95, n3),
        'SAR_VV':       norm_range(0.50, 0.80, n3),
        'SAR_VH':       norm_range(0.45, 0.75, n3),
    }

    # ── Class 2: Moderately Suitable ─────────────────────────────────────────
    n2 = n // 5
    ms = {
        'B4':           norm_range(0.08, 0.22, n2),
        'B3':           norm_range(0.10, 0.25, n2),
        'B2':           norm_range(0.07, 0.20, n2),
        'NDVI':         norm_range(0.25, 0.50, n2),
        'Slope':        norm_range(0.15, 0.50, n2),
        'Elevation':    norm_range(0.05, 0.70, n2),
        'WaterDistance':norm_range(0.20, 0.60, n2),
        'Temperature':  norm_range(0.15, 0.80, n2),
        'Rainfall':     norm_range(0.35, 0.75, n2),
        'SAR_VV':       norm_range(0.35, 0.70, n2),
        'SAR_VH':       norm_range(0.30, 0.65, n2),
    }

    # ── Class 1: Low Suitability ──────────────────────────────────────────────
    n1 = n // 5
    ls = {
        'B4':           norm_range(0.12, 0.35, n1),
        'B3':           norm_range(0.14, 0.38, n1),
        'B2':           norm_range(0.10, 0.30, n1),
        'NDVI':         norm_range(0.08, 0.30, n1),
        'Slope':        norm_range(0.35, 0.70, n1),
        'Elevation':    norm_range(0.00, 0.08, n1),   # very low or very high
        'WaterDistance':norm_range(0.50, 0.85, n1),
        'Temperature':  norm_range(0.00, 0.20, n1),   # too cold
        'Rainfall':     norm_range(0.10, 0.40, n1),
        'SAR_VV':       norm_range(0.20, 0.55, n1),
        'SAR_VH':       norm_range(0.15, 0.50, n1),
    }

    # ── Class 0: Not Suitable ─────────────────────────────────────────────────
    n0 = n - n4 - n3 - n2 - n1
    ns_data = {
        'B4':           norm_range(0.20, 0.50, n0),   # bare/urban
        'B3':           norm_range(0.22, 0.52, n0),
        'B2':           norm_range(0.18, 0.48, n0),
        'NDVI':         norm_range(0.00, 0.15, n0),   # very low NDVI
        'Slope':        norm_range(0.55, 1.00, n0),   # very steep
        'Elevation':    norm_range(0.88, 1.00, n0),   # extreme elevation
        'WaterDistance':norm_range(0.75, 1.00, n0),   # far from water
        'Temperature':  norm_range(0.85, 1.00, n0),   # too hot
        'Rainfall':     norm_range(0.00, 0.15, n0),   # very dry
        'SAR_VV':       norm_range(0.05, 0.35, n0),
        'SAR_VH':       norm_range(0.05, 0.30, n0),
    }

    all_data = {}
    all_labels = np.concatenate([
        np.full(n4, 4), np.full(n3, 3),
        np.full(n2, 2), np.full(n1, 1), np.full(n0, 0)
    ])

    for feat in FEATURE_NAMES:
        all_data[feat] = np.concatenate([
            hs[feat], s[feat], ms[feat], ls[feat], ns_data[feat]
        ])

    X = np.column_stack([all_data[f] for f in FEATURE_NAMES]).astype(np.float32)
    y = all_labels.astype(np.int32)

    # Shuffle
    idx = np.random.permutation(len(y))
    print(f"[train] Generated {len(y)} synthetic samples.")
    print(f"[train] Class distribution: { {CLASS_NAMES[i]: int((y==i).sum()) for i in range(5)} }")
    return X[idx], y[idx]


# ── Main training ─────────────────────────────────────────────────────────────
def train():
    print("=" * 60)
    print("EcoTourism Suitability Model — Training")
    print("=" * 60)

    # 1. Try real patches first
    patches_dir = os.path.join(MODEL_DIR, 'patches')
    X, y = load_real_patches(patches_dir)

    # 2. Fall back to synthetic data
    if X is None:
        print("[train] No real patches found. Using synthetic data.")
        print(f"[train] To use real data: place GEE exports in {patches_dir}/Suitable/ and {patches_dir}/Not_suitable/")
        X, y = generate_synthetic_data(n_samples=1000)

    # 3. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[train] Train: {len(X_train)} | Test: {len(X_test)}")

    # 4. Train Random Forest
    # n_estimators=200: good balance of accuracy vs speed
    # class_weight='balanced': handles imbalanced classes
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )

    print("\n[train] Training Random Forest (200 trees)...")
    model.fit(X_train, y_train)

    # 5. Evaluate
    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\n[train] Test Accuracy: {acc:.4f} ({acc*100:.1f}%)")
    print("\n[train] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    # 6. Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    print(f"[train] 5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # 7. Feature importance
    importance = model.feature_importances_
    print("\n[train] Feature Importance:")
    for name, imp in sorted(zip(FEATURE_NAMES, importance), key=lambda x: -x[1]):
        bar = "█" * int(imp * 40)
        print(f"  {name:15s} {imp:.4f}  {bar}")

    # 8. Save model + metadata
    joblib.dump(model, MODEL_PATH)
    joblib.dump(CLASS_NAMES, LABELS_PATH)
    print(f"\n[train] ✅ Model saved to: {MODEL_PATH}")
    print(f"[train] ✅ Labels saved to: {LABELS_PATH}")

    # 9. Quick prediction test
    test_sample = np.array([[
        0.0776, 0.0873, 0.0613,  # B4, B3, B2 (Koyna Dam values)
        0.8115,                   # NDVI
        0.0818, 0.3478,           # Slope, Elevation
        0.0818, 0.5217,           # WaterDistance, Temperature
        1.0000,                   # Rainfall
        0.7578, 0.6145,           # SAR_VV, SAR_VH
    ]])

    proba   = model.predict_proba(test_sample)[0]
    pred_class = model.predict(test_sample)[0]
    # Suitability score = weighted average of class probabilities
    score   = sum(i/(len(CLASS_NAMES)-1) * p for i, p in enumerate(proba))

    print(f"\n[train] Test prediction (Koyna Dam area):")
    print(f"  Predicted class : {CLASS_NAMES[pred_class]}")
    print(f"  Suitability score: {score:.4f}")
    print(f"  Class probabilities: { {CLASS_NAMES[i]: f'{p:.3f}' for i,p in enumerate(proba)} }")

    print("\n[train] ✅ Training complete! Backend will auto-detect the model.")
    return model


if __name__ == '__main__':
    train()
