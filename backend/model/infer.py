"""
Inference script — called by Node.js via child_process.
Reads JSON from stdin, writes JSON result to stdout.

Input:  {"features": [f1, f2, ..., f11]}
Output: {"score": 0.87, "predicted_class": "Highly Suitable", "probabilities": {...}}
"""

import sys
import json
import os
import joblib
import numpy as np

MODEL_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(MODEL_DIR, 'ecotourism_model.pkl')
LABELS_PATH = os.path.join(MODEL_DIR, 'class_labels.pkl')

CLASS_NAMES = ['Not Suitable', 'Low Suitability', 'Moderately Suitable', 'Suitable', 'Highly Suitable']

def main():
    try:
        # Read feature vector from stdin
        raw = sys.stdin.read().strip()
        data = json.loads(raw)
        features = np.array(data['features'], dtype=np.float32).reshape(1, -1)

        # Load model
        model = joblib.load(MODEL_PATH)

        # Load class labels if available
        if os.path.exists(LABELS_PATH):
            labels = joblib.load(LABELS_PATH)
        else:
            labels = CLASS_NAMES

        # Predict
        proba      = model.predict_proba(features)[0]
        pred_idx   = int(np.argmax(proba))
        pred_class = labels[pred_idx] if pred_idx < len(labels) else f'Class {pred_idx}'

        # Suitability score: weighted average of class probabilities
        # Class 0 = 0.0, Class 1 = 0.25, Class 2 = 0.50, Class 3 = 0.75, Class 4 = 1.0
        n_classes = len(proba)
        weights   = [i / (n_classes - 1) for i in range(n_classes)]
        score     = float(sum(w * p for w, p in zip(weights, proba)))

        result = {
            'score':           round(score, 4),
            'predicted_class': pred_class,
            'probabilities':   {labels[i]: round(float(p), 4) for i, p in enumerate(proba)},
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
