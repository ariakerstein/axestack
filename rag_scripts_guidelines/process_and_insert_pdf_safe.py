import os
import re
import uuid
import pdfplumber
import numpy as np
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client
import openai
import tiktoken

# Load env vars
load_dotenv()
SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
OPENAI_API_KEY = "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"
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
client = openai.OpenAI(api_key=OPENAI_API_KEY)
tokenizer = tiktoken.get_encoding("cl100k_base")

MAX_TOKENS = 7500

def embed_text(text):
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=[text]
    )
    return response.data[0].embedding

def estimate_tokens(text):
    return len(tokenizer.encode(text))

def extract_pdf_text(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return pages

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

        # token guard
        if estimate_tokens(section_text) > MAX_TOKENS:
            print(f"⚠️  Splitting oversized chunk: {section_title}")
            sub_chunks = section_text.split("\n\n")
            current = []
            token_total = 0
            for para in sub_chunks:
                token_count = estimate_tokens(para)
                if token_total + token_count > MAX_TOKENS:
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "cancer_type": cancer_type,
                        "topic": section_title + " (cont.)",
                        "chunk_text": "\n\n".join(current)
                    })
                    current = []
                    token_total = 0
                current.append(para)
                token_total += token_count
            if current:
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "cancer_type": cancer_type,
                    "topic": section_title + " (final)",
                    "chunk_text": "\n\n".join(current)
                })
        else:
            chunks.append({
                "id": str(uuid.uuid4()),
                "cancer_type": cancer_type,
                "topic": section_title,
                "chunk_text": section_title + "\n\n" + section_text
            })

    return chunks

def topic_exists(cancer_type, topic):
    response = supabase.table("guideline_chunks") \
        .select("id") \
        .eq("cancer_type", cancer_type) \
        .eq("topic", topic) \
        .limit(1) \
        .execute()
    return len(response.data) > 0

def process_pdf_and_insert_safe(pdf_path, cancer_type):
    print(f"📄 Processing: {pdf_path}")
    pages = extract_pdf_text(pdf_path)
    chunks = chunk_by_section(pages, cancer_type)
    print(f"✂️  Found {len(chunks)} chunks.")

    for chunk in tqdm(chunks, desc="Embedding + inserting"):
        if topic_exists(chunk["cancer_type"], chunk["topic"]):
            print(f"⏭ Skipping existing topic: {chunk['topic']}")
            continue
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

