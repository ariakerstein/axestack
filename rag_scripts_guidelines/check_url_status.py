#!/usr/bin/env python3
"""Check URL fix status"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
supabase = create_client(SUPABASE_URL, os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

# Get ALL files from storage (handle pagination)
print("=== Getting ALL files from Supabase Storage ===")
all_files = []
offset = 0
limit = 1000

while True:
    files = supabase.storage.from_('guideline-pdfs').list('webinars/', {'limit': limit, 'offset': offset})
    if not files:
        break
    all_files.extend(files)
    print(f"  Fetched {len(files)} files (total: {len(all_files)})")
    if len(files) < limit:
        break
    offset += limit

print(f"Total files in storage: {len(all_files)}")

# Get total webinar chunk count
result = supabase.table('guideline_chunks').select('id', count='exact').eq('content_type', 'webinar').execute()
print(f"\nTotal webinar chunks in DB: {result.count}")

# Check how many still have leafscience URLs
result2 = supabase.table('guideline_chunks').select('id', count='exact').eq('content_type', 'webinar').ilike('url', '%leafscience%').execute()
print(f"Chunks with leafscience URLs: {result2.count}")

# Check how many have correct supabase URLs
result3 = supabase.table('guideline_chunks').select('id', count='exact').eq('content_type', 'webinar').ilike('url', '%supabase%').execute()
print(f"Chunks with supabase URLs: {result3.count}")
