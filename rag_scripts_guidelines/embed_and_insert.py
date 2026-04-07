import json
from uuid import uuid4
from supabase import create_client
from tqdm import tqdm
from openai import OpenAI

# === CONFIG ===
SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
OPENAI_API_KEY = "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"
CHUNKS_PATH = "nccn_all_chunks.json"

# === CLIENT SETUP ===
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# === EMBED FUNCTION ===
def embed_text(text):
    # Truncate to ~7500 tokens (safe margin under 8192) → ~25,000 characters
    safe_text = text[:25000]
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=[safe_text]
    )
    return response.data[0].embedding

# === MAIN EXECUTION ===
with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"Loaded {len(chunks)} chunks.")

for chunk in tqdm(chunks[:3], desc="Embedding + inserting (testing with 3)"):  # Limit to 3 for now
    try:
        embedding = embed_text(chunk["chunk_text"])
        row = {     
             "id": str(uuid4()),
             "cancer_type": chunk["cancer_type"],
             "topic": chunk["topic"],
             "page_start": chunk["page_start"],
             "page_end": chunk["page_end"],
             "chunk_text": chunk["chunk_text"],
             "chunk_embedding_vec": embedding  # ❌ replace this
        }
        supabase.table("guideline_chunks").insert(row).execute()
    except Exception as e:
        print(f"❌ Error on chunk '{chunk['topic']}': {e}")

print("✅ Done. Check your Supabase table!")

