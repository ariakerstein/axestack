#!/usr/bin/env python3
"""
Upload all webinar PDFs to Supabase Storage
This uploads the original PDFs that were chunked but never stored
Date: November 25, 2025
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Configuration
PDF_FOLDER = '/Users/ariakerstein/Dropbox/2025build/insight-guide-query/rag_scripts_guidelines/pdf_webinars_upload'
BUCKET_NAME = 'guideline-pdfs'
STORAGE_PATH_PREFIX = 'webinars/'


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for Supabase Storage (remove ALL special characters)
    Only allow alphanumeric, dash, and dot
    """
    import re
    # Keep only alphanumeric, dash, dot, and space (we'll convert space to dash)
    sanitized = re.sub(r'[^\w\s.\-]', '', filename)
    # Replace spaces and underscores with dashes
    sanitized = sanitized.replace(' ', '-').replace('_', '-')
    # Remove multiple consecutive dashes
    sanitized = re.sub(r'-+', '-', sanitized)
    # Remove leading/trailing dashes
    sanitized = sanitized.strip('-')
    return sanitized


def upload_pdf_to_storage(pdf_path: str, filename: str, max_retries: int = 3) -> dict:
    """
    Upload a single PDF to Supabase Storage with retry logic
    """
    import time
    sanitized_name = sanitize_filename(filename)
    storage_path = f"{STORAGE_PATH_PREFIX}{sanitized_name}"

    print(f"  Uploading: {filename[:60]}...")

    # Read PDF file once
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()

    for attempt in range(max_retries):
        try:
            # Upload to Supabase Storage
            result = supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=pdf_data,
                file_options={
                    "content-type": "application/pdf",
                    "upsert": "true"  # Overwrite if exists
                }
            )

            # Construct public URL
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"

            print(f"  ✓ Uploaded successfully")
            print(f"    URL: {public_url}")

            return {
                'filename': filename,
                'success': True,
                'storage_path': storage_path,
                'public_url': public_url,
                'size_bytes': len(pdf_data)
            }

        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # 2, 4, 6 seconds
                print(f"  ⚠ Attempt {attempt + 1} failed, retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"  ✗ Upload failed after {max_retries} attempts: {str(e)}")
                return {
                    'filename': filename,
                    'success': False,
                    'error': str(e)
                }


def upload_all_webinars():
    """
    Upload all webinar PDFs from the folder
    """
    # Get all PDF files
    pdf_files = sorted([
        f for f in os.listdir(PDF_FOLDER)
        if f.endswith('.pdf')
    ])

    total_pdfs = len(pdf_files)

    print(f"\n{'='*70}")
    print(f"UPLOADING WEBINAR PDFs TO SUPABASE STORAGE")
    print(f"{'='*70}")
    print(f"Source folder: {PDF_FOLDER}")
    print(f"Destination: {BUCKET_NAME}/{STORAGE_PATH_PREFIX}")
    print(f"Total PDFs: {total_pdfs}")
    print(f"{'='*70}\n")

    results = []

    for i, filename in enumerate(pdf_files, 1):
        print(f"\n[{i}/{total_pdfs}] {filename[:60]}...")

        pdf_path = os.path.join(PDF_FOLDER, filename)
        result = upload_pdf_to_storage(pdf_path, filename)
        results.append(result)

    # Summary
    successful = sum(1 for r in results if r['success'])
    failed = total_pdfs - successful

    print(f"\n{'='*70}")
    print(f"UPLOAD COMPLETE")
    print(f"{'='*70}")
    print(f"Total: {total_pdfs}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"{'='*70}\n")

    if failed > 0:
        print("Failed uploads:")
        for r in results:
            if not r['success']:
                print(f"  ✗ {r['filename']}: {r.get('error', 'Unknown error')}")

    return results


if __name__ == '__main__':
    results = upload_all_webinars()

    # Save results
    import json
    from datetime import datetime

    output_file = f"upload_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_file}")
