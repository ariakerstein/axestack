#!/usr/bin/env python3
"""
Diagnose why ovarian cancer question cited breast/cervical guidelines
This shows the CRITICAL bug in search
"""

import os
import time
import json
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("\n" + "="*70)
print("DIAGNOSTIC: Ovarian Cancer Question")
print("="*70 + "\n")

# The exact question you asked
question = "What are my initial treatment options for Ovarian Cancer, and should targeted or immunotherapy based on biomarkers (BRCA1/2) be considered?"

print(f"Question: {question}\n")
print("Expected: Should cite OVARIAN cancer guidelines")
print("Actual: Cited BREAST and CERVICAL cancer guidelines")
print("\nThis is WRONG! Let's diagnose why...\n")

edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

print("Calling edge function...\n")
start = time.time()

response = requests.post(
    edge_url,
    headers=headers,
    json={
        'question': question,
        'cancerType': 'Ovarian',  # Explicitly set to Ovarian
        'directMode': False,
        'model': 'claude-3-5-sonnet'
    },
    timeout=120
)

elapsed = time.time() - start
data = response.json()

print("="*70)
print("DIAGNOSIS")
print("="*70 + "\n")

# Check 1: Search method
search_method = data.get('searchMethod', 'unknown')
print(f"1. Search Method: {search_method}")
if search_method == 'unknown':
    print("   ❌ CRITICAL: No search happened!")
    print("   → This is why wrong content appears")
    print("   → Claude is answering from general knowledge")
else:
    print(f"   ✓ Search attempted: {search_method}")

# Check 2: Chunks retrieved
chunks_used = data.get('chunksUsed', 0)
retrieved_chunks = data.get('retrievedChunks', [])
print(f"\n2. Chunks Retrieved: {chunks_used}")

if chunks_used == 0:
    print("   ❌ CRITICAL: 0 chunks retrieved!")
    print("   → Claude has NO guideline context")
    print("   → Makes up citations from training data")
    print("   → THIS is why breast/cervical guidelines were cited")
else:
    print(f"   ✓ Retrieved {chunks_used} chunks")
    print("\n   Chunk sources:")
    for i, chunk in enumerate(retrieved_chunks[:5], 1):
        title = chunk.get('guideline_title', 'Unknown')
        cancer_type = chunk.get('cancer_type', 'Unknown')
        print(f"     {i}. {title[:50]}... (Cancer: {cancer_type})")

# Check 3: Answer analysis
answer = data.get('answer', '')
print(f"\n3. Answer Length: {len(answer)} chars")
print(f"   Time taken: {elapsed:.1f}s")

# Check if answer mentions wrong cancer types
answer_lower = answer.lower()
if 'breast cancer' in answer_lower and 'ovarian' not in answer_lower:
    print("   ⚠️  Answer mentions BREAST cancer but not OVARIAN")
if 'cervical' in answer_lower and 'ovarian' not in answer_lower:
    print("   ⚠️  Answer mentions CERVICAL cancer but not OVARIAN")

# Check 4: Citations
citations = data.get('citations', [])
print(f"\n4. Citations: {len(citations)}")
if citations:
    print("   Sources cited:")
    for cit in citations[:5]:
        print(f"     - {cit}")

print("\n" + "="*70)
print("ROOT CAUSE ANALYSIS")
print("="*70 + "\n")

if chunks_used == 0:
    print("❌ THE PROBLEM:")
    print("   1. match_chunks SQL function is MISSING or BROKEN")
    print("   2. No guideline chunks retrieved")
    print("   3. Claude answers from general knowledge")
    print("   4. Citations are HALLUCINATED from training data")
    print("   5. Wrong cancer types cited (breast/cervical instead of ovarian)")
    print("\n✓ THE FIX:")
    print("   → Paste the SQL function into Supabase dashboard")
    print("   → Immediately fixes: search, speed, and accuracy")
    print("   → https://supabase.com/dashboard/project/felofmlhqwcdpiyjgstx/sql/new")
    print("\n   SQL is in /tmp/FIXED_match_chunks.sql")
else:
    print("✓ Search is working")
    print("   The wrong citations might be due to:")
    print("   - Cancer type detection issue")
    print("   - Search returning irrelevant chunks")

print("\n" + "="*70 + "\n")

# Save diagnostic
with open(f'ovarian_diagnostic_{int(time.time())}.json', 'w') as f:
    json.dump({
        'question': question,
        'cancer_type_requested': 'Ovarian',
        'search_method': search_method,
        'chunks_used': chunks_used,
        'retrieved_chunks': retrieved_chunks,
        'answer': answer,
        'citations': citations,
        'latency_seconds': elapsed,
        'diagnosis': 'No chunks retrieved - citations hallucinated' if chunks_used == 0 else 'Chunks retrieved'
    }, f, indent=2)

print("✓ Full diagnostic saved\n")
