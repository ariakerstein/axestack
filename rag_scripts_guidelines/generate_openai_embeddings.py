
import csv
import json
import os
import openai
from tqdm import tqdm

openai.api_key = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"

INPUT_CSV = "guideline_chunks_upload.csv"
OUTPUT_CSV = "guideline_chunks_with_embeddings.csv"

# Load input CSV
with open(INPUT_CSV, newline="", encoding="utf-8") as infile:
    reader = csv.DictReader(infile)
    rows = list(reader)

fieldnames = reader.fieldnames + ["chunk_embedding_vec"]

# Write output with embeddings
with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()

    for row in tqdm(rows, desc="Embedding chunks"):
        text = row["chunk_text"]
        try:
            response = openai.Embedding.create(
                input=text,
                model=EMBEDDING_MODEL
            )
            embedding = response["data"][0]["embedding"]
            row["chunk_embedding_vec"] = json.dumps(embedding)
        except Exception as e:
            print(f"❌ Error embedding row {row['id'][:8]}...: {e}")
            row["chunk_embedding_vec"] = ""

        writer.writerow(row)

print(f"✅ Finished: Embeddings written to {OUTPUT_CSV}")
