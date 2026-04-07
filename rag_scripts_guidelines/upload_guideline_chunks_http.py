
import csv
import json
import os
import requests
from tqdm import tqdm

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
RPC_ENDPOINT = f"{SUPABASE_URL}/rest/v1/rpc/insert_guideline_chunk"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

INPUT_CSV = "guideline_chunks_with_embeddings.csv"

def clean_row(row):
    return {
        "id": row["id"],
        "cancer_type": row["cancer_type"],
        "guideline_source": row["guideline_source"],
        "guideline_title": row["guideline_title"],
        "version_date": row["version_date"],
        "section_heading": row["section_heading"],
        "chunk_index": int(row["chunk_index"]),
        "page_start": int(row["page_start"]),
        "page_end": int(row["page_end"]),
        "chunk_text": row["chunk_text"],
        "token_count": int(row["token_count"]),
        "url": row["url"],
        "chunk_embedding_vec": json.loads(row["chunk_embedding_vec"])
    }

with open(INPUT_CSV, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"📦 Read {len(rows)} rows")

success = 0
failures = 0

for row in tqdm(rows, desc="Uploading"):
    try:
        payload = clean_row(row)
        response = requests.post(RPC_ENDPOINT, headers=HEADERS, json=payload)

        if response.status_code != 200:
            raise Exception(f"{response.status_code}: {response.text}")

        success += 1
    except Exception as e:
        print(f"❌ Error uploading row {row.get('id', '')[:8]}: {e}")
        failures += 1

print(f"✅ Upload complete: {success} succeeded, {failures} failed.")
