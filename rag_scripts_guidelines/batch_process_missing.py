#!/usr/bin/env python3
"""
Batch process missing webinars into guideline_chunks
"""
import os
import re
import glob
import PyPDF2
import json
import time
from supabase import create_client
from openai import OpenAI

# Config
SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ"
OPENAI_API_KEY = "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"

PDF_FOLDER = "/Users/ariakerstein/Dropbox/2025build/insight-guide-query/rag_scripts_guidelines/pdf_webinars"
CHUNK_SIZE = 3000
CHUNK_OVERLAP = 300

# Missing webinar numbers (from our analysis)
MISSING_NUMS = [1, 2, 6, 12, 13, 16, 23, 32, 36, 39, 43, 51, 55, 58, 59, 61, 62, 63, 65, 66, 67, 70, 73, 76, 78, 80, 81, 82, 83, 84, 85, 87, 89, 91, 93, 95, 97, 98, 100, 102, 104, 106, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 123, 124, 126, 127, 128, 131, 134, 137, 138, 140, 141, 144, 148, 150, 152, 154, 155, 156, 158, 159, 161, 162, 163, 165, 5, 9, 28, 50, 142]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

def extract_metadata(filename):
    name = filename.replace('.pdf', '')
    webinar_num_match = re.search(r'\[#(\d+)\]', name)
    webinar_num = webinar_num_match.group(1) if webinar_num_match else None
    name = re.sub(r'\[#\d+\]', '', name).strip()
    speaker_match = re.search(r'\(([^)]+)\)[^(]*$', name)
    speaker = speaker_match.group(1) if speaker_match else None
    title = re.sub(r'\([^)]*\)[^(]*$', '', name).strip()
    title = title.replace('"', '').replace('_', ' ').strip()
    return {'title': title, 'speaker': speaker, 'webinar_num': webinar_num}

def chunk_text(text, size, overlap):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
    return chunks

def process_pdf(pdf_path):
    filename = os.path.basename(pdf_path)
    meta = extract_metadata(filename)

    print(f"\n[#{meta['webinar_num']}] {meta['title'][:50]}...")

    # Extract text
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            pages = len(reader.pages)
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            full_text = '\n\n'.join(text_parts)
            words = len(full_text.split())
    except Exception as e:
        print(f"  ERROR reading PDF: {e}")
        return 0

    if not full_text.strip():
        print(f"  SKIP: No text extracted")
        return 0

    print(f"  Pages: {pages}, Words: {words:,}")

    # Create chunks
    chunks = chunk_text(full_text, CHUNK_SIZE, CHUNK_OVERLAP)
    print(f"  Chunks: {len(chunks)}")

    # Insert chunks
    success = 0
    for i, chunk in enumerate(chunks):
        try:
            # Get embedding
            response = openai_client.embeddings.create(
                model='text-embedding-3-small',
                input=chunk
            )
            embedding = response.data[0].embedding

            # Insert
            data = {
                'guideline_title': meta['title'],
                'guideline_source': 'CancerPatientLab Webinars',
                'cancer_type': 'General',
                'chunk_text': chunk,
                'content_tier': 'tier_3',
                'chunk_embedding_vec': embedding,
                'chunk_index': i,
                'word_count': len(chunk.split()),
                'page_count': pages,
                'author': meta['speaker'],
                'status': 'active',
                'tags': [f"webinar_{meta['webinar_num']}", 'patient_experience']
            }

            supabase.table('guideline_chunks').insert(data).execute()
            success += 1
        except Exception as e:
            print(f"  ERROR on chunk {i}: {e}")
            continue

    print(f"  ✓ Inserted {success}/{len(chunks)} chunks")
    return success

def main():
    print("=" * 60)
    print("BATCH PROCESSING MISSING WEBINARS")
    print("=" * 60)

    # Find PDFs for missing webinars
    all_pdfs = glob.glob(f"{PDF_FOLDER}/*.pdf")
    pdfs_to_process = []

    for pdf in all_pdfs:
        match = re.search(r'\[#(\d+)\]', pdf)
        if match and int(match.group(1)) in MISSING_NUMS:
            pdfs_to_process.append(pdf)

    print(f"\nFound {len(pdfs_to_process)} PDFs to process\n")

    total_chunks = 0
    processed = 0

    for i, pdf in enumerate(pdfs_to_process):
        print(f"\n[{i+1}/{len(pdfs_to_process)}]", end="")
        chunks = process_pdf(pdf)
        total_chunks += chunks
        if chunks > 0:
            processed += 1

        # Small delay to avoid rate limits
        time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"COMPLETE: {processed}/{len(pdfs_to_process)} webinars processed")
    print(f"Total chunks created: {total_chunks}")
    print("=" * 60)

if __name__ == "__main__":
    main()
