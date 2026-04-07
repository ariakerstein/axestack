
import csv
import json
import os
import requests
from tqdm import tqdm

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
EMBEDDING_MODEL = "claude-3-sonnet-20240229"

INPUT_CSV = "guideline_chunks_upload.csv"
OUTPUT_CSV = "guideline_chunks_with_embeddings.csv"

assert CLAUDE_API_KEY, "❌ Set your CLAUDE_API_KEY in environment variables."

HEADERS = {
    "x-api-key": CLAUDE_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
}

def embed_text(text):
    url = "https://api.anthropic.com/v1/embeddings"
    body = {
        "model": EMBEDDING_MODEL,
        "input": text
    }
    response = requests.post(url, headers=HEADERS, json=body)
    if response.status_code != 200:
        raise Exception(f"API Error {response.status_code}: {response.text}")
    return response.json()["embedding"]

# Load input
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
            embedding = embed_text(text)
            row["chunk_embedding_vec"] = json.dumps(embedding)
        except Exception as e:
            print(f"❌ Error embedding row {row['id'][:8]}...: {e}")
            row["chunk_embedding_vec"] = ""

        writer.writerow(row)

print(f"✅ Finished: Embeddings written to {OUTPUT_CSV}")
