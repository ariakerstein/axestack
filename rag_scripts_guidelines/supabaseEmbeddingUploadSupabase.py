import csv
import json
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

INPUT_CSV = "guideline_chunks_with_embeddings.csv"

with open(INPUT_CSV, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if not row["chunk_embedding_vec"]:
            print(f"⚠️ Skipping row {row['id'][:8]} — missing embedding")
            continue

        try:
            # Convert embedding from JSON string to float array
            embedding = json.loads(row["chunk_embedding_vec"])
            row["chunk_embedding_vec"] = embedding

            # Insert or update into Supabase
            supabase.table("guideline_chunks").upsert(row).execute()
        except Exception as e:
            print(f"❌ Error uploading row {row['id'][:8]}: {e}")
