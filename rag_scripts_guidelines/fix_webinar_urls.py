#!/usr/bin/env python3
"""
Fix webinar URLs to point to Supabase Storage instead of leafscience.org
"""
import os
import re
from dotenv import load_dotenv
from supabase import create_client

# Load env
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def sanitize_filename(filename):
    """Same sanitization as upload script"""
    sanitized = re.sub(r'[^\w\s.\-]', '', filename)
    sanitized = sanitized.replace(' ', '-').replace('_', '-')
    sanitized = re.sub(r'-+', '-', sanitized)
    sanitized = sanitized.strip('-')
    return sanitized

def main():
    # Get ALL files in storage (handle pagination)
    print("=== Getting files from Supabase Storage ===")
    storage_files = []
    offset = 0
    limit = 1000
    while True:
        files = supabase.storage.from_('guideline-pdfs').list('webinars/', {'limit': limit, 'offset': offset})
        if not files:
            break
        storage_files.extend(files)
        print(f"  Fetched {len(files)} files (total: {len(storage_files)})")
        if len(files) < limit:
            break
        offset += limit
    print(f"Found {len(storage_files)} files in webinars/ folder")

    # Build mapping of sanitized filename -> full URL
    file_map = {}
    for f in storage_files:
        filename = f['name']
        # The storage path is webinars/filename
        storage_url = f"{SUPABASE_URL}/storage/v1/object/public/guideline-pdfs/webinars/{filename}"
        file_map[filename.lower()] = storage_url

    print(f"\nSample storage URLs:")
    for i, (name, url) in enumerate(list(file_map.items())[:3]):
        print(f"  {name[:50]}... -> {url[:80]}...")

    # Get ALL unique webinar titles from database (handle pagination)
    print("\n=== Getting webinar chunks from database ===")
    chunks = []
    offset = 0
    limit = 1000
    while True:
        result = supabase.table('guideline_chunks').select('id, guideline_title, url').eq('content_type', 'webinar').range(offset, offset + limit - 1).execute()
        if not result.data:
            break
        chunks.extend(result.data)
        print(f"  Fetched {len(result.data)} chunks (total: {len(chunks)})")
        if len(result.data) < limit:
            break
        offset += limit
    print(f"Found {len(chunks)} webinar chunks")

    # Get unique titles
    unique_titles = {}
    for chunk in chunks:
        title = chunk['guideline_title']
        if title not in unique_titles:
            unique_titles[title] = []
        unique_titles[title].append(chunk['id'])

    print(f"Found {len(unique_titles)} unique webinar titles")

    # Match titles to storage files
    print("\n=== Matching titles to storage files ===")
    updates = []
    not_matched = []

    for title, chunk_ids in unique_titles.items():
        # Try to find matching file
        # Strategy: sanitize title and look for match
        sanitized = sanitize_filename(title.replace('"', '').replace("'", ''))
        sanitized_lower = sanitized.lower() + '.pdf'

        matched_url = None

        # Try exact match
        if sanitized_lower in file_map:
            matched_url = file_map[sanitized_lower]
        else:
            # Try partial match - find file containing key words from title
            title_words = set(sanitized.lower().split('-'))
            title_words.discard('')

            best_match = None
            best_score = 0

            for filename, url in file_map.items():
                file_words = set(filename.replace('.pdf', '').split('-'))
                file_words.discard('')

                # Count overlapping words
                overlap = len(title_words & file_words)
                if overlap > best_score and overlap >= 3:  # At least 3 words match
                    best_score = overlap
                    best_match = url

            if best_match:
                matched_url = best_match

        if matched_url:
            updates.append({
                'title': title,
                'url': matched_url,
                'chunk_ids': chunk_ids
            })
        else:
            not_matched.append(title)

    print(f"Matched: {len(updates)} titles")
    print(f"Not matched: {len(not_matched)} titles")

    if not_matched:
        print("\nUnmatched titles (first 5):")
        for t in not_matched[:5]:
            print(f"  - {t[:60]}...")

    # Update database
    print("\n=== Updating database ===")
    updated_count = 0

    for update in updates:
        # Update all chunks with this title
        try:
            result = supabase.table('guideline_chunks').update({
                'url': update['url']
            }).eq('guideline_title', update['title']).execute()
            updated_count += len(update['chunk_ids'])
            print(f"  ✓ Updated {len(update['chunk_ids'])} chunks: {update['title'][:40]}...")
        except Exception as e:
            print(f"  ✗ Error updating {update['title'][:40]}: {e}")

    print(f"\n=== COMPLETE ===")
    print(f"Updated {updated_count} chunks with correct storage URLs")
    print(f"Not matched: {len(not_matched)} titles (need manual review)")

if __name__ == '__main__':
    main()
