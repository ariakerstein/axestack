#!/usr/bin/env python3
"""Extract and compare actual answers from model comparison test"""

import json
import glob

# Find the most recent results file
files = glob.glob('model_comparison_*.json')
if not files:
    print("No results file found!")
    exit(1)

latest_file = max(files)
print(f"Reading results from: {latest_file}\n")

with open(latest_file, 'r') as f:
    results = json.load(f)

# Extract one question to compare
question = "What is bipolar androgen therapy?"
models = ['claude-3-5-sonnet', 'claude-3-haiku', 'gpt-4.1-nano']
model_names = ['Claude 4.5 Sonnet', 'Claude Haiku', 'GPT-4.1-nano']

print("="*100)
print(f"ANSWER COMPARISON: '{question}'")
print("="*100 + "\n")

for model_id, model_name in zip(models, model_names):
    key = f"{model_id}_{question}_Prostate"

    if key in results:
        r = results[key]

        if 'answer' in r and 'preview' in r['answer']:
            preview = r['answer']['preview']
            length = r['answer']['length']

            print(f"\n{model_name} ({r['latency']['total']:.1f}s, {length} chars):")
            print("-" * 100)
            print(preview + "...")
            print()
