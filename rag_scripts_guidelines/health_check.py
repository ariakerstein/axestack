#!/usr/bin/env python3
"""
Master Health Check - Runs both RAG and Analytics validation

Validates:
- RAG: Vector search, tier coverage, webinar URLs
- Analytics: User profiles, events, Circle metrics, cohorts

Run: python health_check.py
"""

import subprocess
import sys

print('╔' + '═' * 58 + '╗')
print('║' + ' MASTER HEALTH CHECK '.center(58) + '║')
print('╚' + '═' * 58 + '╝')
print()

# Run RAG health check
print('▶ Running RAG Health Check...\n')
rag_result = subprocess.run(
    ['python3', 'rag_health_check.py'],
    capture_output=False
)
print()

# Run Analytics health check
print('▶ Running Analytics Health Check...\n')
analytics_result = subprocess.run(
    ['python3', 'analytics_health_check.py'],
    capture_output=False
)
print()

# Final summary
print('╔' + '═' * 58 + '╗')
print('║' + ' OVERALL RESULTS '.center(58) + '║')
print('╚' + '═' * 58 + '╝')

rag_ok = rag_result.returncode == 0
analytics_ok = analytics_result.returncode == 0

print(f'  RAG System:      {"✅ HEALTHY" if rag_ok else "❌ ISSUES FOUND"}')
print(f'  Analytics:       {"✅ HEALTHY" if analytics_ok else "❌ ISSUES FOUND"}')
print()

if rag_ok and analytics_ok:
    print('  🎉 All systems operational!')
    sys.exit(0)
else:
    print('  ⚠️  Some checks failed - review above for details')
    sys.exit(1)
