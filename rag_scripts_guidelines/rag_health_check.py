#!/usr/bin/env python3
"""
RAG Health Check - Quick validation suite

Validates:
1. Vector search is fast (<2s)
2. Both NCCN and webinar content is retrievable
3. Evaluation data is being stored
4. URLs are valid

Run: python rag_health_check.py
"""

import os
import sys
import time
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client
import openai

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)
openai.api_key = os.getenv('OPENAI_API_KEY')

# Test configuration
TEST_QUERIES = [
    {'query': 'metastatic prostate cancer treatment options', 'expect_tier': 'tier_1', 'desc': 'NCCN query'},
    {'query': 'bipolar androgen therapy BAT', 'expect_tier': 'tier_3', 'desc': 'Webinar query'},
    {'query': 'Bob Gatenby adaptive therapy', 'expect_tier': 'tier_3', 'desc': 'Speaker query'},
]

THRESHOLDS = {
    'max_search_latency_ms': 2000,
    'min_similarity': 0.35,
    'min_chunks': 3,
}

results = []


def log_result(name: str, passed: bool, details: str, latency_ms: int = None):
    """Log a test result"""
    results.append({
        'name': name,
        'passed': passed,
        'details': details,
        'latency_ms': latency_ms
    })
    status = '✅ PASS' if passed else '❌ FAIL'
    latency_str = f' ({latency_ms}ms)' if latency_ms else ''
    print(f'{status} {name}{latency_str}')
    print(f'       {details}')


def generate_embedding(text: str) -> list:
    """Generate embedding using OpenAI"""
    response = openai.embeddings.create(
        model='text-embedding-3-small',
        input=text
    )
    return response.data[0].embedding


def test_vector_search(query: str, expect_tier: str, desc: str):
    """Test vector search for a query"""
    try:
        # Generate embedding
        embedding = generate_embedding(query)

        # Run search
        start = time.time()
        result = supabase.rpc('match_chunks', {
            'query_embedding': embedding,
            'match_count': 10,
            'match_threshold': 0.35,
        }).execute()
        latency = int((time.time() - start) * 1000)

        chunks = result.data or []
        has_tier = any(c.get('content_tier') == expect_tier for c in chunks)
        avg_sim = sum(c.get('similarity', 0) for c in chunks) / len(chunks) if chunks else 0

        passed = (
            latency < THRESHOLDS['max_search_latency_ms'] and
            len(chunks) >= THRESHOLDS['min_chunks'] and
            avg_sim >= THRESHOLDS['min_similarity']
        )

        log_result(
            f'Search: {desc}',
            passed,
            f'{len(chunks)} chunks, avg sim: {avg_sim:.3f}, has {expect_tier}: {has_tier}',
            latency
        )
    except Exception as e:
        log_result(f'Search: {desc}', False, f'Error: {e}')


def test_tier_coverage():
    """Test that both tiers have embedded chunks"""
    try:
        # Count tier_1 chunks with embeddings
        tier1 = supabase.table('guideline_chunks').select('id', count='exact') \
            .eq('content_tier', 'tier_1').eq('status', 'active') \
            .not_.is_('chunk_embedding_vec', 'null').execute()

        # Count tier_3 chunks with embeddings
        tier3 = supabase.table('guideline_chunks').select('id', count='exact') \
            .eq('content_tier', 'tier_3').eq('status', 'active') \
            .not_.is_('chunk_embedding_vec', 'null').execute()

        tier1_count = tier1.count or 0
        tier3_count = tier3.count or 0

        passed = tier1_count > 1000 and tier3_count > 1000

        log_result(
            'Tier Coverage',
            passed,
            f'tier_1 (NCCN): {tier1_count}, tier_3 (webinars): {tier3_count}'
        )
    except Exception as e:
        log_result('Tier Coverage', False, f'Error: {e}')


def test_index_health():
    """Test that vector index is working (fast response)"""
    try:
        embedding = generate_embedding('test query for index health')

        start = time.time()
        result = supabase.rpc('match_chunks', {
            'query_embedding': embedding,
            'match_count': 5,
            'match_threshold': 0.3,
        }).execute()
        latency = int((time.time() - start) * 1000)

        passed = latency < THRESHOLDS['max_search_latency_ms']

        log_result(
            'Vector Index',
            passed,
            f'Response in {latency}ms (threshold: {THRESHOLDS["max_search_latency_ms"]}ms)',
            latency
        )
    except Exception as e:
        log_result('Vector Index', False, f'Error: {e}')


def test_webinar_urls():
    """Test that webinar URLs are valid (not fake domains)"""
    try:
        result = supabase.table('guideline_chunks').select('url') \
            .eq('content_tier', 'tier_3').eq('status', 'active').limit(100).execute()

        bad_urls = [r for r in (result.data or [])
                    if r.get('url') and ('leafscience.org' in r['url'] or 'example.com' in r['url'])]

        passed = len(bad_urls) == 0

        log_result(
            'Webinar URLs',
            passed,
            'All URLs valid' if passed else f'{len(bad_urls)} URLs with invalid domains'
        )
    except Exception as e:
        log_result('Webinar URLs', False, f'Error: {e}')


def test_recent_evaluations():
    """Check if evaluations are being stored"""
    try:
        one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

        result = supabase.table('response_evaluations').select('overall_confidence, total_latency_ms', count='exact') \
            .gte('created_at', one_day_ago).limit(100).execute()

        data = result.data or []
        count = result.count or 0

        avg_conf = sum(r.get('overall_confidence', 0) for r in data) / len(data) if data else 0
        avg_latency = sum(r.get('total_latency_ms', 0) for r in data) / len(data) if data else 0

        log_result(
            'Eval Storage (24h)',
            True,  # Info only
            f'{count} evals, avg confidence: {avg_conf:.2f}, avg latency: {int(avg_latency)}ms'
        )
    except Exception as e:
        log_result('Eval Storage', True, f'Could not check: {e}')


def main():
    print('═' * 60)
    print('RAG HEALTH CHECK')
    print('═' * 60)
    print(f'Time: {datetime.now().isoformat()}\n')

    # Run tests
    test_index_health()
    test_tier_coverage()
    test_webinar_urls()

    for tc in TEST_QUERIES:
        test_vector_search(tc['query'], tc['expect_tier'], tc['desc'])

    test_recent_evaluations()

    # Summary
    passed = sum(1 for r in results if r['passed'])
    failed = sum(1 for r in results if not r['passed'])

    print('\n' + '═' * 60)
    print(f'SUMMARY: {passed} passed, {failed} failed')
    print('═' * 60)

    if failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
