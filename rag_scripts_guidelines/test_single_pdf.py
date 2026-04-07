"""
Test processing a single PDF (brain-gliomas-patient.pdf) through the RAG pipeline.

This is a cleaned-up version that uses environment variables from .env file.
"""

import os
import re
import uuid
import time
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
import PyPDF2

# Load environment variables from .env file
load_dotenv()

# Get credentials from environment (fallback to hardcoded for this test only)
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://felofmlhqwcdpiyjgstx.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Validate required keys
if not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment")
    print("   Please add it to rag_scripts_guidelines/.env file")
    exit(1)

if not OPENAI_API_KEY:
    print("❌ Error: OPENAI_API_KEY not found in environment")
    print("   Please add it to rag_scripts_guidelines/.env file")
    exit(1)

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# User ID for storage
USER_ID = "8e51c7b0-807f-4587-bdb3-d77811486ec8"

# Test PDF metadata
TEST_PDF = {
    "filename": "brain-gliomas-patient.pdf",
    "title": "NCCN Guidelines for Patients: Brain Gliomas",
    "cancer_type": "Brain Gliomas"
}


def extract_text_with_pypdf2(pdf_path: str) -> tuple[str, dict]:
    """Extract text from PDF using PyPDF2"""
    print(f"  📄 Extracting text with PyPDF2...")
    text_parts = []

    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        page_count = len(reader.pages)
        print(f"  📖 PDF has {page_count} pages")

        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(text)
            if (i + 1) % 10 == 0:
                print(f"     Extracted page {i + 1}/{page_count}...")

    full_text = "\n\n".join(text_parts)
    word_count = len(full_text.split())

    metadata = {
        "full_text": full_text,
        "page_count": page_count,
        "word_count": word_count,
        "char_count": len(full_text)
    }

    print(f"  ✅ Extracted {word_count:,} words ({len(full_text):,} characters)")
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


def process_test_pdf():
    """Process the test PDF end-to-end"""
    print(f"\n{'='*70}")
    print(f"🧪 TEST: Processing {TEST_PDF['filename']}")
    print(f"{'='*70}\n")

    pdf_path = f"NCCN_pdf/{TEST_PDF['filename']}"

    # Check if file exists
    if not Path(pdf_path).exists():
        print(f"❌ Error: {pdf_path} not found")
        return False

    # Step 1: Upload to storage
    try:
        storage_path = upload_pdf_to_storage(pdf_path, TEST_PDF['filename'])
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False

    # Step 2: Extract text
    try:
        full_text, extraction_metadata = extract_text_with_pypdf2(pdf_path)
    except Exception as e:
        print(f"❌ Text extraction failed: {e}")
        return False

    if not full_text or len(full_text) < 100:
        print(f"❌ Extraction failed or text too short")
        return False

    # Step 3: Chunk text
    print(f"\n  ✂️  Chunking text (1000 chars per chunk)...")
    chunks = chunk_text(full_text, chunk_size=1000)
    print(f"  ✅ Created {len(chunks)} chunks")

    # Step 4: Check if this guideline already exists
    print(f"\n  🔍 Checking for existing chunks...")
    existing = supabase.table('guideline_chunks').select('id').eq('guideline_title', TEST_PDF['title']).limit(1).execute()

    if existing.data:
        print(f"  ⚠️  Found existing chunks for '{TEST_PDF['title']}'")
        response = input("  ❓ Delete existing chunks and reprocess? (y/n): ")
        if response.lower() == 'y':
            print(f"  🗑️  Deleting old chunks...")
            supabase.table('guideline_chunks').delete().eq('guideline_title', TEST_PDF['title']).execute()
            print(f"  ✅ Deleted")
        else:
            print(f"  ⏭️  Skipping - keeping existing chunks")
            return True

    # Step 5: Generate embeddings (batch processing)
    print(f"\n  🔢 Generating embeddings with OpenAI...")
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
            print(f"     Generated {i+1}-{min(i+len(batch), len(chunks))}/{len(chunks)}")
        except Exception as e:
            print(f"     ⚠️  Batch {i} failed: {e}")
            # Add None placeholders
            embeddings.extend([None] * len(batch))

    # Step 6: Prepare rows for insertion
    print(f"\n  💾 Preparing database rows...")
    rows = []
    for i, chunk in enumerate(chunks):
        if embeddings[i] is None:
            print(f"     ⚠️  Skipping chunk {i} (no embedding)")
            continue

        row = {
            "id": str(uuid.uuid4()),
            "guideline_title": TEST_PDF['title'],
            "guideline_source": "NCCN",
            "cancer_type": TEST_PDF['cancer_type'],
            "chunk_text": chunk["chunk_text"],
            "chunk_embedding_vec": embeddings[i],
            "chunk_index": chunk["chunk_index"],
            "storage_path": storage_path,
            "url": storage_path,
            "content_tier": "tier_1",
            "content_type": "guideline",
            "status": "active",
            "page_count": extraction_metadata.get("page_count"),
        }
        rows.append(row)

    print(f"  ✅ Prepared {len(rows)} rows")

    # Step 7: Insert into database
    if rows:
        print(f"\n  💾 Inserting into database...")
        try:
            supabase.table('guideline_chunks').insert(rows).execute()
            print(f"  ✅ Successfully inserted {len(rows)} chunks!")
            return True
        except Exception as e:
            print(f"  ❌ Insert failed: {e}")
            return False
    else:
        print(f"  ⚠️  No valid chunks to insert")
        return False


def verify_in_database():
    """Verify the chunks were inserted correctly"""
    print(f"\n{'='*70}")
    print(f"🔍 VERIFICATION: Checking database...")
    print(f"{'='*70}\n")

    # Query for the guideline we just inserted
    result = supabase.table('guideline_chunks').select(
        'id, guideline_title, cancer_type, chunk_index, status, content_tier'
    ).eq('guideline_title', TEST_PDF['title']).execute()

    if result.data:
        print(f"✅ Found {len(result.data)} chunks in database:")
        print(f"   Title: {result.data[0]['guideline_title']}")
        print(f"   Cancer Type: {result.data[0]['cancer_type']}")
        print(f"   Status: {result.data[0]['status']}")
        print(f"   Content Tier: {result.data[0]['content_tier']}")
        print(f"   Total Chunks: {len(result.data)}")

        # Show first few chunk indices
        indices = sorted([r['chunk_index'] for r in result.data if r['chunk_index'] is not None])
        print(f"   Chunk Indices: {indices[:5]}... (showing first 5)")
        return True
    else:
        print(f"❌ No chunks found in database")
        return False


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🧪 RAG PIPELINE TEST - Single PDF Processing")
    print("="*70)

    # Process the PDF
    success = process_test_pdf()

    if success:
        # Verify it worked
        verify_in_database()

        print(f"\n{'='*70}")
        print(f"✅ TEST PASSED!")
        print(f"{'='*70}\n")
        print("Next steps:")
        print("  1. Test search in your app at http://localhost:8081")
        print("  2. Ask a question about brain gliomas")
        print("  3. Check if the RAG retrieves chunks from this guideline")
        print(f"\n  If it works, run: python reprocess_guidelines_2025.py")
        print(f"  to process all {len([f for f in Path('NCCN_pdf').glob('*.pdf')])} PDFs\n")
    else:
        print(f"\n{'='*70}")
        print(f"❌ TEST FAILED")
        print(f"{'='*70}\n")
        print("Check the error messages above.")
        print("If PyPDF2 extraction failed, we'll need to use Option 2 (PDF.js)\n")
