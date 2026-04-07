#!/usr/bin/env python3
"""
Comprehensive Audit: Eval Scores + Sources + Citations
Ensures we can trace from question → chunks → answer → citations
"""

import os
import json
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Test questions to audit
TEST_QUESTIONS = [
    {
        'question': 'What is bipolar androgen therapy?',
        'cancer_type': 'Prostate',
        'expected_source': 'Webinar on BAT'
    },
    {
        'question': 'What are the side effects of immunotherapy?',
        'cancer_type': 'Lung',
        'expected_source': 'NCCN Lung guidelines'
    },
    {
        'question': 'Should I get BRCA testing for breast cancer?',
        'cancer_type': 'Breast',
        'expected_source': 'NCCN Breast genetics'
    }
]

def call_api(question, cancer_type):
    """Call edge function and get full response"""
    edge_url = f"{SUPABASE_URL}/functions/v1/direct-navis"
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(
            edge_url,
            headers=headers,
            json={
                'question': question,
                'cancerType': cancer_type,
                'directMode': False
            },
            timeout=120
        )

        if response.status_code == 200:
            return response.json()
        else:
            return {'error': f"Status {response.status_code}: {response.text[:200]}"}

    except Exception as e:
        return {'error': str(e)}

def audit_response(data, question_info):
    """Perform detailed audit of a single response"""
    print("\n" + "="*100)
    print(f"QUESTION: {question_info['question']}")
    print(f"Cancer Type: {question_info['cancer_type']}")
    print(f"Expected Source: {question_info['expected_source']}")
    print("="*100)

    if 'error' in data:
        print(f"\n❌ ERROR: {data['error']}")
        return

    # 1. SEARCH AUDIT
    print("\n" + "-"*100)
    print("1. SEARCH PHASE - What chunks were retrieved?")
    print("-"*100)

    search_method = data.get('searchMethod', 'unknown')
    chunks_used = data.get('chunksUsed', 0)
    retrieved_chunks = data.get('retrievedChunks', [])

    print(f"\nSearch Method: {search_method}")
    print(f"Chunks Retrieved: {chunks_used}")
    print(f"Search Latency: {data.get('searchLatencyMs', 0)}ms\n")

    if chunks_used == 0:
        print("❌ CRITICAL: NO CHUNKS RETRIEVED!")
        print("   → Search is broken or no matching content exists")
        return

    print("Retrieved Chunks Detail:")
    for i, chunk in enumerate(retrieved_chunks[:8], 1):
        title = chunk.get('guideline_title', 'N/A')
        source = chunk.get('guideline_source', 'N/A')
        cancer = chunk.get('cancer_type', 'N/A')
        similarity = chunk.get('similarity', 0)
        chunk_preview = chunk.get('chunk_text', '')[:100]

        print(f"\n  Chunk {i}:")
        print(f"    Title: {title[:70]}")
        print(f"    Source: {source}")
        print(f"    Cancer Type: {cancer}")
        print(f"    Similarity: {similarity:.3f}")
        print(f"    Content Preview: {chunk_preview}...")

    # 2. ANSWER AUDIT
    print("\n" + "-"*100)
    print("2. ANSWER PHASE - What did the LLM generate?")
    print("-"*100)

    answer = data.get('answer', '')
    answer_length = len(answer)
    model_used = data.get('modelUsed', 'unknown')
    llm_latency = data.get('llmLatencyMs', 0)

    print(f"\nModel Used: {model_used}")
    print(f"LLM Latency: {llm_latency}ms")
    print(f"Answer Length: {answer_length} chars")
    print(f"\nAnswer Preview (first 500 chars):")
    print("-" * 50)
    print(answer[:500])
    print("-" * 50)

    # 3. CITATIONS AUDIT
    print("\n" + "-"*100)
    print("3. CITATIONS PHASE - What sources are cited?")
    print("-"*100)

    citations = data.get('citations', [])
    citation_urls = data.get('citationUrls', [])

    print(f"\nTotal Citations: {len(citations)}\n")

    if not citations:
        print("⚠️  WARNING: No citations returned!")
        print("   → Check if sources are being extracted from answer")
    else:
        print("Citations:")
        for i, citation in enumerate(citations, 1):
            print(f"  {i}. {citation}")

        if citation_urls:
            print(f"\nCitation URLs ({len(citation_urls)} clickable links):")
            for i, url_obj in enumerate(citation_urls, 1):
                print(f"  {i}. {url_obj.get('title', 'N/A')}")
                print(f"     URL: {url_obj.get('url', 'N/A')}")

    # 4. AUDIT TRACE: Chunks → Answer → Citations
    print("\n" + "-"*100)
    print("4. AUDIT TRACE - Can we link chunks to citations?")
    print("-"*100)

    # Extract guideline titles from chunks
    chunk_titles = set()
    chunk_sources = set()
    for chunk in retrieved_chunks:
        if chunk.get('guideline_title'):
            chunk_titles.add(chunk['guideline_title'])
        if chunk.get('guideline_source'):
            chunk_sources.add(chunk['guideline_source'])

    print(f"\nUnique sources in retrieved chunks: {len(chunk_sources)}")
    for source in list(chunk_sources)[:5]:
        print(f"  • {source}")

    print(f"\nUnique titles in retrieved chunks: {len(chunk_titles)}")
    for title in list(chunk_titles)[:5]:
        print(f"  • {title[:70]}")

    # Check if citations match retrieved chunks
    print("\n✓ Citation Validation:")
    citation_text = ' '.join(citations).lower()

    matched_chunks = 0
    for title in chunk_titles:
        title_words = set(title.lower().split())
        citation_words = set(citation_text.split())

        # Check for overlap
        if len(title_words & citation_words) >= 2:  # At least 2 words match
            matched_chunks += 1
            print(f"  ✓ Found in citation: '{title[:60]}...'")

    if matched_chunks == 0:
        print("  ⚠️  WARNING: Citations don't match retrieved chunks!")
        print("     → LLM may be citing from memory, not retrieved content")
    else:
        print(f"\n  ✓ {matched_chunks}/{len(chunk_titles)} chunk sources appear in citations")

    # 5. EVAL SCORES AUDIT
    print("\n" + "-"*100)
    print("5. EVAL SCORES - Are they meaningful?")
    print("-"*100)

    eval_scores = data.get('evaluationScores', {})

    if not eval_scores:
        print("\n⚠️  WARNING: No evaluation scores returned!")
    else:
        print("\nEvaluation Scores:")
        print(f"  Accuracy:        {eval_scores.get('accuracy', 'N/A')}/10")
        print(f"  Completeness:    {eval_scores.get('completeness', 'N/A')}/10")
        print(f"  Question Fit:    {eval_scores.get('questionFit', 'N/A')}/10")
        print(f"  Source Support:  {eval_scores.get('sourceSupport', 'N/A')}/10")
        print(f"  Trustworthiness: {eval_scores.get('trustworthiness', 'N/A')}/10")
        print(f"  Communication:   {eval_scores.get('communication', 'N/A')}/10")
        print(f"  Overall:         {eval_scores.get('overallConfidence', 'N/A')}/10")
        print(f"  Confidence:      {eval_scores.get('confidenceLevel', 'N/A')}")

        # Validate eval scores against actual data
        print("\n✓ Eval Score Validation:")

        # Check source support score
        source_score = eval_scores.get('sourceSupport', 0)
        if source_score >= 7 and len(citations) < 2:
            print(f"  ⚠️  Source Support score is {source_score} but only {len(citations)} citations")
        elif source_score >= 7 and len(citations) >= 3:
            print(f"  ✓ Source Support score {source_score} matches {len(citations)} citations")

        # Check completeness score
        completeness = eval_scores.get('completeness', 0)
        if completeness >= 8 and answer_length < 500:
            print(f"  ⚠️  Completeness score is {completeness} but answer is only {answer_length} chars")
        elif completeness >= 8 and answer_length >= 800:
            print(f"  ✓ Completeness score {completeness} matches answer length {answer_length}")

        # Check question fit
        question_fit = eval_scores.get('questionFit', 0)
        question_keywords = set(question_info['question'].lower().split())
        answer_keywords = set(answer.lower().split())
        keyword_overlap = len(question_keywords & answer_keywords) / len(question_keywords)

        if question_fit >= 8 and keyword_overlap < 0.5:
            print(f"  ⚠️  Question Fit score is {question_fit} but only {keyword_overlap:.0%} keyword overlap")
        elif question_fit >= 8 and keyword_overlap >= 0.7:
            print(f"  ✓ Question Fit score {question_fit} matches {keyword_overlap:.0%} keyword overlap")

    # 6. OVERALL QUALITY ASSESSMENT
    print("\n" + "-"*100)
    print("6. OVERALL QUALITY ASSESSMENT")
    print("-"*100)

    quality_checks = {
        'Search Working': chunks_used >= 5,
        'High Similarity': retrieved_chunks[0].get('similarity', 0) >= 0.55 if retrieved_chunks else False,
        'Has Citations': len(citations) >= 2,
        'Citations Match Chunks': matched_chunks > 0,
        'Sufficient Length': answer_length >= 500,
        'Fast Response': data.get('totalLatencyMs', 0) < 10000,
        'Eval Scores Present': bool(eval_scores)
    }

    print("\nQuality Checklist:")
    for check, passed in quality_checks.items():
        status = "✓" if passed else "❌"
        print(f"  {status} {check}")

    quality_score = sum(quality_checks.values()) / len(quality_checks)
    print(f"\nOverall Quality: {quality_score:.0%}")

    if quality_score >= 0.8:
        print("✅ HIGH QUALITY - Response meets standards")
    elif quality_score >= 0.6:
        print("⚠️  MEDIUM QUALITY - Some issues to address")
    else:
        print("❌ LOW QUALITY - Significant problems detected")

def main():
    print("\n" + "="*100)
    print("COMPREHENSIVE AUDIT: EVAL SCORES + SOURCES + CITATIONS")
    print("="*100)
    print(f"\nTesting {len(TEST_QUESTIONS)} questions to verify:")
    print("  1. Search retrieves relevant chunks")
    print("  2. Chunks have proper metadata (title, source, similarity)")
    print("  3. Citations match retrieved chunks")
    print("  4. Eval scores are meaningful")
    print("  5. Complete audit trail: Question → Chunks → Answer → Citations")

    all_results = []

    for question_info in TEST_QUESTIONS:
        print(f"\n\n{'#'*100}")
        print(f"# Testing: {question_info['question'][:70]}...")
        print(f"{'#'*100}")

        data = call_api(question_info['question'], question_info['cancer_type'])
        audit_response(data, question_info)

        all_results.append({
            'question': question_info['question'],
            'cancer_type': question_info['cancer_type'],
            'data': data
        })

    # Summary across all tests
    print("\n\n" + "="*100)
    print("SUMMARY ACROSS ALL TESTS")
    print("="*100)

    total_tests = len(all_results)
    successful_searches = sum(1 for r in all_results if r['data'].get('chunksUsed', 0) >= 5)
    high_similarity = sum(1 for r in all_results
                         if r['data'].get('retrievedChunks', []) and
                         r['data']['retrievedChunks'][0].get('similarity', 0) >= 0.55)
    has_citations = sum(1 for r in all_results if len(r['data'].get('citations', [])) >= 2)
    fast_responses = sum(1 for r in all_results if r['data'].get('totalLatencyMs', 99999) < 10000)

    print(f"\nSearch Performance:")
    print(f"  {successful_searches}/{total_tests} tests retrieved 5+ chunks")
    print(f"  {high_similarity}/{total_tests} tests had similarity >= 0.55")

    print(f"\nCitation Quality:")
    print(f"  {has_citations}/{total_tests} tests had 2+ citations")

    print(f"\nLatency:")
    print(f"  {fast_responses}/{total_tests} tests under 10s")

    # Eval score analysis
    print(f"\nEval Score Distribution:")
    confidence_levels = [r['data'].get('evaluationScores', {}).get('confidenceLevel', 'unknown')
                        for r in all_results]
    print(f"  High: {confidence_levels.count('high')}")
    print(f"  Medium: {confidence_levels.count('medium')}")
    print(f"  Low: {confidence_levels.count('low')}")

    if confidence_levels.count('high') == total_tests:
        print("\n  ⚠️  WARNING: All tests scored 'high' - eval scores may not be differentiating quality")
    elif set(confidence_levels) == {'high', 'medium', 'low'}:
        print("\n  ✓ Good variability in eval scores")

    print("\n" + "="*100)
    print("AUDIT COMPLETE")
    print("="*100 + "\n")

if __name__ == '__main__':
    main()
