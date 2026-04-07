from openai import OpenAI
import os
import csv
import json
from tqdm import tqdm

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

INPUT_CSV = "guideline_chunks_upload.csv"
OUTPUT_CSV = "guideline_chunks_with_embeddings.csv"
EMBEDDING_MODEL = "text-embedding-3-small"

with open(INPUT_CSV, newline="", encoding="utf-8") as infile:
    reader = csv.DictReader(infile)
    rows = list(reader)

fieldnames = reader.fieldnames + ["chunk_embedding_vec"]

with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()

    for row in tqdm(rows, desc="Embedding rows"):
        text = row["chunk_text"]
        if not text or len(text.strip()) < 5:
            row["chunk_embedding_vec"] = ""
            writer.writerow(row)
            continue

        try:
            response = client.embeddings.create(
                input=text,
                model=EMBEDDING_MODEL
            )
            embedding = response.data[0].embedding
            row["chunk_embedding_vec"] = json.dumps(embedding)
        except Exception as e:
            print(f"❌ Error embedding row {row['id'][:8]}: {e}")
            row["chunk_embedding_vec"] = ""

        writer.writerow(row)

print(f"✅ Embeddings written to {OUTPUT_CSV}")
