#!/usr/bin/env python3
"""
Process Webinar PDFs for RAG System
Batch processes all PDFs in pdf_webinars folder
Date: October 29, 2025
"""

import os
import re
import time
import PyPDF2
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize clients
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Configuration
PDF_FOLDER = os.path.join(os.path.dirname(__file__), 'pdf_webinars_upload')
CHUNK_SIZE = 3000  # Characters per chunk
CHUNK_OVERLAP = 300  # Overlap between chunks
BATCH_SIZE = 5  # Process 5 PDFs at a time before pausing
PAUSE_DURATION = 2  # Seconds to pause between batches


def extract_metadata_from_filename(filename: str) -> dict:
    """
    Extract metadata from webinar filename
    Format: "Title" (Speaker) [#123].pdf
    """
    # Remove .pdf extension
    name = filename.replace('.pdf', '')

    # Extract webinar number [#123]
    webinar_num_match = re.search(r'\[#(\d+)\]', name)
    webinar_num = webinar_num_match.group(1) if webinar_num_match else None

    # Remove webinar number from name
    name = re.sub(r'\[#\d+\]', '', name).strip()

    # Extract speaker (text in parentheses)
    speaker_match = re.search(r'\((.*?)\)(?!.*\()', name)  # Last parentheses
    speaker = speaker_match.group(1) if speaker_match else None

    # Remove speaker from name to get title
    title = re.sub(r'\([^)]*\)$', '', name).strip()

    # Clean up quotes and underscores
    title = title.replace('"', '').replace('_', ' ').strip()

    return {
        'title': title,
        'speaker': speaker,
        'webinar_number': webinar_num,
        'source': 'CancerPatientLab Webinar',
        'guideline_source': 'CancerPatientLab Webinars'
    }


def extract_text_from_pdf(pdf_path: str) -> tuple[str, dict]:
    """
    Extract text from PDF using PyPDF2
    Returns: (full_text, metadata_dict)
    """
    print(f"  Extracting text from PDF...")

    text_parts = []
    metadata = {
        'page_count': 0,
        'word_count': 0,
        'char_count': 0
    }

    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            metadata['page_count'] = len(reader.pages)

            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    text_parts.append(text)

        full_text = "\n\n".join(text_parts)
        metadata['word_count'] = len(full_text.split())
        metadata['char_count'] = len(full_text)

        print(f"  ✓ Extracted {metadata['word_count']:,} words from {metadata['page_count']} pages")
        return full_text, metadata

    except Exception as e:
        print(f"  ✗ Error extracting text: {str(e)}")
        return None, None


def create_chunks(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """
    Split text into overlapping chunks
    """
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size
        chunk_text = text[start:end]

        # Try to end at a sentence boundary
        if end < len(text):
            last_period = chunk_text.rfind('.')
            last_newline = chunk_text.rfind('\n')
            boundary = max(last_period, last_newline)

            if boundary > chunk_size * 0.8:  # Only if we're not cutting too much
                end = start + boundary + 1
                chunk_text = text[start:end]

        chunks.append({
            'chunk_index': chunk_index,
            'chunk_text': chunk_text.strip(),
            'start_char': start,
            'end_char': end
        })

        chunk_index += 1
        start = end - overlap

    return chunks


def generate_embedding(text: str) -> list[float]:
    """
    Generate OpenAI embedding for text
    """
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
            dimensions=1536
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"  ✗ Error generating embedding: {str(e)}")
        return None


def insert_chunks_to_db(chunks: list[dict], file_metadata: dict, pdf_metadata: dict):
    """
    Insert chunks into guideline_chunks table
    """
    print(f"  Inserting {len(chunks)} chunks to database...")

    inserted_count = 0
    failed_count = 0

    for chunk in chunks:
        # Generate embedding
        embedding = generate_embedding(chunk['chunk_text'])

        if not embedding:
            failed_count += 1
            continue

        # Prepare chunk data
        chunk_data = {
            'guideline_title': file_metadata['title'],
            'guideline_source': file_metadata['guideline_source'],
            'cancer_type': 'General',  # Webinars cover multiple cancer types
            'chunk_text': chunk['chunk_text'],
            'chunk_index': chunk['chunk_index'],
            'chunk_embedding_vec': embedding,
            'content_tier': 'tier_3',  # Community content (webinars)
            'content_type': 'webinar',
            'page_start': None,  # Could estimate from char position if needed
            'page_end': None,
            'section_heading': file_metadata.get('speaker'),
            'url': f"https://www.leafscience.org/webinar-{file_metadata.get('webinar_number', '')}/",
            'status': 'active'
        }

        try:
            result = supabase.table('guideline_chunks').insert(chunk_data).execute()
            inserted_count += 1

            # Progress indicator
            if inserted_count % 10 == 0:
                print(f"    Progress: {inserted_count}/{len(chunks)} chunks")

        except Exception as e:
            print(f"  ✗ Error inserting chunk {chunk['chunk_index']}: {str(e)}")
            failed_count += 1

    print(f"  ✓ Inserted {inserted_count} chunks ({failed_count} failed)")
    return inserted_count, failed_count


def process_single_pdf(pdf_path: str) -> dict:
    """
    Process a single PDF file
    """
    filename = os.path.basename(pdf_path)
    print(f"\n{'='*70}")
    print(f"Processing: {filename[:60]}...")
    print(f"{'='*70}")

    start_time = time.time()

    # Extract metadata from filename
    file_metadata = extract_metadata_from_filename(filename)
    print(f"  Title: {file_metadata['title'][:60]}...")
    print(f"  Speaker: {file_metadata['speaker']}")
    print(f"  Webinar #: {file_metadata['webinar_number']}")

    # Extract text from PDF
    full_text, pdf_metadata = extract_text_from_pdf(pdf_path)

    if not full_text:
        return {
            'filename': filename,
            'success': False,
            'error': 'Failed to extract text',
            'elapsed_time': time.time() - start_time
        }

    # Create chunks
    print(f"  Creating chunks...")
    chunks = create_chunks(full_text)
    print(f"  ✓ Created {len(chunks)} chunks")

    # Insert to database
    inserted, failed = insert_chunks_to_db(chunks, file_metadata, pdf_metadata)

    elapsed_time = time.time() - start_time

    result = {
        'filename': filename,
        'success': True,
        'title': file_metadata['title'],
        'speaker': file_metadata['speaker'],
        'webinar_number': file_metadata['webinar_number'],
        'pages': pdf_metadata['page_count'],
        'words': pdf_metadata['word_count'],
        'chunks_created': len(chunks),
        'chunks_inserted': inserted,
        'chunks_failed': failed,
        'elapsed_time': elapsed_time
    }

    print(f"  ✓ Completed in {elapsed_time:.1f}s")
    return result


def process_all_webinars(resume_from: int = 0):
    """
    Process all webinar PDFs in the folder
    """
    # Get all PDF files
    pdf_files = sorted([
        os.path.join(PDF_FOLDER, f)
        for f in os.listdir(PDF_FOLDER)
        if f.endswith('.pdf')
    ])

    total_pdfs = len(pdf_files)

    if resume_from > 0:
        pdf_files = pdf_files[resume_from:]
        print(f"\n▶ Resuming from PDF #{resume_from + 1}")

    print(f"\n{'#'*70}")
    print(f"# BATCH PROCESSING WEBINAR PDFs")
    print(f"# Total PDFs: {total_pdfs}")
    print(f"# Processing: {len(pdf_files)} PDFs")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*70}\n")

    results = []

    for i, pdf_path in enumerate(pdf_files, start=resume_from):
        result = process_single_pdf(pdf_path)
        results.append(result)

        # Pause between batches
        if (i + 1) % BATCH_SIZE == 0 and i + 1 < total_pdfs:
            print(f"\n⏸ Pausing for {PAUSE_DURATION}s (batch complete: {i + 1}/{total_pdfs})")
            time.sleep(PAUSE_DURATION)

    return results


def print_summary(results: list[dict]):
    """
    Print summary of processing
    """
    successful = [r for r in results if r.get('success')]
    failed = [r for r in results if not r.get('success')]

    total_chunks = sum(r.get('chunks_inserted', 0) for r in successful)
    total_words = sum(r.get('words', 0) for r in successful)
    total_time = sum(r.get('elapsed_time', 0) for r in results)

    print(f"\n{'='*70}")
    print(f"PROCESSING SUMMARY")
    print(f"{'='*70}")
    print(f"Total PDFs processed: {len(results)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")
    print(f"\nContent Statistics:")
    print(f"  Total chunks created: {total_chunks:,}")
    print(f"  Total words extracted: {total_words:,}")
    print(f"  Average chunks per PDF: {total_chunks / len(successful):.1f}")
    print(f"\nTime Statistics:")
    print(f"  Total time: {total_time / 60:.1f} minutes")
    print(f"  Average per PDF: {total_time / len(results):.1f} seconds")
    print(f"{'='*70}\n")

    if failed:
        print(f"⚠️ Failed PDFs:")
        for r in failed:
            print(f"  - {r['filename']}")
            print(f"    Error: {r.get('error', 'Unknown')}")

    # Save results to JSON
    import json
    results_file = os.path.join(
        os.path.dirname(__file__),
        f"webinar_processing_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )

    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_pdfs': len(results),
            'successful': len(successful),
            'failed': len(failed),
            'total_chunks': total_chunks,
            'total_words': total_words,
            'results': results
        }, f, indent=2)

    print(f"✓ Results saved to: {results_file}\n")


def main(auto_run: bool = False, resume_from: int = 0):
    """
    Main execution
    """
    # Check environment variables
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY]):
        print("❌ Error: Missing environment variables")
        print("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY")
        print("Check your .env file")
        return

    # Check if PDF folder exists
    if not os.path.exists(PDF_FOLDER):
        print(f"❌ Error: PDF folder not found: {PDF_FOLDER}")
        return

    # Get PDF count
    pdf_count = len([f for f in os.listdir(PDF_FOLDER) if f.endswith('.pdf')])

    if pdf_count == 0:
        print(f"❌ Error: No PDF files found in {PDF_FOLDER}")
        return

    print(f"\nFound {pdf_count} PDF files in {PDF_FOLDER}")
    print(f"\nThis will process all webinar PDFs and insert chunks into the database.")
    print(f"Estimated time: {pdf_count * 30 / 60:.1f} minutes (30s per PDF)")
    print(f"Estimated chunks: {pdf_count * 25:,} (25 avg per PDF)")

    if not auto_run:
        response = input(f"\nContinue? (y/n): ").strip().lower()

        if response != 'y':
            print("Cancelled.")
            return

        # Ask if resuming
        resume = input("\nResume from a specific PDF number? (0 for start, or PDF number): ").strip()
        resume_from = int(resume) if resume.isdigit() else 0

    # Process all PDFs
    results = process_all_webinars(resume_from=resume_from)

    # Print summary
    print_summary(results)

    print("✓ Batch processing complete!")
    print("\nNext steps:")
    print("1. Verify chunks in database:")
    print("   SELECT guideline_title, COUNT(*) as chunks")
    print("   FROM guideline_chunks")
    print("   WHERE content_type = 'webinar'")
    print("   GROUP BY guideline_title;")
    print("\n2. Test retrieval with semantic search")
    print("3. Run automated tests to validate")


if __name__ == "__main__":
    import sys
    auto_run = '--auto' in sys.argv
    resume = 0
    for arg in sys.argv:
        if arg.startswith('--resume='):
            resume = int(arg.split('=')[1])
    main(auto_run=auto_run, resume_from=resume)
