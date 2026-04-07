#!/usr/bin/env npx tsx
/**
 * Invite Flow Verification Script
 *
 * Traces key code paths to verify the invite flow is properly wired.
 * Run: npx tsx scripts/verify-invite-flow.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

const checks: CheckResult[] = [];

function check(name: string, test: () => boolean, details: string) {
  const passed = test();
  checks.push({ name, passed, details });
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (!passed) console.log(`   → ${details}`);
}

function fileContains(filePath: string, pattern: string | RegExp): boolean {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf-8');
  if (typeof pattern === 'string') {
    return content.includes(pattern);
  }
  return pattern.test(content);
}

console.log('\n🔍 Invite Flow Verification\n');
console.log('='.repeat(50));

// 1. InviteHelperSheet stores patient name
check(
  'InviteHelperSheet stores patient name in invitee_name',
  () => fileContains('src/components/care-circle/InviteHelperSheet.tsx', 'invitee_name: patientId ? patientName'),
  'Patient name should be stored for display on invite page'
);

// 2. JoinCareCircle reads invitee_name
check(
  'JoinCareCircle fetches invitee_name field',
  () => fileContains('src/pages/JoinCareCircle.tsx', 'invitee_name'),
  'Should select invitee_name from care_circle_invites'
);

// 3. JoinCareCircle uses invitee_name for patient name
check(
  'JoinCareCircle uses invitee_name as patient name source',
  () => fileContains('src/pages/JoinCareCircle.tsx', 'data.invitee_name'),
  'Should check invitee_name first for patient name'
);

// 4. Auth.tsx reads email from query params
check(
  'Auth.tsx pre-fills email from query param',
  () => fileContains('src/pages/Auth.tsx', "searchParams.get('email')"),
  'Should read email param and pre-fill input'
);

// 5. Auth.tsx uses setEmail with email param
check(
  'Auth.tsx sets email state from param',
  () => fileContains('src/pages/Auth.tsx', 'setEmail(emailParam)'),
  'Should call setEmail with the email from query param'
);

// 6. JoinCareCircle passes email to auth
check(
  'JoinCareCircle passes email to auth page',
  () => fileContains('src/pages/JoinCareCircle.tsx', '?email='),
  'Should pass invitee email as query param to auth'
);

// 7. JoinCareCircle passes returnTo to auth
check(
  'JoinCareCircle passes returnTo to auth page',
  () => fileContains('src/pages/JoinCareCircle.tsx', 'returnTo=/join-care-circle'),
  'Should pass returnTo so user comes back after auth'
);

// 8. StartIntake handles returnTo
check(
  'StartIntake preserves returnTo for redirect',
  () => fileContains('src/pages/StartIntake.tsx', "returnTo || '/opportunities'"),
  'Should redirect to returnTo after onboarding'
);

// 9. Auth.tsx handles returnTo
check(
  'Auth.tsx redirects to returnTo',
  () => fileContains('src/pages/Auth.tsx', "returnTo || location.state"),
  'Should redirect to returnTo after auth'
);

// 10. Consent modal exists
check(
  'CareCircleConsentModal component exists',
  () => fs.existsSync(path.join(ROOT, 'src/components/consent/CareCircleConsentModal.tsx')),
  'Consent modal should exist for HIPAA compliance'
);

// 11. JoinCareCircle sets care context
check(
  'JoinCareCircle sets care context in localStorage',
  () => fileContains('src/pages/JoinCareCircle.tsx', 'navis_active_care_context'),
  'Should set active care context for caregiver'
);

// 12. JoinCareCircle sets caregiver persona
check(
  'JoinCareCircle sets caregiver persona',
  () => fileContains('src/pages/JoinCareCircle.tsx', 'navis_temp_persona'),
  'Should set persona to caregiver'
);

// Summary
console.log('\n' + '='.repeat(50));
const passed = checks.filter(c => c.passed).length;
const failed = checks.filter(c => !c.passed).length;
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✅ All invite flow checks passed!\n');
  console.log('The flow is properly wired. Ready for manual testing:');
  console.log('1. Send an invite from Circle tab');
  console.log('2. Click link in email (or copy from Supabase logs)');
  console.log('3. Sign in or create account');
  console.log('4. Accept invite');
  console.log('5. Verify redirect to /home with patient context\n');
} else {
  console.log('\n⚠️ Some checks failed. Review the issues above.\n');
  process.exit(1);
}
