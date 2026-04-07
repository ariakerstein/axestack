#!/usr/bin/env python3
"""
Audit content balance between NCCN guidelines and webinars
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("=" * 60)
print("CONTENT TIER & SOURCE AUDIT")
print("=" * 60)

# Get counts by tier
print("\n1. CHUNKS BY CONTENT TIER")
print("-" * 40)
total = 0
for tier in ['tier_1', 'tier_2', 'tier_3', None]:
    if tier:
        result = supabase.table('guideline_chunks').select('id', count='exact').eq('content_tier', tier).execute()
    else:
        result = supabase.table('guideline_chunks').select('id', count='exact').is_('content_tier', 'null').execute()
        tier = 'null/missing'
    print(f"  {tier}: {result.count:,} chunks")
    total += result.count or 0
print(f"  TOTAL: {total:,} chunks")

# Get counts by content_type
print("\n2. CHUNKS BY CONTENT TYPE")
print("-" * 40)
for ctype in ['guideline', 'webinar', None]:
    if ctype:
        result = supabase.table('guideline_chunks').select('id', count='exact').eq('content_type', ctype).execute()
    else:
        result = supabase.table('guideline_chunks').select('id', count='exact').is_('content_type', 'null').execute()
        ctype = 'null/missing'
    print(f"  {ctype}: {result.count:,} chunks")

# Get counts by source
print("\n3. CHUNKS BY GUIDELINE SOURCE (top 10)")
print("-" * 40)
result = supabase.table('guideline_chunks').select('guideline_source').execute()
source_counts = {}
for r in result.data:
    src = r.get('guideline_source', 'unknown')
    source_counts[src] = source_counts.get(src, 0) + 1

for src, count in sorted(source_counts.items(), key=lambda x: -x[1])[:10]:
    print(f"  {src[:40]:40} {count:,}")

# Recommended balance
print("\n" + "=" * 60)
print("RECOMMENDED BALANCE FOR RAG RESPONSES")
print("=" * 60)
print("""
Current retrieval returns mixed results without clear hierarchy.

PROPOSED TIERED RETRIEVAL STRATEGY:
------------------------------------
For medical queries:
  1. PRIORITY: tier_1 (NCCN/ASCO) - 60-70% of response weight
     - These are authoritative, evidence-based guidelines
     - Should be primary source for treatment recommendations

  2. SUPPORTING: tier_2 (journals) - 20-30% of response weight
     - Peer-reviewed research
     - Supports/expands on guideline recommendations

  3. SUPPLEMENTAL: tier_3 (webinars) - 10-20% of response weight
     - Community/educational content
     - Emerging research, patient perspectives
     - Should be CLEARLY LABELED as "Community Learning" or "Educational"

For speaker/webinar-specific queries:
  - Prioritize tier_3 when user explicitly asks for webinars
  - Still cite NCCN if relevant to the topic

RESPONSE FORMAT RECOMMENDATION:
-------------------------------
## Standard Medical Guidance (from NCCN/ASCO Guidelines)
[Tier 1 content here - authoritative recommendations]

## Emerging Research & Community Insights
[Tier 3 content here - clearly labeled as educational/emerging]

## Questions to Ask Your Oncologist
[Synthesized from both tiers]
""")

# Check current scoring
print("\n" + "=" * 60)
print("SCORING AUDIT")
print("=" * 60)
result = supabase.table('response_evaluations').select('overall_confidence, confidence_level, accuracy_score, source_support_score').order('created_at', desc=True).limit(20).execute()

if result.data:
    print("\nLast 20 evaluations:")
    print(f"{'Confidence':>12} {'Level':>10} {'Accuracy':>10} {'Source':>10}")
    print("-" * 50)
    for r in result.data:
        conf = r.get('overall_confidence', 'N/A')
        level = r.get('confidence_level', 'N/A')
        acc = r.get('accuracy_score', 'N/A')
        src = r.get('source_support_score', 'N/A')
        print(f"{conf:>12} {level:>10} {acc:>10} {src:>10}")

    # Calculate averages
    confs = [r['overall_confidence'] for r in result.data if r.get('overall_confidence')]
    if confs:
        print(f"\nAverage confidence: {sum(confs)/len(confs):.2f}")
else:
    print("No evaluation data found")
