import json
from backend.predict import predict_diabetes, predict_parkinsons, predict_image
from backend.rag import retrieve_context
from backend.llm import triage_symptoms, generate_medical_report
from backend.supabase_client import supabase_admin

def run_full_pipeline(
    patient_id: str,
    document_id: str,
    patient_symptoms: str,
    input_data: list | bytes = None,
    force_disease: str = None
) -> dict:
    """
    Agentic + Hybrid Pipeline.
    """
    
    # 1. Agentic Triage (LLM decides which model to use)
    if force_disease:
        disease_type = force_disease
    else:
        disease_type = triage_symptoms(patient_symptoms)

    # 2. Hybrid Routing
    image_diseases = ["brain_tumor", "alzheimers", "breast_cancer"]
    
    # Check if an image is required but missing
    if disease_type in image_diseases and not input_data:
        return {
            "action_required": "upload_image",
            "message": f"The AI suspects a condition requiring a medical scan ({disease_type}). Please upload the MRI/Image to proceed.",
            "disease_type": disease_type
        }

    # 3. Run ML Model (Only if applicable)
    prediction = {}
    if disease_type in ["diabetes", "parkinsons"]:
        if not input_data:
            return {"error": f"Numerical features required for {disease_type}."}
        
        if disease_type == "diabetes":
            prediction = predict_diabetes(input_data)
        else:
            prediction = predict_parkinsons(input_data)
            
    elif disease_type in image_diseases:
        prediction = predict_image(input_data, disease_type)
        
    elif disease_type == "general":
        # Skip ML model completely for general symptoms
        prediction = {"result": "General Symptom Check", "confidence": 100.0}

    # 4. Retrieve RAG Context (Medical History + Guidelines)
    search_query = f"{disease_type} {patient_symptoms}"
    rag_context = retrieve_context(patient_id, search_query, match_threshold=0.3, match_count=4)

    # 5. Generate Report via Gemini LLM
    report_markdown = generate_medical_report(
        patient_symptoms, 
        disease_type, 
        prediction, 
        rag_context
    )

    # 6. Save to Database
    db_record = {
        "patient_id": patient_id,
        "document_id": document_id,
        "disease_type": disease_type,
        "prediction_result": prediction.get("result"),
        "confidence": prediction.get("confidence"),
        "markdown_report": report_markdown,
        "sources": json.dumps(rag_context)
    }
    
    try:
        res = supabase_admin.table("reports").insert(db_record).execute()
        saved_report_id = res.data[0]["id"] if res.data else None
    except Exception as e:
        print(f"Failed to save report to DB: {e}")
        saved_report_id = None

    return {
        "prediction": prediction,
        "report_markdown": report_markdown,
        "saved_report_id": saved_report_id
    }