#!/usr/bin/env python3
"""
Test Script - Process ONE Webinar PDF
Validates the processing pipeline before batch run
Date: October 29, 2025
"""

import os
import re
import PyPDF2
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
PDF_FOLDER = os.path.join(os.path.dirname(__file__), 'pdf_webinars')
CHUNK_SIZE = 3000
CHUNK_OVERLAP = 300


def extract_metadata_from_filename(filename: str) -> dict:
    """Extract metadata from webinar filename"""
    name = filename.replace('.pdf', '')

    # Extract webinar number [#123]
    webinar_num_match = re.search(r'\[#(\d+)\]', name)
    webinar_num = webinar_num_match.group(1) if webinar_num_match else None

    # Remove webinar number
    name = re.sub(r'\[#\d+\]', '', name).strip()

    # Extract speaker (last parentheses)
    speaker_match = re.search(r'\((.*?)\)(?!.*\()', name)
    speaker = speaker_match.group(1) if speaker_match else None

    # Get title (remove speaker)
    title = re.sub(r'\([^)]*\)$', '', name).strip()
    title = title.replace('"', '').replace('_', ' ').strip()

    return {
        'title': title,
        'speaker': speaker,
        'webinar_number': webinar_num,
        'source': 'LEAF Webinar',
        'guideline_source': 'LEAF Webinars'
    }


def extract_text_from_pdf(pdf_path: str):
    """Extract text from PDF"""
    print(f"Extracting text...")

    text_parts = []

    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        page_count = len(reader.pages)

        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)

    full_text = "\n\n".join(text_parts)
    word_count = len(full_text.split())

    print(f"✓ Extracted {word_count:,} words from {page_count} pages")

    return full_text, {'page_count': page_count, 'word_count': word_count}


def create_chunks(text: str):
    """Split text into chunks"""
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk_text = text[start:end]

        # Try to end at sentence boundary
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


def generate_embedding(text: str):
    """Generate embedding"""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        dimensions=1536
    )
    return response.data[0].embedding


def insert_chunks(chunks: list, file_metadata: dict, pdf_metadata: dict):
    """Insert chunks to database"""
    print(f"\nInserting {len(chunks)} chunks to database...")

    inserted = 0

    for chunk in chunks:
        embedding = generate_embedding(chunk['chunk_text'])

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
            'status': 'active',
            'metadata': {
                'speaker': file_metadata.get('speaker'),
                'webinar_number': file_metadata.get('webinar_number'),
                'total_pages': pdf_metadata.get('page_count'),
                'total_words': pdf_metadata.get('word_count')
            }
        }

        result = supabase.table('guideline_chunks').insert(chunk_data).execute()
        inserted += 1

        if inserted % 5 == 0:
            print(f"  Progress: {inserted}/{len(chunks)} chunks")

    print(f"✓ Inserted {inserted} chunks")
    return inserted


def main():
    print(f"\n{'='*70}")
    print(f"TEST SINGLE WEBINAR PDF")
    print(f"{'='*70}\n")

    # Check environment
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY]):
        print("❌ Error: Missing environment variables in .env file")
        return

    # Get first PDF
    pdf_files = sorted([
        f for f in os.listdir(PDF_FOLDER)
        if f.endswith('.pdf')
    ])

    if not pdf_files:
        print(f"❌ No PDFs found in {PDF_FOLDER}")
        return

    # Use first PDF
    test_pdf = pdf_files[0]
    pdf_path = os.path.join(PDF_FOLDER, test_pdf)

    print(f"Testing with: {test_pdf}\n")

    # Extract metadata
    file_metadata = extract_metadata_from_filename(test_pdf)
    print(f"Title: {file_metadata['title']}")
    print(f"Speaker: {file_metadata['speaker']}")
    print(f"Webinar #: {file_metadata['webinar_number']}\n")

    # Extract text
    full_text, pdf_metadata = extract_text_from_pdf(pdf_path)

    # Create chunks
    print(f"\nCreating chunks...")
    chunks = create_chunks(full_text)
    print(f"✓ Created {len(chunks)} chunks")

    # Show sample chunk
    print(f"\nSample chunk (first 200 chars):")
    print(f"  {chunks[0]['chunk_text'][:200]}...")

    # Ask to continue
    response = input(f"\nInsert {len(chunks)} chunks to database? (y/n): ").strip().lower()

    if response != 'y':
        print("Cancelled.")
        return

    # Insert chunks
    inserted = insert_chunks(chunks, file_metadata, pdf_metadata)

    print(f"\n{'='*70}")
    print(f"TEST COMPLETE!")
    print(f"{'='*70}")
    print(f"✓ Processed 1 PDF")
    print(f"✓ Inserted {inserted} chunks")
    print(f"\nVerify in database:")
    print(f"  SELECT * FROM guideline_chunks")
    print(f"  WHERE guideline_title = '{file_metadata['title'][:50]}...'")
    print(f"  ORDER BY chunk_index;")
    print(f"\nIf successful, run: python3 process_webinar_pdfs.py")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
