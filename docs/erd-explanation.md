# ERD explanation — Subject-only model

The runtime domain contains no Class or Enrollment entity. Access is based on an authenticated account, subject state, and teacher assignment.

## Core relationships

| Source | Target | Cardinality | Meaning |
|---|---|---:|---|
| Subject | SubjectAssignment | 1 - N | Assignment history for teachers in a subject. |
| User (Teacher) | SubjectAssignment | 1 - N | A teacher may be assigned to multiple subjects. |
| Subject | Document | 1 - N | Every document belongs directly to one subject. |
| User (Teacher) | Document | 1 - N | `uploadedBy` preserves document ownership. |
| Document | Chunk | 1 - N | Parsed text and embeddings used by RAG. |
| User | ChatSession | 1 - N | Chat history is private to its creator. |
| Document | ChatSession | 1 - N | Every chat is grounded in one document. |
| User | MonthlyUsage | 1 - N | One atomic usage counter per UTC month. |
| EmailNotification | User/email recipient | N - 1 | Transactional email outbox with queued/sent/failed status and retry metadata. |
| User | AuditLog | 1 - N | Document upload, metadata update, and delete actions are audited. |

## SubjectAssignment

An assignment stores `subjectId`, `teacherId`, `assignedBy`, `assignedAt`, `status`, and `removedAt`. The `(subjectId, teacherId)` pair is unique. Removing an assignment revokes management access but preserves its history and existing documents.

## Document lifecycle and access

`uploaded → processing → ready | failed`

- Admin can see, edit metadata, retry, and delete every document.
- An assigned teacher can see all documents in the subject, but can edit metadata, retry, and delete only documents they uploaded.
- A student can see and chat only with `ready` documents in active subjects.
- Successful processing publishes a document automatically; there is no reviewer state.

## Quota

Quota is account-wide per UTC month, not per document: Student Free/Plus/Pro = 50/300/1000, Teacher = 100, Admin = unlimited. Question reservation uses an atomic database update to avoid concurrent overuse.

## Email and audit

Transactional email is written to an outbox first, then dispatched through SMTP. Each notification stores event, recipient, status, attempts, next retry time, and send result. Admin can inspect and retry notifications.

Document upload, metadata update, and delete actions create audit log records with actor, action, entity id, timestamp, and metadata.

## Removed concepts

Class, Enrollment, roster, join code, subject password, document visibility scopes, document approval, quiz, flashcard, and Study Assist are not part of the current domain. Legacy records are archived or ignored by the Subject-only migration.
