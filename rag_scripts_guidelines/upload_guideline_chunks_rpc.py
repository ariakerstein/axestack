import csv, json, os, requests
from tqdm import tqdm

# ▸ Set these two env vars before running, or hard-code them here
SUPABASE_URL  = os.getenv("SUPABASE_URL")            # e.g. "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # service-role key, not anon

RPC_ENDPOINT  = f"{SUPABASE_URL}/rest/v1/rpc/insert_guideline_chunk"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
    # (no Content-Type header; requests adds it automatically)
}

INPUT_CSV = "guideline_chunks_with_embeddings.csv"   # adjust path if needed

def clean_row(row: dict) -> dict:
    """Convert CSV row → payload dict expected by the RPC."""
    return {
        "id":               row["id"],
        "cancer_type":      row["cancer_type"],
        "guideline_source": row["guideline_source"],
        "guideline_title":  row["guideline_title"],
        "version_date":     row["version_date"],
        "section_heading":  row["section_heading"],
        "chunk_index":      int(row["chunk_index"]),
        "page_start":       int(row["page_start"]),
        "page_end":         int(row["page_end"]),
        "chunk_text":       row["chunk_text"],
        "token_count":      int(row["token_count"]),
        "url":              row["url"],
        "chunk_embedding_vec": json.loads(row["chunk_embedding_vec"])
    }

with open(INPUT_CSV, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows   = list(reader)

print(f"📦 Read {len(rows)} rows")

ok, fail = 0, 0
for row in tqdm(rows, desc="Uploading"):
    try:
        r = requests.post(RPC_ENDPOINT, headers=HEADERS, json=clean_row(row))
        if r.status_code != 200:
            raise RuntimeError(f"{r.status_code}: {r.text[:120]}")
        ok += 1
    except Exception as e:
        print(f"❌ Row {row['id'][:8]} → {e}")
        fail += 1

print(f
