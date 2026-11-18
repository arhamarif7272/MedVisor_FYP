import os
os.environ["TF_USE_LEGACY_KERAS"] = "1" 

import pickle
import numpy as np
from PIL import Image
import io
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.layers import GlobalAveragePooling2D, BatchNormalization, Dropout, Dense
from tensorflow.keras.models import Model

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BACKEND_DIR, "saved_models")

_models = {}

def load_h5_weights_fallback(filepath, num_classes=1):
    try:
        base_model = EfficientNetB3(weights=None, include_top=False, input_shape=(300, 300, 3))
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = BatchNormalization()(x)
        x = Dropout(0.4)(x)
        outputs = Dense(num_classes, activation='sigmoid')(x)
        model = Model(inputs=base_model.input, outputs=outputs)
        model.load_weights(filepath)
        return model
    except Exception as e:
        print(f"Fallback loader failed: {e}")
        return None

def load_all_models():
    global _models
    print("⏳ Loading ML models...")
    
    try:
        with open(os.path.join(MODELS_DIR, "diabetes_model.sav"), "rb") as f:
            _models['diabetes'] = pickle.load(f)
        with open(os.path.join(MODELS_DIR, "parkinson_model.sav"), "rb") as f:
            _models['parkinsons'] = pickle.load(f)
        with open(os.path.join(MODELS_DIR, "parkinson_scaler.sav"), "rb") as f:
            _models['parkinsons_scaler'] = pickle.load(f)
        print("✅ Tabular models loaded")
    except Exception as e:
        print(f"❌ Error loading tabular models: {e}")

    try:
        try:
            _models['brain_tumor'] = tf.keras.models.load_model(
                os.path.join(MODELS_DIR, "brain_tumor_vgg_finetune.h5"), compile=False
            )
        except Exception:
            print("⚠️ Using fallback loader for brain_tumor...")
            _models['brain_tumor'] = load_h5_weights_fallback(
                os.path.join(MODELS_DIR, "brain_tumor_vgg_finetune.h5"), num_classes=4
            )

        try:
            _models['breast_cancer'] = tf.keras.models.load_model(
                os.path.join(MODELS_DIR, "arham_breast_cancer_model.keras"), compile=False
            )
        except Exception:
            print("⚠️ Using fallback loader for breast_cancer...")
            _models['breast_cancer'] = load_h5_weights_fallback(
                os.path.join(MODELS_DIR, "arham_breast_cancer_model.keras"), num_classes=1
            )

        try:
            _models['alzheimers'] = tf.keras.models.load_model(
                os.path.join(MODELS_DIR, "arham_Alzheimers_model.keras"), compile=False
            )
        except Exception:
            print("⚠️ Using fallback loader for alzheimers...")
            _models['alzheimers'] = load_h5_weights_fallback(
                os.path.join(MODELS_DIR, "arham_Alzheimers_model.keras"), num_classes=4
            )
            
        print("✅ Image models loaded")
    except Exception as e:
        print(f"❌ Error loading image models: {e}")

load_all_models()


# ─────────────────────────────────────────────────────────────
# PREDICTION FUNCTIONS
# ─────────────────────────────────────────────────────────────

def predict_diabetes(features: list) -> dict:
    if 'diabetes' not in _models: return {"error": "Model not loaded"}
    arr = np.array(features).reshape(1, -1)
    model = _models['diabetes']
    pred = model.predict(arr)[0]
    prob = model.predict_proba(arr)[0][1] if hasattr(model, "predict_proba") else (1.0 if pred == 1 else 0.0)
    label = "Diabetic" if pred == 1 else "Not Diabetic"
    return {"result": label, "confidence": round(float(prob) * 100, 2), "positive": bool(pred == 1)}

def predict_parkinsons(features: list) -> dict:
    if 'parkinsons' not in _models: return {"error": "Model not loaded"}
    arr = np.array(features).reshape(1, -1)
    if 'parkinsons_scaler' in _models:
        arr = _models['parkinsons_scaler'].transform(arr)
    model = _models['parkinsons']
    pred = model.predict(arr)[0]
    prob = model.predict_proba(arr)[0][1] if hasattr(model, "predict_proba") else (1.0 if pred == 1 else 0.0)
    label = "Parkinson's Detected" if pred == 1 else "Healthy"
    return {"result": label, "confidence": round(float(prob) * 100, 2), "positive": bool(pred == 1)}

def predict_image(image_bytes: bytes, disease: str) -> dict:
    if disease not in _models or _models[disease] is None: 
        return {"error": f"{disease} model not loaded"}
    
    model = _models[disease]
    
    img_size = model.input_shape[1] if len(model.input_shape) >= 2 else 224
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_arr = np.array(img.resize((img_size, img_size))) / 255.0
    arr = img_arr.reshape(1, img_size, img_size, 3)
    
    preds = model.predict(arr)[0]
    class_idx = int(np.argmax(preds))
    confidence = float(preds[class_idx]) * 100
    
    if disease == 'brain_tumor':
        classes = ['Glioma Tumor', 'Meningioma Tumor', 'No Tumor', 'Pituitary Tumor']
    elif disease == 'alzheimers':
        classes = ['Mild Demented', 'Moderate Demented', 'Non Demented', 'Very Mild Demented']
    else:
        classes = ['Benign', 'Malignant']
        
    label = classes[class_idx]
    is_positive = "No Tumor" not in label and "Non Demented" not in label and "Benign" not in label
    
    return {"result": label, "confidence": round(confidence, 2), "positive": is_positive}