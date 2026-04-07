#!/usr/bin/env python3
"""
Analyze why eval scores don't discriminate - check actual score distributions
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from collections import Counter
import statistics

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("\n" + "="*100)
print("EVAL SCORE DISTRIBUTION ANALYSIS")
print("="*100 + "\n")

# Get last 50 responses
result = supabase.table('response_evaluations')\
    .select('*')\
    .order('created_at', desc=True)\
    .limit(50)\
    .execute()

responses = result.data

print(f"Analyzing {len(responses)} responses\n")

# Extract individual scores
accuracy_scores = [r.get('accuracy_score', 0) for r in responses if r.get('accuracy_score')]
completeness_scores = [r.get('completeness_score', 0) for r in responses if r.get('completeness_score')]
question_fit_scores = [r.get('question_fit_score', 0) for r in responses if r.get('question_fit_score')]
source_support_scores = [r.get('source_support_score', 0) for r in responses if r.get('source_support_score')]
trustworthiness_scores = [r.get('trustworthiness_score', 0) for r in responses if r.get('trustworthiness_score')]
communication_scores = [r.get('communication_score', 0) for r in responses if r.get('communication_score')]
overall_scores = [r.get('overall_confidence', 0) for r in responses if r.get('overall_confidence')]

def analyze_distribution(scores, name):
    """Analyze a single score distribution"""
    if not scores:
        print(f"  No data for {name}")
        return

    print(f"\n{name}:")
    print(f"  Range: {min(scores):.1f} - {max(scores):.1f}")
    print(f"  Mean: {statistics.mean(scores):.2f}")
    print(f"  Median: {statistics.median(scores):.2f}")
    print(f"  Std Dev: {statistics.stdev(scores) if len(scores) > 1 else 0:.2f}")

    # Count unique values
    unique_count = len(set(scores))
    print(f"  Unique values: {unique_count}")

    # If low variance, that's the problem!
    if statistics.stdev(scores) < 1.0 if len(scores) > 1 else True:
        print(f"  ⚠️  LOW VARIANCE - Scores cluster around {statistics.mean(scores):.1f}")

print("="*100)
print("INDIVIDUAL SCORE DISTRIBUTIONS")
print("="*100)

analyze_distribution(accuracy_scores, "Accuracy (1-10)")
analyze_distribution(completeness_scores, "Completeness (1-10)")
analyze_distribution(question_fit_scores, "Question Fit (1-10)")
analyze_distribution(source_support_scores, "Source Support (1-10)")
analyze_distribution(trustworthiness_scores, "Trustworthiness (1-10)")
analyze_distribution(communication_scores, "Communication (1-10)")

print("\n" + "="*100)
print("WEIGHTED OVERALL SCORES")
print("="*100)

analyze_distribution(overall_scores, "Overall Confidence (weighted)")

# Check confidence level distribution
confidence_levels = [r.get('confidence_level', 'unknown') for r in responses]
level_counts = Counter(confidence_levels)

print("\n" + "="*100)
print("CONFIDENCE LEVEL DISTRIBUTION")
print("="*100 + "\n")

for level, count in level_counts.most_common():
    pct = count / len(responses) * 100
    print(f"  {level}: {count} ({pct:.0f}%)")

if level_counts.get('high', 0) > len(responses) * 0.8:
    print(f"\n  ⚠️  PROBLEM: {level_counts['high']/len(responses)*100:.0f}% are 'high' - no discrimination!")

# Analyze problem: why are all scores high?
print("\n" + "="*100)
print("ROOT CAUSE ANALYSIS")
print("="*100 + "\n")

# Sample a few responses to see actual scores
print("Sample responses with individual scores:\n")
for i, r in enumerate(responses[:5], 1):
    print(f"{i}. Overall: {r.get('overall_confidence', 0):.1f} → {r.get('confidence_level', 'unknown')}")
    print(f"   Accuracy: {r.get('accuracy_score', 0):.1f}")
    print(f"   Completeness: {r.get('completeness_score', 0):.1f}")
    print(f"   Question Fit: {r.get('question_fit_score', 0):.1f}")
    print(f"   Source Support: {r.get('source_support_score', 0):.1f}")
    print(f"   Trustworthiness: {r.get('trustworthiness_score', 0):.1f}")
    print(f"   Communication: {r.get('communication_score', 0):.1f}")
    print()

# Calculate weighted score manually to verify
print("\n" + "="*100)
print("WEIGHTED CALCULATION VERIFICATION")
print("="*100 + "\n")

weights = {
    'accuracy': 0.30,
    'source_support': 0.25,
    'completeness': 0.20,
    'trustworthiness': 0.15,
    'question_fit': 0.05,
    'communication': 0.05
}

print("Current weights:")
for name, weight in sorted(weights.items(), key=lambda x: x[1], reverse=True):
    print(f"  {name}: {weight:.2f} ({weight*100:.0f}%)")

# Calculate what scores would give for typical values
print("\nTypical score calculation:")
typical_scores = {
    'accuracy': 5,
    'completeness': 10,
    'question_fit': 10,
    'source_support': 9,
    'trustworthiness': 3,
    'communication': 6
}

weighted = sum(typical_scores[k.replace('_', '')] * weights[k] for k in weights)
print(f"  Scores: {typical_scores}")
print(f"  Weighted: {weighted:.2f}")

thresholds = {
    'current': {'high': 6.5, 'medium': 4.5},
}

print(f"\nCurrent thresholds:")
print(f"  high >= 6.5, medium >= 4.5, low < 4.5")
print(f"  Result: {weighted:.2f} → {'high' if weighted >= 6.5 else 'medium' if weighted >= 4.5 else 'low'}")

print("\n" + "="*100)
print("RECOMMENDATIONS")
print("="*100 + "\n")

print("""
The problem: Scores cluster around 7.0-7.5, all showing 'high'

Root causes:
1. Individual scores (completeness, question_fit) often 10/10 → inflates average
2. Weights favor high-scoring dimensions (source_support gets 9-10)
3. Thresholds too low (6.5 for high means most pass)

Solutions to try:

Option 1: NON-LINEAR SCORING (Exponential)
  - Use exponential penalty for low scores
  - Formula: score^1.5 instead of linear
  - This amplifies differences

Option 2: STRICTER THRESHOLDS
  - high >= 8.0, medium >= 6.0, low < 6.0
  - Forces more discrimination

Option 3: PENALTY-BASED SCORING
  - Start at 10, subtract penalties
  - Missing citations: -2
  - Low similarity: -1
  - Short answer: -1

Option 4: PERCENTILE-BASED
  - Score relative to historical data
  - Top 20% = high, middle 60% = medium, bottom 20% = low

Option 5: CRITICAL FACTORS
  - Require BOTH high search quality AND answer quality
  - If chunks < 5 OR similarity < 0.55 → automatically 'medium' or 'low'
  - If no citations → automatically 'low'

Recommended: Combine Option 3 + Option 5
  - Penalty-based with critical factor gates
  - This will create real discrimination
""")

print("="*100 + "\n")
