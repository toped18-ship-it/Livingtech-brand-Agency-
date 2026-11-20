# LIVINGTECH BRAND AGENCY — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every workspace and its sub-resources (`members`, `posts`, `media`, `notifications`) belong to a single `ownerId`. A customer can NEVER read, list, update, or delete another customer's workspace or sub-collections.
2. **PII Isolation**: `/users/{userId}` contains `email` and account details; only `isOwner(userId)` or `isAdmin()` may read or write it. No blanket `isSignedIn()` reads exist anywhere.
3. **Role Privilege Escalation Prevention**: Users creating `/users/{userId}` MUST set `role == 'customer'` and CANNOT modify `role` on update. Only a verified Super-Admin (`isAdmin()`) may promote roles or write to `/admins/{adminUid}`.
4. **Master Gate Relational Sync**: Every sub-collection under `/workspaces/{workspaceId}/...` validates parent workspace existence and ownership via `get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid`.
5. **Path Variable Hardening**: Single-document operations validate `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars) to block ID poisoning.
6. **Temporal & Immutable Field Integrity**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on update; `ownerId` and `workspaceId` are immutable after create.
7. **Terminal State Locking**: Once a `ContentPost` reaches `status == 'published'` or a `SupportTicket` reaches `status == 'closed'`, non-admin updates are rejected.
8. **Immutable Audit Logs**: `/auditLogs/{logId}` is strictly append-only (`update` and `delete` are denied for everyone).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: `POST /users/{uid}` with `{ role: "super_admin", ... }` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection**: `PUT /workspaces/{id}` adding unpermitted field `isVerified: true` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Workspace Read**: User B calling `get /workspaces/{workspaceOwnedByA}` -> `PERMISSION_DENIED`.
4. **Cross-Tenant List Scraping**: User B listing `/workspaces` without matching `ownerId == User B` -> `PERMISSION_DENIED`.
5. **Cross-Tenant Post Creation**: User B creating `/workspaces/{workspaceA}/posts/{postId}` -> `PERMISSION_DENIED`.
6. **Owner Spoofing**: User A creating a workspace with `ownerId: "user_b_uid"` -> `PERMISSION_DENIED`.
7. **ID Poisoning (1.5KB ID)**: Creating `/workspaces/${'a'.repeat(1500)}` -> `PERMISSION_DENIED`.
8. **Value Poisoning**: Updating `workspaces/{id}.brandName` with a 5,000-char string or boolean -> `PERMISSION_DENIED`.
9. **Timestamp Backdating**: Creating a post with `createdAt: "2020-01-01"` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Terminal State Mutation**: Non-admin editing a `ContentPost` whose existing `status == 'published'` -> `PERMISSION_DENIED`.
11. **Unverified Admin Email Spoof**: Token with admin email but `email_verified: false` -> `PERMISSION_DENIED`.
12. **Audit Log Tampering**: Attempting `update` or `delete` on `/auditLogs/{logId}` -> `PERMISSION_DENIED`.
