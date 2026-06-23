# Use cases — Subject-only RAG

## Actors

| Actor | Responsibilities |
|---|---|
| Admin | Manage accounts and subjects, assign teachers, manage all documents, run evaluation, chat without quota. |
| Teacher | View assigned subjects, upload documents, manage their own documents, and chat up to 100 questions per UTC month. |
| Student | View all active subjects and ready documents, chat using the current plan quota. |
| Gemini API | Generate embeddings and RAG answers grounded in document chunks. |
| SMTP/Gmail | Dispatch queued account and subject-assignment notifications. |

## Main flows

1. Admin creates a subject and assigns one or more active teachers.
2. An assigned teacher uploads a PDF, DOCX, or PPTX document to that subject.
3. The system processes the file through `uploaded → processing → ready | failed`.
4. A ready document is published automatically to authenticated students.
5. A user creates a document chat and receives grounded answers with citations.
6. The system reserves quota atomically for teachers and students; admins are unlimited.
7. Email notifications are queued, sent, retried if needed, and visible to Admin.
8. Document upload, metadata update, and delete actions are recorded in audit logs.

There is no Class, Enrollment, roster, join code, subject password, document approval, quiz, flashcard, or Study Assist flow.
