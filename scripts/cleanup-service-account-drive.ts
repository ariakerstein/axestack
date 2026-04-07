/**
 * Cleanup Service Account Drive
 *
 * Lists and deletes files from the service account's Drive
 * to free up storage quota for Google Slides export.
 *
 * Usage: npx tsx scripts/cleanup-service-account-drive.ts
 */

import * as crypto from 'crypto';

// You'll need to paste your service account key here or load from env
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!SERVICE_ACCOUNT_KEY) {
  console.error('ERROR: Set GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
  console.error('Example: GOOGLE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\' npx tsx scripts/cleanup-service-account-drive.ts');
  process.exit(1);
}

function pemToBinary(pem: string): Buffer {
  const lines = pem.split('\n');
  const base64 = lines.filter(line => !line.startsWith('-----')).join('');
  return Buffer.from(base64, 'base64');
}

function base64UrlEncode(data: string | Buffer): string {
  const base64 = Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const key = JSON.parse(serviceAccountKey);

  console.log('Using service account:', key.client_email);
  console.log('Project ID:', key.project_id);

  // Create JWT
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Sign with private key
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(key.private_key);
  const signatureB64 = base64UrlEncode(signature);

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function listFiles(accessToken: string): Promise<any[]> {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name,mimeType,createdTime,size)',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  return data.files || [];
}

async function deleteFile(accessToken: string, fileId: string): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  return response.ok;
}

async function getStorageQuota(accessToken: string): Promise<any> {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  return data.storageQuota;
}

async function main() {
  console.log('\n🔑 Getting access token...');
  const accessToken = await getAccessToken(SERVICE_ACCOUNT_KEY);
  console.log('✅ Got access token\n');

  // Check current quota
  console.log('📊 Checking storage quota...');
  const quota = await getStorageQuota(accessToken);
  const usedGB = (parseInt(quota.usage || '0') / (1024 * 1024 * 1024)).toFixed(2);
  const limitGB = (parseInt(quota.limit || '0') / (1024 * 1024 * 1024)).toFixed(2);
  console.log(`   Used: ${usedGB} GB / ${limitGB} GB`);
  console.log(`   Usage in trash: ${((parseInt(quota.usageInDriveTrash || '0') / (1024 * 1024 * 1024)).toFixed(2))} GB\n`);

  // List files
  console.log('📁 Listing files in service account Drive...');
  const files = await listFiles(accessToken);

  if (files.length === 0) {
    console.log('   No files found in Drive.');
    console.log('\n⚠️  If quota is still exceeded, files may be in trash.');
    console.log('   Use the Drive API to empty trash or wait for auto-cleanup.');
    return;
  }

  console.log(`   Found ${files.length} files:\n`);

  files.forEach((file, index) => {
    const sizeKB = file.size ? (parseInt(file.size) / 1024).toFixed(1) + ' KB' : 'N/A';
    console.log(`   ${index + 1}. ${file.name}`);
    console.log(`      Type: ${file.mimeType}`);
    console.log(`      Size: ${sizeKB}`);
    console.log(`      Created: ${file.createdTime}`);
    console.log(`      ID: ${file.id}\n`);
  });

  // Ask for confirmation
  console.log('🗑️  Deleting all files to free up space...\n');

  let deleted = 0;
  let failed = 0;

  for (const file of files) {
    process.stdout.write(`   Deleting "${file.name}"... `);
    const success = await deleteFile(accessToken, file.id);
    if (success) {
      console.log('✅');
      deleted++;
    } else {
      console.log('❌');
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${deleted} deleted, ${failed} failed`);

  // Empty trash
  console.log('\n🗑️  Emptying trash...');
  const trashResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files/trash',
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  if (trashResponse.ok) {
    console.log('✅ Trash emptied');
  } else {
    console.log('⚠️  Could not empty trash (may already be empty)');
  }

  // Check quota again
  console.log('\n📊 Checking storage quota after cleanup...');
  const newQuota = await getStorageQuota(accessToken);
  const newUsedGB = (parseInt(newQuota.usage || '0') / (1024 * 1024 * 1024)).toFixed(2);
  console.log(`   Used: ${newUsedGB} GB / ${limitGB} GB\n`);

  console.log('✅ Done! Try exporting to Google Slides again.');
}

main().catch(console.error);
