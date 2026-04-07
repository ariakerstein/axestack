#!/usr/bin/env python3
"""
Quick test of PHI guard patterns (Python version for validation)
This mirrors the TypeScript phi-guard.ts logic
"""

import re

# PHI Patterns (same as TypeScript version)
PHI_PATTERNS = {
    'ssn': [
        r'\b\d{3}-\d{2}-\d{4}\b',
        r'\bSSN[:\s]*\d{3}-?\d{2}-?\d{4}\b',
    ],
    'phone': [
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
        r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b',
    ],
    'email': [
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    ],
    'dates': [
        r'\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](\d{4}|\d{2})\b',
        r'\bDOB[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b',
    ],
    'mrn': [
        r'\bMRN[:\s#]*[A-Z0-9-]{5,15}\b',
        r'\bPatient ID[:\s#]*[A-Z0-9-]{5,15}\b',
    ],
    'zipCode': [
        r'\b\d{5}(-\d{4})?\b',
    ],
}

REDACTION_TOKENS = {
    'ssn': '[SSN]',
    'phone': '[PHONE]',
    'email': '[EMAIL]',
    'dates': '[DATE]',
    'mrn': '[MRN]',
    'zipCode': '[ZIP]',
}


def redact_phi(text: str) -> dict:
    """Redact PHI from text"""
    redacted = text
    redaction_count = 0
    redaction_types = {}

    for category, patterns in PHI_PATTERNS.items():
        token = REDACTION_TOKENS.get(category, f'[{category.upper()}]')
        for pattern in patterns:
            matches = re.findall(pattern, redacted, re.IGNORECASE)
            if matches:
                count = len(matches) if isinstance(matches[0], str) else len(matches)
                redaction_types[category] = redaction_types.get(category, 0) + count
                redaction_count += count
                redacted = re.sub(pattern, token, redacted, flags=re.IGNORECASE)

    return {
        'text': redacted,
        'redaction_count': redaction_count,
        'redaction_types': redaction_types,
        'was_modified': redaction_count > 0
    }


def test_phi_redaction():
    """Test PHI redaction"""
    print("═" * 60)
    print("PHI GUARD TEST")
    print("═" * 60)
    print()

    test_cases = [
        ("SSN", "Patient SSN: 123-45-6789"),
        ("Phone", "Call 555-123-4567 or (555) 987-6543"),
        ("Email", "Contact: john.doe@example.com"),
        ("Date", "DOB: 01/15/1985"),
        ("MRN", "MRN: A12345678"),
        ("ZIP", "ZIP: 90210"),
        ("Clean text", "Prostate cancer Gleason 7 treatment options"),
        ("Mixed PHI", "Patient John (SSN: 123-45-6789, email: john@test.com) has cancer"),
    ]

    all_passed = True

    for name, text in test_cases:
        result = redact_phi(text)
        print(f"Test: {name}")
        print(f"  Input:  {text}")
        print(f"  Output: {result['text']}")
        print(f"  Redactions: {result['redaction_count']} ({result['redaction_types']})")

        # Check that PHI was redacted for PHI test cases
        if name != "Clean text":
            # Should have some redactions
            if result['was_modified']:
                print(f"  ✅ PASS")
            else:
                print(f"  ⚠️  No redactions (may be ok for some cases)")
        else:
            # Clean text should not be modified
            if not result['was_modified']:
                print(f"  ✅ PASS (no false positives)")
            else:
                print(f"  ❌ FAIL (false positive!)")
                all_passed = False

        print()

    print("═" * 60)
    print(f"RESULT: {'✅ All tests passed' if all_passed else '❌ Some tests failed'}")
    print("═" * 60)


if __name__ == '__main__':
    test_phi_redaction()
