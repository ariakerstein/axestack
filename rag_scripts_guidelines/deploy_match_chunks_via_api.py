#!/usr/bin/env python3
"""Deploy match_chunks function via Supabase REST API"""

import os
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("\n" + "="*70)
print("DEPLOY MATCH_CHUNKS FUNCTION")
print("="*70 + "\n")

# Read the simple SQL migration
with open('../supabase/migrations/20251030000001_create_match_chunks_simple.sql', 'r') as f:
    sql = f.read()

print("Testing edge function with a sample query...")
print("(This will show if semantic search is working)\n")

# Test the edge function with a real query
test_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

test_payload = {
    'question': 'What are treatment options for glioblastoma?',
    'cancerType': 'Brain',
    'directMode': False,
    'model': 'claude-3-5-sonnet'
}

print(f"Question: {test_payload['question']}")
print(f"Cancer Type: {test_payload['cancerType']}")
print(f"Model: {test_payload['model']}\n")
print("Calling edge function...\n")

try:
    response = requests.post(test_url, headers=headers, json=test_payload, timeout=60)

    if response.status_code == 200:
        data = response.json()
        print("✓ SUCCESS!")
        print(f"  Status: {response.status_code}")
        print(f"  Search method: {data.get('searchMethod', 'unknown')}")
        print(f"  Chunks found: {data.get('chunksUsed', 0)}")
        print(f"  Answer length: {len(data.get('answer', ''))} chars")
        print(f"\n  Answer preview: {data.get('answer', '')[:200]}...")
    else:
        print(f"✗ ERROR: {response.status_code}")
        print(f"  Response: {response.text[:300]}")

except Exception as e:
    print(f"✗ Request failed: {e}")

print("\n" + "="*70)
print("To enable semantic search (cosine similarity):")
print("1. Go to: https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new")
print("2. Paste the SQL from supabase/migrations/20251030000001_create_match_chunks_simple.sql")
print("3. Click Run")
print("="*70 + "\n")
