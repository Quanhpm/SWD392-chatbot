# Use Case Diagram - Smart RAG Learning Platform

This diagram describes the current Teacher/Student business flow of the project.
The app is no longer modeled as a single-user demo: teachers own subjects and
uploaded documents, while students enroll in subjects, read documents, and chat
with the chatbot inside one selected document.

## Actors

| Actor | Description |
| --- | --- |
| Teacher | Creates subjects, shares subject passwords, uploads/manages their own documents, and approves paid subscription requests. |
| Student | Enrolls in subjects, reads indexed documents, uses study assist, chats with the selected document, and requests plan upgrades. |
| Gemini API | Generates embeddings, study assist content, and chat answers. |
| MongoDB | Stores users, subjects, documents, chunks, chat sessions, subscriptions, and document-scoped quotas. |

## Main Use Cases

| Group | Use Case | Description |
| --- | --- | --- |
| Subject and Document Management | Create subject | Teacher creates a subject with a password for student enrollment. |
| Subject and Document Management | Upload document | Teacher uploads PDF, DOCX, or PPTX files to a subject they created. |
| Subject and Document Management | Index document | System parses text, chunks content, generates embeddings, and stores indexed chunks. |
| Subject and Document Management | Delete own subject/document | Teacher can delete only subjects/documents they own; document deletion also removes related chunks, assist data, chat sessions, and quota records. |
| Learning | Enroll in subject | Student enters the subject password to join. |
| Learning | Read enrolled documents | Student can read only documents from enrolled subjects. |
| Learning | View/generate study assist | Student can view cached study assist or request generated takeaways/flashcards. |
| Document-scoped Chat | Start document chat | User selects one indexed document and starts a chat session scoped to that document. |
| Document-scoped Chat | Ask question | Student question is checked against quota, then answered using chunks from the selected document only. |
| Subscription | Request upgrade | Student requests Plus/Pro when more questions are needed. |
| Subscription | Approve/reject upgrade | Teacher/admin approver activates or rejects pending paid subscriptions. |

## Key Business Rules

- Free plan allows **5 questions per student per document**.
- The 6th question in the same document requires an upgraded plan.
- Quota records are keyed by `userId + documentId`, not by subject.
- Teachers can manage only their own subjects and uploaded documents.
- Students can access documents only from subjects they have enrolled in.
- Chat retrieval is restricted to the selected document to prevent cross-document leakage.

## PlantUML Source

The editable PlantUML file is here:

[`docs/use-case-diagram.puml`](./use-case-diagram.puml)
