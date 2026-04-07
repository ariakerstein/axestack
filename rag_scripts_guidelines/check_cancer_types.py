#!/usr/bin/env python3
"""Check cancer types in chunks"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

# Check what cancer types exist in webinar chunks
print("=== Cancer types in webinar chunks ===")
result = supabase.table('guideline_chunks').select('cancer_type').eq('content_type', 'webinar').limit(100).execute()

cancer_types = {}
for r in result.data:
    ct = r.get('cancer_type', 'NULL')
    cancer_types[ct] = cancer_types.get(ct, 0) + 1

print(f"Sample of 100 webinar chunks:")
for ct, count in sorted(cancer_types.items(), key=lambda x: -x[1]):
    print(f"  {ct}: {count}")

# Check NCCN chunks
print("\n=== Cancer types in NCCN chunks ===")
result2 = supabase.table('guideline_chunks').select('cancer_type').eq('content_tier', 'tier_1').limit(100).execute()

cancer_types2 = {}
for r in result2.data:
    ct = r.get('cancer_type', 'NULL')
    cancer_types2[ct] = cancer_types2.get(ct, 0) + 1

print(f"Sample of 100 NCCN chunks:")
for ct, count in sorted(cancer_types2.items(), key=lambda x: -x[1]):
    print(f"  {ct}: {count}")

# Count prostate specifically
print("\n=== Prostate cancer chunks by tier ===")
for tier in ['tier_1', 'tier_3']:
    result = supabase.table('guideline_chunks').select('id', count='exact').eq('content_tier', tier).ilike('cancer_type', '%prostate%').execute()
    print(f"  {tier}: {result.count} chunks with prostate in cancer_type")
