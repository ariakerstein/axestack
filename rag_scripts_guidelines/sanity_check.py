#!/usr/bin/env python3
"""
Sanity check for webinar RAG data integrity
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Load env
load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("="*60)
print("SANITY CHECK: WEBINAR DATA INTEGRITY")
print("="*60)

# 1. Check counts
print("\n1. CHUNK COUNTS")
print("-"*40)
webinar_count = supabase.table('guideline_chunks').select('id', count='exact').eq('content_type', 'webinar').execute()
guideline_count = supabase.table('guideline_chunks').select('id', count='exact').eq('content_type', 'guideline').execute()
print(f"   Webinar chunks:   {webinar_count.count:,}")
print(f"   Guideline chunks: {guideline_count.count:,}")

# 2. Check embeddings exist
print("\n2. EMBEDDING COMPLETENESS")
print("-"*40)
# Check if chunks have embeddings (non-null)
sample_with_embedding = supabase.table('guideline_chunks').select('id, chunk_embedding_vec').eq('content_type', 'webinar').limit(10).execute()
has_embeddings = sum(1 for r in sample_with_embedding.data if r.get('chunk_embedding_vec'))
print(f"   Sample of 10 webinar chunks with embeddings: {has_embeddings}/10")

# 3. Check URL linkage
print("\n3. URL LINKAGE")
print("-"*40)
sample_urls = supabase.table('guideline_chunks').select('guideline_title, url, content_type').eq('content_type', 'webinar').limit(10).execute()
has_urls = sum(1 for r in sample_urls.data if r.get('url'))
print(f"   Sample of 10 webinar chunks with URLs: {has_urls}/10")

print("\n   Sample URLs:")
for chunk in sample_urls.data[:5]:
    print(f"   - {chunk['guideline_title'][:35]}...")
    print(f"     URL: {chunk.get('url', 'MISSING!')}")

# 4. Check unique webinars
print("\n4. UNIQUE WEBINAR TITLES")
print("-"*40)
# Get unique titles (limited query)
titles_result = supabase.table('guideline_chunks').select('guideline_title').eq('content_type', 'webinar').execute()
unique_titles = set(r['guideline_title'] for r in titles_result.data)
print(f"   Unique webinar titles: {len(unique_titles)}")

# Show sample titles
print("\n   Sample titles:")
for title in list(unique_titles)[:10]:
    print(f"   - {title[:55]}...")

# 5. Check content tier
print("\n5. CONTENT TIER VERIFICATION")
print("-"*40)
tier_check = supabase.table('guideline_chunks').select('content_tier', count='exact').eq('content_type', 'webinar').eq('content_tier', 'tier_3').execute()
print(f"   Webinar chunks with tier_3: {tier_check.count}")
print(f"   (Should match webinar count: {webinar_count.count})")

# 6. Check speaker/section_heading field
print("\n6. SPEAKER METADATA")
print("-"*40)
speaker_sample = supabase.table('guideline_chunks').select('guideline_title, section_heading').eq('content_type', 'webinar').limit(10).execute()
has_speaker = sum(1 for r in speaker_sample.data if r.get('section_heading'))
print(f"   Sample chunks with speaker info: {has_speaker}/10")

print("\n   Sample speakers:")
for chunk in speaker_sample.data[:5]:
    print(f"   - {chunk.get('section_heading', 'N/A')}: {chunk['guideline_title'][:30]}...")

print("\n" + "="*60)
print("SANITY CHECK COMPLETE")
print("="*60)

# Summary
issues = []
if has_embeddings < 10:
    issues.append("Some chunks missing embeddings")
if has_urls < 10:
    issues.append("Some chunks missing URLs")
if tier_check.count != webinar_count.count:
    issues.append("Content tier mismatch")

if issues:
    print("\n⚠️  ISSUES FOUND:")
    for issue in issues:
        print(f"   - {issue}")
else:
    print("\n✅ All checks passed!")
