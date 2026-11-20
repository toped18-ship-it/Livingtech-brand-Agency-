import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('firestore.rules enforces default-deny safety net and rules_version 2', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules covers every collection declared in firebase-blueprint.json (Phase 1, 2 & 3)', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const expectedMatches = [
    'match /users/{userId}',
    'match /admins/{adminUid}',
    'match /workspaces/{workspaceId}',
    'match /members/{memberId}',
    'match /posts/{postId}',
    'match /media/{mediaId}',
    'match /notifications/{notificationId}',
    'match /ai_brand_analyses/{analysisId}',
    'match /ai_content_strategies/{strategyId}',
    'match /content_campaigns/{campaignId}',
    'match /content_calendar/{calendarItemId}',
    'match /generated_content/{contentId}',
    'match /generated_images/{imageId}',
    'match /publishing_queue/{queueId}',
    'match /publishing_attempts/{attemptId}',
    'match /content_approvals/{approvalId}',
    'match /engagement_messages/{messageId}',
    'match /ai_reply_suggestions/{suggestionId}',
    'match /ai_generation_usage/{usageId}',
    'match /supportTickets/{ticketId}',
    'match /auditLogs/{logId}',
  ];
  assert.equal(Object.keys(blueprint.firestore).length, expectedMatches.length);
  for (const m of expectedMatches) {
    assert.ok(rules.includes(m), `Missing match block: ${m}`);
  }
});

test('Dirty Dozen & Phase 3 security invariants are explicitly enforced in firestore.rules', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  // 1. Self-admin escalation blocked
  assert.ok(rules.includes("incoming().role == 'customer'"));
  // 2. Email verification required for admin & verified writes
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  // 3. ID poisoning regex guard present
  assert.ok(rules.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  // 4. Temporal integrity via request.time
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
  // 5. Terminal state lock for published posts/queue & closed tickets
  assert.ok(rules.includes("existing().status != 'published'"));
  assert.ok(rules.includes("incoming().status != 'published'"));
  assert.ok(rules.includes("existing().status != 'closed'"));
  assert.ok(rules.includes("existing().decision == 'pending'"));
  // 6. Immutable ledgers
  assert.match(rules, /match \/auditLogs\/\{logId\}[\s\S]*allow update: if false;[\s\S]*allow delete: if false;/);
  assert.match(rules, /match \/publishing_attempts\/\{attemptId\}[\s\S]*allow update: if false;[\s\S]*allow delete: if false;/);
  assert.match(rules, /match \/ai_generation_usage\/\{usageId\}[\s\S]*allow update: if false;[\s\S]*allow delete: if false;/);
  // 7. No blanket isSignedIn() list rules
  assert.doesNotMatch(rules, /allow list:\s*if\s*isSignedIn\(\);/);
});
