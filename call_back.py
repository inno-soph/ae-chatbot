import requests
BACKEND_RAG_URL = 'http://127.0.0.1:8000/api/rag/query'

def call_backend(question: str, lang_code: str, num_answers: int = 5):
    """
    Calls the FastAPI /rag/query endpoint and returns the 'result' string.
    """
    payload = {
       "question": question,
       "lang": lang_code,      # "en" or "ch"
       "num_results": int(num_answers),
       "score_threshold": None
    }
 
    try:
       resp = requests.post(BACKEND_RAG_URL, json=payload, timeout=60)
       resp.raise_for_status()
       data = resp.json()
       return data.get("result", "(no result field in response)")
    except requests.RequestException as e:
       return f"⚠️ Backend error: {e}"

