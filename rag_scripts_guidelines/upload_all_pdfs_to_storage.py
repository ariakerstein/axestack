#!/usr/bin/env python3
"""
Upload All PDFs to Supabase Storage
Uploads NCCN guidelines + LEAF webinars and creates guideline records
Date: October 29, 2025
"""

import os
import re
import PyPDF2
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Load environment variables
load_dotenv()

# Initialize clients
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Folders
SCRIPT_DIR = os.path.dirname(__file__)
NCCN_FOLDER = os.path.join(SCRIPT_DIR, 'NCCN_pdf')
WEBINAR_FOLDER = os.path.join(SCRIPT_DIR, 'pdf_webinars')


def extract_webinar_metadata(filename: str) -> dict:
    """Extract metadata from webinar filename"""
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
        'source': 'LEAF Webinars',
        'cancer_type': 'General',
        'content_type': 'webinar',
        'content_tier': 'tier_3',
        'external_url': f"https://www.leafscience.org/webinar-{webinar_num}/" if webinar_num else None
    }


def extract_nccn_metadata(filename: str) -> dict:
    """Extract metadata from NCCN filename"""
    name = filename.replace('.pdf', '').replace('-patient', '').replace('-guideline', '')

    # Map common NCCN filenames to readable titles
    title_map = {
        'brain-gliomas': 'Brain Gliomas',
        'inflammatory-breast': 'Inflammatory Breast Cancer',
        'lung-metastatic': 'Metastatic Lung Cancer',
        'aml': 'Acute Myeloid Leukemia (AML)',
        'myeloma': 'Multiple Myeloma',
        'all': 'Acute Lymphoblastic Leukemia (ALL)',
        'ped_all': 'Pediatric Acute Lymphoblastic Leukemia',
        'mzl': 'Marginal Zone Lymphoma',
        'cervical': 'Cervical Cancer',
        'nhl-follicular': 'Follicular Non-Hodgkin Lymphoma'
    }

    title = title_map.get(name, name.replace('-', ' ').title())

    # Determine cancer type from filename
    cancer_type = 'General'
    if 'brain' in name.lower() or 'glioma' in name.lower():
        cancer_type = 'Brain'
    elif 'breast' in name.lower():
        cancer_type = 'Breast'
    elif 'lung' in name.lower():
        cancer_type = 'Lung'
    elif 'cervical' in name.lower():
        cancer_type = 'Cervical'
    elif 'leukemia' in name.lower() or 'aml' in name.lower() or 'all' in name.lower():
        cancer_type = 'Leukemia'
    elif 'lymphoma' in name.lower() or 'nhl' in name.lower() or 'mzl' in name.lower():
        cancer_type = 'Lymphoma'
    elif 'myeloma' in name.lower():
        cancer_type = 'Myeloma'

    return {
        'title': f"NCCN Patient Guideline: {title}",
        'speaker': None,
        'webinar_number': None,
        'source': 'NCCN',
        'cancer_type': cancer_type,
        'content_type': 'guideline',
        'content_tier': 'tier_1',
        'external_url': 'https://www.nccn.org/patients'
    }


def get_pdf_metadata(pdf_path: str) -> dict:
    """Get PDF page count and file size"""
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            page_count = len(reader.pages)

        file_size = os.path.getsize(pdf_path)

        return {
            'page_count': page_count,
            'file_size': file_size
        }
    except Exception as e:
        print(f"  ⚠️ Could not read PDF metadata: {str(e)}")
        return {
            'page_count': None,
            'file_size': os.path.getsize(pdf_path) if os.path.exists(pdf_path) else None
        }


def upload_pdf_to_storage(pdf_path: str, storage_path: str) -> bool:
    """Upload PDF to Supabase Storage"""
    try:
        with open(pdf_path, 'rb') as f:
            result = supabase.storage.from_('guideline-pdfs').upload(
                storage_path,
                f,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )

        print(f"  ✓ Uploaded to storage: {storage_path}")
        return True

    except Exception as e:
        print(f"  ✗ Upload failed: {str(e)}")
        return False


def create_guideline_record(metadata: dict, pdf_metadata: dict, storage_path: str) -> str:
    """Create guideline record in database"""
    try:
        guideline_data = {
            'title': metadata['title'],
            'source': metadata['source'],
            'cancer_type': metadata['cancer_type'],
            'content_type': metadata['content_type'],
            'content_tier': metadata['content_tier'],
            'file_path': storage_path,
            'file_size': pdf_metadata['file_size'],
            'page_count': pdf_metadata['page_count'],
            'speaker': metadata.get('speaker'),
            'webinar_number': metadata.get('webinar_number'),
            'external_url': metadata.get('external_url')
        }

        result = supabase.table('guidelines').insert(guideline_data).execute()
        guideline_id = result.data[0]['id']

        print(f"  ✓ Created guideline record: {guideline_id}")
        return guideline_id

    except Exception as e:
        print(f"  ✗ Database insert failed: {str(e)}")
        return None


def link_chunks_to_guideline(guideline_id: str, title: str, source: str) -> int:
    """Link existing chunks to guideline"""
    try:
        result = supabase.table('guideline_chunks')\
            .update({'guideline_id': guideline_id})\
            .eq('guideline_title', title)\
            .eq('guideline_source', source)\
            .is_('guideline_id', 'null')\
            .execute()

        count = len(result.data) if result.data else 0
        if count > 0:
            print(f"  ✓ Linked {count} existing chunks to guideline")

        return count

    except Exception as e:
        print(f"  ⚠️ Could not link chunks: {str(e)}")
        return 0


def process_single_pdf(pdf_path: str, is_webinar: bool) -> dict:
    """Process a single PDF - upload and create record"""
    filename = os.path.basename(pdf_path)

    print(f"\n{'='*70}")
    print(f"Processing: {filename[:60]}...")
    print(f"{'='*70}")

    # Extract metadata based on type
    if is_webinar:
        metadata = extract_webinar_metadata(filename)
        storage_folder = 'webinars'
    else:
        metadata = extract_nccn_metadata(filename)
        storage_folder = 'guidelines'

    print(f"  Title: {metadata['title'][:60]}...")
    print(f"  Source: {metadata['source']}")
    print(f"  Cancer Type: {metadata['cancer_type']}")
    print(f"  Content Tier: {metadata['content_tier']}")

    # Get PDF metadata
    pdf_metadata = get_pdf_metadata(pdf_path)
    print(f"  Pages: {pdf_metadata['page_count']}, Size: {pdf_metadata['file_size'] / 1024:.1f} KB")

    # Create storage path
    safe_filename = re.sub(r'[^\w\-.]', '_', filename)
    storage_path = f"{storage_folder}/{safe_filename}"

    # Upload to storage
    upload_success = upload_pdf_to_storage(pdf_path, storage_path)

    if not upload_success:
        return {
            'filename': filename,
            'success': False,
            'error': 'Upload failed'
        }

    # Create guideline record
    guideline_id = create_guideline_record(metadata, pdf_metadata, storage_path)

    if not guideline_id:
        return {
            'filename': filename,
            'success': False,
            'error': 'Database insert failed'
        }

    # Link existing chunks
    chunks_linked = link_chunks_to_guideline(guideline_id, metadata['title'], metadata['source'])

    return {
        'filename': filename,
        'success': True,
        'title': metadata['title'],
        'source': metadata['source'],
        'guideline_id': guideline_id,
        'storage_path': storage_path,
        'chunks_linked': chunks_linked
    }


def main():
    """Main execution"""
    print(f"\n{'#'*70}")
    print(f"# UPLOAD ALL PDFs TO SUPABASE STORAGE")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*70}\n")

    # Check environment
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
        print("❌ Error: Missing environment variables")
        return

    # Get all PDFs
    nccn_pdfs = sorted([
        os.path.join(NCCN_FOLDER, f)
        for f in os.listdir(NCCN_FOLDER)
        if f.endswith('.pdf')
    ])

    webinar_pdfs = sorted([
        os.path.join(WEBINAR_FOLDER, f)
        for f in os.listdir(WEBINAR_FOLDER)
        if f.endswith('.pdf')
    ])

    print(f"Found:")
    print(f"  NCCN PDFs: {len(nccn_pdfs)}")
    print(f"  Webinar PDFs: {len(webinar_pdfs)}")
    print(f"  Total: {len(nccn_pdfs) + len(webinar_pdfs)}\n")

    results = {
        'nccn': [],
        'webinars': []
    }

    # Process NCCN PDFs
    print(f"\n{'#'*70}")
    print(f"# PROCESSING NCCN GUIDELINES ({len(nccn_pdfs)} files)")
    print(f"{'#'*70}")

    for pdf_path in nccn_pdfs:
        result = process_single_pdf(pdf_path, is_webinar=False)
        results['nccn'].append(result)

    # Process Webinar PDFs
    print(f"\n{'#'*70}")
    print(f"# PROCESSING WEBINAR PDFs ({len(webinar_pdfs)} files)")
    print(f"{'#'*70}")

    for pdf_path in webinar_pdfs:
        result = process_single_pdf(pdf_path, is_webinar=True)
        results['webinars'].append(result)

    # Summary
    nccn_success = sum(1 for r in results['nccn'] if r['success'])
    webinar_success = sum(1 for r in results['webinars'] if r['success'])
    total_success = nccn_success + webinar_success
    total_chunks = sum(r.get('chunks_linked', 0) for r in results['nccn'] + results['webinars'])

    print(f"\n{'='*70}")
    print(f"UPLOAD COMPLETE!")
    print(f"{'='*70}")
    print(f"NCCN: {nccn_success}/{len(nccn_pdfs)} successful")
    print(f"Webinars: {webinar_success}/{len(webinar_pdfs)} successful")
    print(f"Total: {total_success}/{len(nccn_pdfs) + len(webinar_pdfs)} successful")
    print(f"Chunks linked: {total_chunks:,}")
    print(f"{'='*70}\n")

    # Save results
    results_file = os.path.join(SCRIPT_DIR, f"pdf_upload_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'nccn_count': len(nccn_pdfs),
            'webinar_count': len(webinar_pdfs),
            'nccn_success': nccn_success,
            'webinar_success': webinar_success,
            'total_chunks_linked': total_chunks,
            'results': results
        }, f, indent=2)

    print(f"✓ Results saved to: {results_file}\n")

    # Verification SQL
    print("Verify in database:")
    print("  SELECT content_type, COUNT(*) FROM guidelines GROUP BY content_type;")
    print("  SELECT COUNT(*) FROM guideline_chunks WHERE guideline_id IS NOT NULL;\n")


if __name__ == "__main__":
    main()
