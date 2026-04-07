import os
import re
import uuid
import json
import pdfplumber
import numpy as np
from openai import OpenAI
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client
import openai

# Load env vars
load_dotenv()
SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
OPENAI_API_KEY = "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"

openai.api_key = OPENAI_API_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# --- Embedding ---
client = openai.OpenAI(api_key=OPENAI_API_KEY)

def embed_text(text):
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=[text]
    )
    return response.data[0].embedding

# --- PDF to full text with pages ---
def extract_pdf_text(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return pages

# --- Chunk by section headers ---
def chunk_by_section(pages, cancer_type):
    full_text = "\n".join(pages)
    section_pattern = re.compile(r"^(About|Testing for|Treating|Phases of|Managing|Making|Words to know|NCCN Contributors|Index)[^\n]+", re.MULTILINE)
    matches = list(section_pattern.finditer(full_text))

    chunks = []
    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        section_title = match.group().strip()
        section_text = full_text[start:end].strip()

        chunks.append({
            "id": str(uuid.uuid4()),
            "cancer_type": cancer_type,
            "topic": section_title,
            "chunk_text": section_title + "\n\n" + section_text
        })
    return chunks

# --- Main pipeline ---
# --- Main pipeline ---
def process_pdf_and_insert(pdf_path, cancer_type):
    print(f"📄 Processing: {pdf_path}")
    pages = extract_pdf_text(pdf_path)
    chunks = chunk_by_section(pages, cancer_type)
    print(f"✂️  Found {len(chunks)} chunks.")

    for chunk in tqdm(chunks, desc="Embedding + inserting"):
        try:
            embedding = embed_text(chunk["chunk_text"])
            row = {
                "id": chunk["id"],
                "cancer_type": chunk["cancer_type"],
                "topic": chunk["topic"],
                "chunk_text": chunk["chunk_text"],
                "chunk_embedding_vec": embedding
            }
            supabase.table("guideline_chunks").insert(row).execute()
        except Exception as e:
            print(f"❌ Failed on {chunk['topic']}: {e}")

    print("✅ Done.")

# --- Run it ---
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python process_and_insert_pdf.py path_to_pdf cancer_type")
    else:
        process_pdf_and_insert(sys.argv[1], sys.argv[2])
