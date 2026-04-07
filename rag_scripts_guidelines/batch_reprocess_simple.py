"""
Simple batch reprocessing - no storage upload needed
Just extract text, generate embeddings, insert chunks
"""
import os
import PyPDF2
from openai import OpenAI
from supabase import create_client
from tqdm import tqdm

# Config
SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
OPENAI_KEY = "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"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_KEY)

# Guidelines metadata
GUIDELINES = {
    "brain-gliomas-patient.pdf": ("NCCN Guidelines for Patients: Glioma", "Brain Gliomas"),
    "all-patient.pdf": ("NCCN Guidelines for Patients: Acute Lymphoblastic Leukemia", "ALL"),
    "aml-patient.pdf": ("NCCN Guidelines for Patients: Acute Myeloid Leukemia", "AML"),
    "cervical-patient-guideline.pdf": ("NCCN Guidelines for Patients: Cervical Cancer", "Cervical"),
    "cml-patient.pdf": ("NCCN Guidelines for Patients: Chronic Myeloid Leukemia", "CML"),
    "inflammatory-breast-patient.pdf": ("NCCN Guidelines for Patients: Inflammatory Breast Cancer", "Inflammatory Breast"),
    "lung-metastatic-patient.pdf": ("NCCN Guidelines for Patients: Metastatic Non-Small Cell Lung Cancer", "Lung Metastatic"),
    "melanoma-patient.pdf": ("NCCN Guidelines for Patients: Melanoma", "Melanoma"),
    "myeloma-patient.pdf": ("NCCN Guidelines for Patients: Multiple Myeloma", "Myeloma"),
    "mzl-patient.pdf": ("NCCN Guidelines for Patients: Marginal Zone Lymphomas", "MZL"),
    "neuroendocrine-patient.pdf": ("NCCN Guidelines for Patients: Neuroendocrine Tumors", "Neuroendocrine"),
    "pancreatic-patient.pdf": ("NCCN Guidelines for Patients: Pancreatic Cancer", "Pancreatic"),
    "ped_all_patient.pdf": ("NCCN Guidelines for Patients: Acute Lymphoblastic Leukemia in Children", "Ped ALL"),
    "prostate-advanced-patient.pdf": ("NCCN Guidelines for Patients: Advanced-Stage Prostate Cancer", "Prostate Advanced"),
    "prostate-early-patient.pdf": ("NCCN Guidelines for Patients: Early-Stage Prostate Cancer", "Prostate Early"),
}

def extract_text(pdf_path):
    """Extract all text from PDF"""
    text_parts = []
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n\n".join(text_parts)

def chunk_text(text, chunk_size=1000):
    """Split text into chunks"""
    words = text.split()
    chunks = []
    current_chunk = []
    current_size = 0

    for word in words:
        current_chunk.append(word)
        current_size += len(word) + 1

        if current_size >= chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_size = 0

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def generate_embeddings_batch(texts):
    """Generate embeddings for multiple texts"""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [r.embedding for r in response.data]

def process_guideline(filename):
    """Process one guideline"""
    if filename not in GUIDELINES:
        print(f"⚠️  Skipping {filename} - no metadata")
        return

    title, cancer_type = GUIDELINES[filename]
    pdf_path = f"NCCN_pdf/{filename}"

    print(f"\n{'='*60}")
    print(f"📘 {title}")
    print(f"{'='*60}")

    # 1. Delete old chunks
    print(f"  🗑️  Deleting old chunks...")
    supabase.table('guideline_chunks').delete().eq('guideline_title', title).execute()

    # 2. Extract text
    print(f"  📄 Extracting text...")
    full_text = extract_text(pdf_path)
    print(f"  ✅ Extracted {len(full_text)} characters")

    # 3. Chunk text
    print(f"  ✂️  Chunking...")
    chunks = chunk_text(full_text, 1000)
    print(f"  ✅ Created {len(chunks)} chunks")

    # 4. Generate embeddings (batch of 10)
    print(f"  🔢 Generating embeddings...")
    embeddings = []
    BATCH_SIZE = 10
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i+BATCH_SIZE]
        batch_embeddings = generate_embeddings_batch(batch)
        embeddings.extend(batch_embeddings)
        print(f"    {i+len(batch)}/{len(chunks)}")

    # 5. Insert chunks
    print(f"  💾 Inserting {len(chunks)} chunks...")
    rows = []
    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        rows.append({
            "guideline_title": title,
            "guideline_source": "NCCN",
            "cancer_type": cancer_type,
            "chunk_text": chunk_text,
            "chunk_embedding_vec": embedding,
            "chunk_index": i,
            "content_tier": "tier_1",
            "content_type": "guideline",
            "status": "active",
        })

    supabase.table('guideline_chunks').insert(rows).execute()
    print(f"  ✅ SUCCESS!\n")

def main():
    print("🚀 BATCH REPROCESS 15 NCCN GUIDELINES\n")

    for filename in GUIDELINES.keys():
        try:
            process_guideline(filename)
        except Exception as e:
            print(f"  ❌ FAILED: {e}\n")

    print("\n✅ DONE!")

if __name__ == "__main__":
    main()
