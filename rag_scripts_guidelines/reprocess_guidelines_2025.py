"""
Re-process NCCN Guidelines with modern schema (2025)
- Upload PDFs to Supabase Storage (get storage_path)
- Extract text with Claude Sonnet 4.5
- Generate embeddings with OpenAI
- Insert chunks with full metadata (guideline_title, guideline_source, storage_path, etc.)
"""

import os
import re
import uuid
import json
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
from anthropic import Anthropic
from tqdm import tqdm
import PyPDF2

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://felofmlhqwcdpiyjgstx.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)

# User ID for storage (replace with actual caregiver user ID if needed)
USER_ID = "8e51c7b0-807f-4587-bdb3-d77811486ec8"

# Mapping filename → (guideline_title, cancer_type)
GUIDELINE_METADATA = {
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


def upload_pdf_to_storage(pdf_path: str, filename: str) -> str:
    """Upload PDF to Supabase Storage and return storage_path"""
    print(f"  📤 Uploading {filename} to storage...")

    # Read PDF file
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    # Generate storage path: user_id/timestamp_filename
    timestamp = int(time.time() * 1000)
    storage_path = f"{USER_ID}/{timestamp}_{filename}"

    # Upload to medical-documents bucket
    try:
        result = supabase.storage.from_('medical-documents').upload(
            storage_path,
            pdf_bytes,
            file_options={"content-type": "application/pdf"}
        )
        print(f"  ✅ Uploaded to: {storage_path}")
        return storage_path
    except Exception as e:
        print(f"  ⚠️  Upload error (may already exist): {e}")
        return storage_path  # Return path anyway, might already exist


def extract_text_with_claude(pdf_path: str) -> tuple[str, dict]:
    """Extract text from PDF using PyPDF2 (fast and reliable)"""
    print(f"  📄 Extracting text with PyPDF2...")
    return extract_text_fallback(pdf_path)


def extract_text_fallback(pdf_path: str) -> tuple[str, dict]:
    """Fallback: extract text using PyPDF2"""
    print(f"  📄 Using PyPDF2 fallback extraction...")
    text_parts = []

    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        page_count = len(reader.pages)

        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)

    full_text = "\n\n".join(text_parts)
    metadata = {
        "full_text": full_text,
        "publication_date": None,
        "version": None,
        "page_count": page_count
    }

    return full_text, metadata


def chunk_text(full_text: str, chunk_size: int = 1000) -> list[dict]:
    """Split text into chunks of ~chunk_size characters"""
    # Split by paragraphs first
    paragraphs = re.split(r'\n\s*\n', full_text)

    chunks = []
    current_chunk = ""
    current_index = 0

    for para in paragraphs:
        if len(current_chunk) + len(para) < chunk_size:
            current_chunk += para + "\n\n"
        else:
            if current_chunk:
                chunks.append({
                    "chunk_text": current_chunk.strip(),
                    "chunk_index": current_index
                })
                current_index += 1
            current_chunk = para + "\n\n"

    # Add last chunk
    if current_chunk:
        chunks.append({
            "chunk_text": current_chunk.strip(),
            "chunk_index": current_index
        })

    return chunks


def generate_embedding(text: str) -> list[float]:
    """Generate OpenAI embedding"""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"    ⚠️  Embedding error: {e}")
        return None


def process_guideline(pdf_path: str, filename: str):
    """Process a single guideline PDF end-to-end"""
    print(f"\n{'='*60}")
    print(f"📘 Processing: {filename}")
    print(f"{'='*60}")

    # Get metadata
    if filename not in GUIDELINE_METADATA:
        print(f"  ⚠️  Skipping {filename} - no metadata mapping")
        return

    guideline_title, cancer_type = GUIDELINE_METADATA[filename]

    # Step 1: Upload to storage
    storage_path = upload_pdf_to_storage(pdf_path, filename)

    # Step 2: Extract text
    full_text, extraction_metadata = extract_text_with_claude(pdf_path)

    if not full_text or len(full_text) < 100:
        print(f"  ❌ Extraction failed or text too short")
        return

    print(f"  ✅ Extracted {len(full_text)} characters")

    # Step 3: Chunk text
    chunks = chunk_text(full_text, chunk_size=1000)
    print(f"  ✂️  Created {len(chunks)} chunks")

    # Step 4: Delete old chunks for this guideline
    print(f"  🗑️  Deleting old chunks for '{guideline_title}'...")
    supabase.table('guideline_chunks').delete().eq('guideline_title', guideline_title).execute()

    # Step 5: Generate embeddings and insert
    print(f"  🔢 Generating embeddings and inserting...")

    # Batch embeddings (10 at a time)
    BATCH_SIZE = 10
    embeddings = []

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i+BATCH_SIZE]
        batch_texts = [c["chunk_text"] for c in batch]

        try:
            response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=batch_texts
            )
            batch_embeddings = [r.embedding for r in response.data]
            embeddings.extend(batch_embeddings)
            print(f"    Generated embeddings {i+1}-{min(i+len(batch), len(chunks))}/{len(chunks)}")
        except Exception as e:
            print(f"    ⚠️  Batch {i} failed: {e}")
            # Add None placeholders
            embeddings.extend([None] * len(batch))

    # Prepare rows for insertion
    rows = []
    for i, chunk in enumerate(chunks):
        if embeddings[i] is None:
            continue  # Skip chunks with failed embeddings

        row = {
            "id": str(uuid.uuid4()),
            "guideline_title": guideline_title,
            "guideline_source": "NCCN",
            "cancer_type": cancer_type,
            "chunk_text": chunk["chunk_text"],
            "chunk_embedding_vec": embeddings[i],
            "chunk_index": chunk["chunk_index"],
            "storage_path": storage_path,
            "url": storage_path,  # Also set url for backward compat
            "content_tier": "tier_1",
            "content_type": "guideline",
            "status": "active",
            "publication_date": extraction_metadata.get("publication_date"),
            "page_count": extraction_metadata.get("page_count"),
            "version_date": extraction_metadata.get("version"),
        }
        rows.append(row)

    # Batch insert
    if rows:
        print(f"  💾 Inserting {len(rows)} chunks...")
        try:
            supabase.table('guideline_chunks').insert(rows).execute()
            print(f"  ✅ Successfully inserted {len(rows)} chunks!")
        except Exception as e:
            print(f"  ❌ Insert failed: {e}")
    else:
        print(f"  ⚠️  No valid chunks to insert")


def main():
    """Process all NCCN PDFs"""
    pdf_dir = Path("NCCN_pdf")

    if not pdf_dir.exists():
        print(f"❌ Directory {pdf_dir} not found")
        return

    # Get all PDFs that we have metadata for
    pdfs_to_process = [
        (pdf_dir / filename, filename)
        for filename in GUIDELINE_METADATA.keys()
        if (pdf_dir / filename).exists()
    ]

    print(f"📚 Found {len(pdfs_to_process)} guidelines to process\n")

    for pdf_path, filename in pdfs_to_process:
        try:
            process_guideline(str(pdf_path), filename)
        except Exception as e:
            print(f"❌ Fatal error processing {filename}: {e}")
            continue

    print(f"\n{'='*60}")
    print(f"✅ DONE! Processed {len(pdfs_to_process)} guidelines")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
