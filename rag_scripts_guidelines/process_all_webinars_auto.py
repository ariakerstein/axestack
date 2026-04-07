#!/usr/bin/env python3
"""
Process ALL Webinar PDFs - Fully Automated
No user prompts - runs all 150 PDFs automatically
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
import json

# Load environment variables
load_dotenv()

# Initialize clients
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Configuration
PDF_FOLDER = os.path.join(os.path.dirname(__file__), 'pdf_webinars')
CHUNK_SIZE = 3000
CHUNK_OVERLAP = 300
BATCH_SIZE = 5
PAUSE_DURATION = 2


def extract_metadata_from_filename(filename: str) -> dict:
    name = filename.replace('.pdf', '')
    webinar_num_match = re.search(r'\[#(\d+)\]', name)
    webinar_num = webinar_num_match.group(1) if webinar_num_match else None
    name = re.sub(r'\[#\d+\]', '', name).strip()
    speaker_match = re.search(r'\((.*?)\)(?!.*\()', name)
    speaker = speaker_match.group(1) if speaker_match else None
    title = re.sub(r'\([^)]*\)$', '', name).strip()
    title = title.replace('"', '').replace('_', ' ').strip()

    return {
        'title': title,
        'speaker': speaker,
        'webinar_number': webinar_num,
        'source': 'CancerPatientLab Webinar',
        'guideline_source': 'CancerPatientLab Webinars'
    }


def extract_text_from_pdf(pdf_path: str) -> tuple:
    text_parts = []

    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            page_count = len(reader.pages)

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

        full_text = "\n\n".join(text_parts)
        word_count = len(full_text.split())

        return full_text, {'page_count': page_count, 'word_count': word_count}
    except Exception as e:
        print(f"  ✗ Error extracting text: {str(e)}")
        return None, None


def create_chunks(text: str) -> list:
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk_text = text[start:end]

        if end < len(text):
            last_period = chunk_text.rfind('.')
            last_newline = chunk_text.rfind('\n')
            boundary = max(last_period, last_newline)

            if boundary > CHUNK_SIZE * 0.8:
                end = start + boundary + 1
                chunk_text = text[start:end]

        chunks.append({
            'chunk_index': chunk_index,
            'chunk_text': chunk_text.strip()
        })

        chunk_index += 1
        start = end - CHUNK_OVERLAP

    return chunks


def generate_embedding(text: str) -> list:
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


def insert_chunks_to_db(chunks: list, file_metadata: dict, pdf_metadata: dict):
    inserted_count = 0
    failed_count = 0

    for chunk in chunks:
        embedding = generate_embedding(chunk['chunk_text'])

        if not embedding:
            failed_count += 1
            continue

        chunk_data = {
            'guideline_title': file_metadata['title'],
            'guideline_source': file_metadata['guideline_source'],
            'cancer_type': 'General',
            'chunk_text': chunk['chunk_text'],
            'chunk_index': chunk['chunk_index'],
            'chunk_embedding_vec': embedding,
            'content_tier': 'tier_3',
            'content_type': 'webinar',
            'section_heading': file_metadata.get('speaker'),
            'url': f"https://www.leafscience.org/webinar-{file_metadata.get('webinar_number', '')}/",
            'status': 'active'
        }

        try:
            result = supabase.table('guideline_chunks').insert(chunk_data).execute()
            inserted_count += 1

            if inserted_count % 10 == 0:
                print(f"    Progress: {inserted_count}/{len(chunks)} chunks")

        except Exception as e:
            print(f"  ✗ Error inserting chunk {chunk['chunk_index']}: {str(e)}")
            failed_count += 1

    return inserted_count, failed_count


def process_single_pdf(pdf_path: str) -> dict:
    filename = os.path.basename(pdf_path)
    print(f"\n{'='*70}")
    print(f"Processing: {filename[:60]}...")
    print(f"{'='*70}")

    start_time = time.time()

    file_metadata = extract_metadata_from_filename(filename)
    print(f"  Title: {file_metadata['title'][:60]}...")
    print(f"  Speaker: {file_metadata['speaker']}")
    print(f"  Webinar #: {file_metadata['webinar_number']}")

    full_text, pdf_metadata = extract_text_from_pdf(pdf_path)

    if not full_text:
        return {
            'filename': filename,
            'success': False,
            'error': 'Failed to extract text',
            'elapsed_time': time.time() - start_time
        }

    print(f"  ✓ Extracted {pdf_metadata['word_count']:,} words from {pdf_metadata['page_count']} pages")

    chunks = create_chunks(full_text)
    print(f"  ✓ Created {len(chunks)} chunks")

    print(f"  Inserting chunks to database...")
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


def main():
    print(f"\n{'#'*70}")
    print(f"# AUTOMATED WEBINAR PDF BATCH PROCESSING")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*70}\n")

    # Check environment
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY]):
        print("❌ Error: Missing environment variables")
        return

    # Get all PDFs
    pdf_files = sorted([
        os.path.join(PDF_FOLDER, f)
        for f in os.listdir(PDF_FOLDER)
        if f.endswith('.pdf')
    ])

    total_pdfs = len(pdf_files)
    print(f"Found {total_pdfs} PDF files\n")
    print(f"Estimated time: {total_pdfs * 30 / 60:.1f} minutes")
    print(f"Estimated chunks: {total_pdfs * 25:,}\n")

    results = []

    for i, pdf_path in enumerate(pdf_files):
        result = process_single_pdf(pdf_path)
        results.append(result)

        # Progress update
        print(f"\n📊 Progress: {i + 1}/{total_pdfs} PDFs ({(i + 1) / total_pdfs * 100:.1f}%)")

        # Pause between batches
        if (i + 1) % BATCH_SIZE == 0 and i + 1 < total_pdfs:
            print(f"⏸  Pausing {PAUSE_DURATION}s...")
            time.sleep(PAUSE_DURATION)

    # Print summary
    successful = [r for r in results if r.get('success')]
    failed = [r for r in results if not r.get('success')]

    total_chunks = sum(r.get('chunks_inserted', 0) for r in successful)
    total_words = sum(r.get('words', 0) for r in successful)
    total_time = sum(r.get('elapsed_time', 0) for r in results)

    print(f"\n{'='*70}")
    print(f"PROCESSING COMPLETE!")
    print(f"{'='*70}")
    print(f"Total PDFs: {len(results)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")
    print(f"Total chunks: {total_chunks:,}")
    print(f"Total words: {total_words:,}")
    print(f"Total time: {total_time / 60:.1f} minutes")
    print(f"{'='*70}\n")

    if failed:
        print("⚠️ Failed PDFs:")
        for r in failed:
            print(f"  - {r['filename']}")

    # Save results
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
            'total_time_minutes': total_time / 60,
            'results': results
        }, f, indent=2)

    print(f"✓ Results saved to: {results_file}\n")
    print("Verify in database:")
    print("  SELECT COUNT(*) FROM guideline_chunks WHERE content_type = 'webinar';\n")


if __name__ == "__main__":
    main()
