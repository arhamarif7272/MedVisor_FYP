from google import genai
from google.genai import types
from backend.config import settings
import json
import time

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def triage_symptoms(symptoms_text: str) -> str:
    """Uses LLM to read symptoms and decide which model to use."""
    prompt = f"""
    You are a medical triage AI. Read the following patient symptoms:
    "{symptoms_text}"
    
    Your task is to route this patient to the correct machine learning model.
    Available models: 'diabetes', 'parkinsons', 'brain_tumor', 'breast_cancer', 'alzheimers', 'general'.
    
    Rules:
    1. If the symptoms strongly match one of the 5 specific diseases, return that disease name.
    2. If the symptoms are general (e.g., fever, cough, flu, normal pain), return 'general'.
    
    Return ONLY the exact string of the disease type. Do not write any markdown, punctuation, or extra text.
    """
    
    # 🔴 RETRY LOGIC TO HANDLE 503 ERRORS 🔴
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=prompt,
            )
            result = response.text.strip().lower().replace("'", "").replace('"', '')
            
            valid_models = ['diabetes', 'parkinsons', 'brain_tumor', 'breast_cancer', 'alzheimers', 'general']
            for model in valid_models:
                if model in result:
                    return model
            return "general"
            
        except Exception as e:
            print(f"Triage Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2) # Wait 2 seconds before trying again
            else:
                print("All triage attempts failed. Defaulting to 'general'.")
                return "general" # Fallback if API is completely down

def generate_medical_report(patient_symptoms: str, disease_type: str, prediction: dict, rag_context: list[dict]) -> str:
    """Combines predictions + RAG context into a Gemini prompt."""
    context_str = "\n".join([f"- {c['chunk_text']}" for c in rag_context])
    if not context_str:
        context_str = "No specific medical guidelines found in database."

    if disease_type == "general":
        prompt = f"""
        You are an expert AI medical assistant acting as a General Practitioner.
        Write a structured preliminary health summary based on the patient's symptoms and retrieved medical guidelines.
        
        **Patient Symptoms:**
        {patient_symptoms}
        
        **Relevant Medical Guidelines (Retrieved Context):**
        {context_str}
        
        **Instructions:**
        1. Summarize the findings.
        2. Suggest 2-3 possible common conditions (e.g., Flu, Viral Infection).
        3. Provide 3-4 actionable next steps (e.g., rest, hydration, see a doctor).
        4. End with a bold disclaimer: "This is an AI-generated preliminary summary and NOT a confirmed medical diagnosis."
        
        Use Markdown formatting.
        """
    else:
        prompt = f"""
        You are an expert AI medical assistant. Write a structured, preliminary clinical report.
        
        **Patient Symptoms:**
        {patient_symptoms}
        
        **AI Model Prediction ({disease_type}):**
        - Result: {prediction.get('result', 'N/A')}
        - Confidence: {prediction.get('confidence', 'N/A')}%
        
        **Relevant Medical Guidelines (Retrieved Context):**
        {context_str}
        
        **Instructions:**
        1. Start with a clear "Summary" of the findings.
        2. Explain the AI prediction in simple terms.
        3. Reference the retrieved medical guidelines if relevant.
        4. Provide 3-4 actionable next steps.
        5. End with a bold disclaimer: "This is an AI-generated preliminary report and NOT a confirmed medical diagnosis."
        
        Use Markdown formatting.
        """
    
    for attempt in range(max_retries := 3):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=prompt
            )
            return response.text
        except Exception as e:
            print(f"Report Generation Attempt {attempt + 1} failed: {e}")
            if attempt < 2:
                time.sleep(2)
            else:
                return "⚠️ Failed to generate report due to an AI service error (503)."