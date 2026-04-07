#!/usr/bin/env python3
"""Debug dashboard filter and count issues."""

import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("="*70)
print("  DASHBOARD ISSUES DEBUG")
print("="*70)

# Issue 1: Total questions count
print("\n1. TOTAL QUESTIONS COUNT")
print("-"*70)

# Count all evaluations
total_result = supabase.table('response_evaluations').select('*', count='exact').limit(1).execute()
print(f"Total evaluations in database: {total_result.count}")

# Count by time range
for time_range, days in [('24h', 1), ('7d', 7), ('30d', 30), ('90d', 90)]:
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    result = supabase.table('response_evaluations')\
        .select('*', count='exact')\
        .gte('created_at', start_date)\
        .limit(1)\
        .execute()
    print(f"  Last {time_range}: {result.count}")

# Issue 2: Filter effectiveness
print("\n2. FILTER BREAKDOWN")
print("-"*70)

# By source
print("\nBy Source:")
sources = {}
all_evals = supabase.table('response_evaluations').select('source').execute()
for e in all_evals.data:
    source = e.get('source') or 'unknown'
    sources[source] = sources.get(source, 0) + 1

for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
    print(f"  {source}: {count}")

# By confidence level
print("\nBy Confidence Level:")
levels = {}
all_evals_with_conf = supabase.table('response_evaluations').select('confidence_level').execute()
for e in all_evals_with_conf.data:
    level = e.get('confidence_level') or 'unknown'
    levels[level] = levels.get(level, 0) + 1

for level, count in sorted(levels.items(), key=lambda x: x[1], reverse=True):
    print(f"  {level}: {count}")

# By cancer type
print("\nBy Cancer Type:")
cancer_types = {}
all_evals_with_cancer = supabase.table('response_evaluations').select('cancer_type').execute()
for e in all_evals_with_cancer.data:
    ctype = e.get('cancer_type') or 'None/General'
    cancer_types[ctype] = cancer_types.get(ctype, 0) + 1

for ctype, count in sorted(cancer_types.items(), key=lambda x: x[1], reverse=True):
    print(f"  {ctype}: {count}")

# Issue 3: User feedback details
print("\n3. USER FEEDBACK ANALYSIS")
print("-"*70)

feedback_result = supabase.table('response_feedback').select('*').execute()
print(f"Total feedback entries: {len(feedback_result.data)}")

if feedback_result.data:
    print("\nAll Feedback Entries:")
    for i, fb in enumerate(feedback_result.data, 1):
        rating = fb.get('rating', 'unknown')
        comment = fb.get('comment', 'No comment')
        created = fb.get('created_at', '')[:19]
        response_id = fb.get('response_id', '')[:8]

        print(f"\n  #{i} - {created}")
        print(f"    Response ID: {response_id}...")
        print(f"    Rating: {rating}")
        print(f"    Comment: \"{comment}\"")

        # Get associated question
        if fb.get('response_id'):
            eval_result = supabase.table('response_evaluations')\
                .select('question, overall_confidence')\
                .eq('response_id', fb['response_id'])\
                .limit(1)\
                .execute()

            if eval_result.data:
                question = eval_result.data[0].get('question', 'N/A')
                score = eval_result.data[0].get('overall_confidence', 0)
                print(f"    Question: {question[:80]}...")
                print(f"    AI Score: {score}/10")
else:
    print("  No feedback entries found")

print("\n" + "="*70)
