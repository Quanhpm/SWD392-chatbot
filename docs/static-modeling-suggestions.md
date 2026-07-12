# Static Modeling Suggestions for SE1939 RAG Chatbot

## Cach doc mau trong Group1-SWD392-Report.pdf

Trong file `Group1-SWD392-Report.pdf`, phan can lam theo nam o muc `7. STATIC MODELING`.

- `7.1. Conceptual ERD`: mau chia ERD theo tung logical view/module de de doc, khong phai microservice. Moi hinh chi ve entity va quan he/cardinality, khong liet ke day du thuoc tinh. Entity mau hong la du lieu replica hoac entity duoc tham chieu tu module khac.
- `7.2. Class diagram`: mau chi tiet hon ERD. Moi class co ten, attributes, methods chinh, enum rieng, multiplicity `1`, `*`, `0..1`, va composition/aggregation khi class chua cac phan con.

Voi project hien tai, nen ve theo domain "Subject-only RAG". Khong nen dua lai cac entity legacy nhu `Class`, `ClassEnrollment`, `DocumentAssist`, `Flashcard`, `Takeaway`, quiz/assessment neu code/report hien tai khong con ho tro chung.

## 7.1. Conceptual ERD de xuat

### Figure 7.1.1: Identity and Access ERD

Muc dich: mo ta tai khoan, role, subject va viec admin gan teacher cho subject.

Entity nen ve:

- `USER`
- `SUBJECT`
- `SUBJECT_ASSIGNMENT`

Quan he:

- `USER(Admin)` 1 - N `SUBJECT` qua `createdBy`
- `SUBJECT` 1 - N `SUBJECT_ASSIGNMENT`
- `USER(Teacher)` 1 - N `SUBJECT_ASSIGNMENT` qua `teacherId`
- `USER(Admin)` 1 - N `SUBJECT_ASSIGNMENT` qua `assignedBy`

Ghi chu tren hinh:

- Student khong co enrollment trong version hien tai. Student duoc xem tat ca active subjects.
- Teacher chi quan ly subject khi co `SUBJECT_ASSIGNMENT.status = active`.

### Figure 7.1.2: Document Repository ERD

Muc dich: mo ta tai lieu thuoc mon nao, ai upload, va trang thai xu ly.

Entity nen ve:

- `SUBJECT`
- `DOCUMENT`
- `USER`

Quan he:

- `SUBJECT` 1 - N `DOCUMENT`
- `USER(Teacher/Admin)` 1 - N `DOCUMENT` qua `uploadedBy`

Thong tin nen ghi nho trong box `DOCUMENT`:

- `status: uploaded | processing | ready | failed`
- `fileType: pdf | docx | pptx`
- `chapter`, `chapterTitle`, `totalChunks`, `totalPages`

### Figure 7.1.3: RAG Indexing ERD

Muc dich: tach ro quy trinh index tai lieu thanh chunks va embeddings.

Entity nen ve:

- `DOCUMENT`
- `CHUNK`
- `EMBEDDING`

Quan he:

- `DOCUMENT` 1 - N `CHUNK`
- `CHUNK` 1 - 1 `EMBEDDING`

Neu muon gon hon, co the gop `EMBEDDING` thanh thuoc tinh cua `CHUNK` vi trong MongoDB embedding la mang number nam trong collection `chunks`.

Thong tin nen ghi nho:

- `CHUNK` co `content`, `chunkIndex`, `pageNumbers`, `startChar`, `endChar`, `tokenCount`, `metadata`
- `EMBEDDING` la vector do Gemini tao, dung cho cosine similarity.

### Figure 7.1.4: RAG Chat and Citation ERD

Muc dich: mo ta chat session, messages va citation tra ve tu chunks.

Entity nen ve:

- `USER`
- `SUBJECT`
- `DOCUMENT`
- `CHAT_SESSION`
- `CHAT_MESSAGE` as embedded entity
- `CITATION` as embedded entity
- `CHUNK`

Quan he:

- `USER` 1 - N `CHAT_SESSION`
- `SUBJECT` 1 - N `CHAT_SESSION`
- `DOCUMENT` 1 - N `CHAT_SESSION`
- `CHAT_SESSION` 1 - N `CHAT_MESSAGE` composition
- `CHAT_MESSAGE(assistant)` 0 - N `CITATION` composition
- `CITATION` N - 1 `DOCUMENT`
- `CITATION` N - 1 `CHUNK` conceptually qua `chunkIndex` va metadata

Ghi chu:

- Trong MongoDB, `messages` va `citations` duoc nhung trong `chatsessions`, khong phai collection rieng.
- Chat bi scope theo 1 document, nen retrieval chi lay chunks cua document dang chon.

### Figure 7.1.5: Subscription and Quota ERD

Muc dich: mo ta plan, dang ky goi va quota hoi dap hang thang.

Entity nen ve:

- `USER`
- `SUBSCRIPTION_PLAN`
- `USER_SUBSCRIPTION`
- `QUESTION_QUOTA`

Quan he:

- `USER` 1 - N `USER_SUBSCRIPTION`
- `SUBSCRIPTION_PLAN` 1 - N `USER_SUBSCRIPTION` conceptually qua `planName`
- `USER` 1 - N `QUESTION_QUOTA`

Ghi chu:

- Free/Plus/Pro lan luot co quota 50/300/1000 cau hoi cho student.
- Teacher co quota 100 cau hoi/thang.
- Admin unlimited, co the ghi note rieng thay vi tao quota.
- `QUESTION_QUOTA` unique theo `(userId, periodKey)`.

### Figure 7.1.6: Notification and Audit ERD

Muc dich: mo ta email outbox va lich su audit.

Entity nen ve:

- `USER`
- `EMAIL_NOTIFICATION`
- `AUDIT_LOG`
- `SUBJECT`
- `SUBJECT_ASSIGNMENT`
- `DOCUMENT`
- `USER_SUBSCRIPTION`

Quan he:

- `USER` 1 - N `AUDIT_LOG` qua `actorId`
- `AUDIT_LOG` N - 1 target entity qua `entityType` + `entityId`
- `EMAIL_NOTIFICATION` doc lap, tham chieu recipient bang email thay vi `userId`

Target entity cua audit:

- `user`
- `subject`
- `subjectAssignment`
- `document`
- `subscription`

Ghi chu:

- Email outbox co `queued | sent | failed`, `attempts`, `nextAttemptAt`, `sentAt`.
- Audit ghi cac hanh dong create/update/archive/upload/delete/subscribe/cancel.

## 7.2. Class diagram de xuat

### Figure 7.2.1: Account, Authentication and Admin Class Diagram

Class/enum nen ve:

- `User`
  - Attributes: `username`, `password`, `role`, `fullName`, `email`, `userCode`, `isActive`, `deactivatedAt`, `createdAt`
  - Methods goi y: `isAdmin()`, `activate()`, `deactivate()`, `hashPassword()`
- `AuthService`
  - Methods: `login(username, password)`, `generateToken(user)`
- `AdminService`
  - Methods: `listUsers()`, `createUser()`, `updateUser()`, `resetPassword()`, `deactivateUser()`, `activateUser()`
- `EmailService`
  - Methods: `sendAccountCreated()`, `sendPasswordReset()`
- `UserRole <<enumeration>>`
  - `admin`, `teacher`, `student`

Quan he:

- `AdminService` uses `User`
- `AuthService` authenticates `User`
- `AdminService` uses `EmailService`

### Figure 7.2.2: Subject and Access Control Class Diagram

Class/enum nen ve:

- `Subject`
  - Attributes: `code`, `name`, `description`, `isActive`, `createdBy`, `createdAt`
  - Methods: `archive()`, `updateInfo()`
- `SubjectAssignment`
  - Attributes: `subjectId`, `teacherId`, `assignedBy`, `assignedAt`, `status`, `removedAt`
  - Methods: `activate()`, `remove()`
- `SubjectService`
  - Methods: `listSubjects()`, `createSubject()`, `updateSubject()`, `archiveSubject()`, `assignTeacher()`, `removeTeacher()`
- `AccessService`
  - Methods: `getAccessibleSubjectIds()`, `hasSubjectAccess()`, `assertSubjectAccess()`, `assertDocumentAccess()`
- `AssignmentStatus <<enumeration>>`
  - `active`, `removed`

Quan he:

- `Subject` 1 - * `SubjectAssignment`
- `User(Teacher)` 1 - * `SubjectAssignment`
- `User(Admin)` 1 - * `SubjectAssignment` qua `assignedBy`
- `SubjectService` uses `SubjectAssignment`, `User`, `EmailService`
- `AccessService` uses `Subject`, `SubjectAssignment`, `Document`

### Figure 7.2.3: Document Repository and Indexing Class Diagram

Class/interface/enum nen ve:

- `Document`
  - Attributes: `fileName`, `originalName`, `fileType`, `fileSize`, `mimeType`, `subjectId`, `subject`, `chapter`, `chapterTitle`, `status`, `totalChunks`, `totalPages`, `uploadedAt`, `processedAt`, `indexedAt`, `uploadedBy`
  - Methods: `markProcessing()`, `markReady()`, `markFailed()`
- `Chunk`
  - Attributes: `documentId`, `content`, `chunkIndex`, `pageNumbers`, `startChar`, `endChar`, `tokenCount`, `embedding`, `metadata`, `createdAt`
- `DocumentService`
  - Methods: `createDocument()`, `listDocuments()`, `getDocumentById()`, `updateMetadata()`, `deleteDocument()`, `queueProcessing()`, `processDocument()`
- `IParserPort <<interface>>`
  - `parse(filePath, fileType)`
- `IEmbeddingPort <<interface>>`
  - `generateEmbedding(text)`, `generateEmbeddings(texts)`
- `ParserAdapter`
  - `parse()`, `parsePdf()`, `parseDocx()`, `parsePptx()`
- `GeminiEmbeddingAdapter`
  - `generateEmbedding()`, `generateEmbeddings()`
- `DocumentStatus <<enumeration>>`
  - `uploaded`, `processing`, `ready`, `failed`
- `FileType <<enumeration>>`
  - `pdf`, `docx`, `pptx`

Quan he:

- `Subject` 1 - * `Document`
- `User` 1 - * `Document` qua `uploadedBy`
- `Document` 1 - * `Chunk` composition
- `DocumentService` depends on `IParserPort`
- `DocumentService` depends on `IEmbeddingPort`
- `ParserAdapter` implements `IParserPort`
- `GeminiEmbeddingAdapter` implements `IEmbeddingPort`

### Figure 7.2.4: RAG Chat, Retrieval and Citation Class Diagram

Class/interface/enum nen ve:

- `ChatSession`
  - Attributes: `title`, `subjectId`, `documentId`, `userId`, `messages`, `archivedMessagesCount`, `createdAt`, `updatedAt`
  - Methods: `addMessage()`, `archiveOverflowMessages()`
- `ChatMessage`
  - Attributes: `role`, `content`, `citations`, `createdAt`
- `Citation`
  - Attributes: `documentId`, `fileName`, `subject`, `chapter`, `chapterTitle`, `pageNumbers`, `chunkIndex`, `similarityScore`, `snippetPreview`
- `ChatService`
  - Methods: `createChatSession()`, `listChatSessions()`, `getChatSession()`, `deleteChatSession()`, `generateChatResponse()`, `saveAndCacheSession()`
- `RetrievalService`
  - Methods: `retrieveRelevantChunks()`
- `CitationService`
  - Methods: `buildCitations()`
- `ILLMPort <<interface>>`
  - `callLLM(systemPrompt, history, currentPrompt)`
- `ICachePort <<interface>>`
  - `get()`, `set()`, `del()`, `exists()`
- `GeminiChatAdapter`
  - `callLLM()`
- `RedisCacheAdapter`, `InMemoryCacheAdapter`
  - `get()`, `set()`, `del()`, `exists()`
- `MessageRole <<enumeration>>`
  - `user`, `assistant`

Quan he:

- `User` 1 - * `ChatSession`
- `Document` 1 - * `ChatSession`
- `ChatSession` 1 - * `ChatMessage` composition
- `ChatMessage` 0 - * `Citation` composition
- `Citation` references `Document` and conceptually points to `Chunk`
- `ChatService` depends on `IEmbeddingPort`, `ILLMPort`, `ICachePort`, `SubscriptionService`
- `GeminiChatAdapter` implements `ILLMPort`
- `RedisCacheAdapter` and `InMemoryCacheAdapter` implement `ICachePort`

### Figure 7.2.5: Subscription and Quota Class Diagram

Class/enum nen ve:

- `SubscriptionPlan`
  - Attributes: `name`, `displayName`, `price`, `questionLimit`, `durationDays`, `features`, `isActive`, `sortOrder`, `createdAt`
  - Methods: `isAvailable()`
- `UserSubscription`
  - Attributes: `userId`, `planName`, `status`, `startDate`, `endDate`, `paymentMethod`, `paymentReference`, `createdAt`
  - Methods: `isExpired()`, `cancel()`
- `QuestionQuota`
  - Attributes: `userId`, `periodKey`, `questionCount`, `periodStart`, `periodEnd`, `lastQuestionAt`
  - Methods: `reserve()`, `release()`, `remaining(limit)`
- `SubscriptionService`
  - Methods: `getPlans()`, `getUserSubscription()`, `getEffectivePlan()`, `subscribeToPlan()`, `cancelSubscription()`, `checkQuota()`, `reserveQuota()`, `releaseQuota()`, `expireSubscriptions()`, `resetMonthlyQuotas()`
- `PlanName <<enumeration>>`
  - `free`, `plus`, `pro`
- `SubscriptionStatus <<enumeration>>`
  - `active`, `expired`, `cancelled`

Quan he:

- `User` 1 - * `UserSubscription`
- `SubscriptionPlan` 1 - * `UserSubscription` conceptually qua `planName`
- `User` 1 - * `QuestionQuota`
- `SubscriptionService` manages `SubscriptionPlan`, `UserSubscription`, `QuestionQuota`

### Figure 7.2.6: Notification and Audit Class Diagram

Class/enum nen ve:

- `EmailNotification`
  - Attributes: `event`, `recipientEmail`, `recipientName`, `subject`, `text`, `html`, `status`, `attempts`, `maxAttempts`, `lastError`, `messageId`, `nextAttemptAt`, `sentAt`, `createdAt`, `updatedAt`
  - Methods: `markQueued()`, `markSent()`, `markFailed()`, `canRetry()`
- `EmailService`
  - Methods: `isEnabled()`, `verifyConnection()`, `sendAccountCreated()`, `sendPasswordReset()`, `sendTeacherSubjectAssignment()`, `sendTest()`, `retryPendingNotifications()`, `retryNotification()`, `dispatchNotification()`
- `AuditLog`
  - Attributes: `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `metadata`, `createdAt`
- `AuditService`
  - Methods: `recordAuditLog()`, `listAuditLogs()`
- `EmailStatus <<enumeration>>`
  - `queued`, `sent`, `failed`
- `AuditAction <<enumeration>>`
  - `user.create`, `user.update`, `user.password.reset`, `user.deactivate`, `user.activate`, `subject.create`, `subject.update`, `subject.archive`, `subject.assignment.add`, `subject.assignment.remove`, `document.upload`, `document.metadata.update`, `document.delete`, `subscription.subscribe`, `subscription.cancel`
- `AuditEntityType <<enumeration>>`
  - `user`, `subject`, `subjectAssignment`, `document`, `subscription`

Quan he:

- `EmailService` creates and dispatches `EmailNotification`
- `AuditService` creates `AuditLog`
- `User` 1 - * `AuditLog` qua `actorId`
- `AuditLog` points to target entity by `entityType` + `entityId`

### Figure 7.2.7: Hexagonal Ports and Adapters Class Diagram

Nen ve hinh nay neu muon ghi diem kien truc, vi project co san ports/adapters.

Class/interface nen ve:

- Core services: `DocumentService`, `ChatService`, `SubscriptionService`, `AuthService`, `AdminService`, `EmailService`
- Ports: `IParserPort`, `IEmbeddingPort`, `ILLMPort`, `ICachePort`
- Adapters: `ParserAdapter`, `GeminiEmbeddingAdapter`, `GeminiChatAdapter`, `RedisCacheAdapter`, `InMemoryCacheAdapter`
- Composition root: `dependencies.ts`

Quan he:

- `DocumentService` depends on `IParserPort`, `IEmbeddingPort`
- `ChatService` depends on `IEmbeddingPort`, `ILLMPort`, `ICachePort`, `SubscriptionService`
- `ParserAdapter` implements `IParserPort`
- `GeminiEmbeddingAdapter` implements `IEmbeddingPort`
- `GeminiChatAdapter` implements `ILLMPort`
- `RedisCacheAdapter` and `InMemoryCacheAdapter` implement `ICachePort`
- `dependencies.ts` creates adapters and injects them into services

## Goi y format khi dua vao report

Nen dat caption theo mau:

- `Figure 7.1.1: Identity and Access ERD.`
- `Figure 7.1.2: Document Repository ERD.`
- `Figure 7.1.3: RAG Indexing ERD.`
- `Figure 7.1.4: RAG Chat and Citation ERD.`
- `Figure 7.1.5: Subscription and Quota ERD.`
- `Figure 7.1.6: Notification and Audit ERD.`
- `Figure 7.2.1: Account, Authentication and Admin Class Diagram.`
- `Figure 7.2.2: Subject and Access Control Class Diagram.`
- `Figure 7.2.3: Document Repository and Indexing Class Diagram.`
- `Figure 7.2.4: RAG Chat, Retrieval and Citation Class Diagram.`
- `Figure 7.2.5: Subscription and Quota Class Diagram.`
- `Figure 7.2.6: Notification and Audit Class Diagram.`
- `Figure 7.2.7: Hexagonal Ports and Adapters Class Diagram.`

## Checklist chong sot

- Co day du 11 collection dang dung: `users`, `subjects`, `subjectassignments`, `documents`, `chunks`, `chatsessions`, `subscriptionplans`, `usersubscriptions`, `questionquotas`, `emailnotifications`, `auditlogs`.
- Trong ERD conceptual, khong can liet ke moi field, nhung phai co cardinality.
- Trong class diagram, moi class nen co 3 phan: name, attributes, methods.
- Enum nen ve thanh box rieng va noi bang dashed dependency toi class dung enum.
- Embedded MongoDB objects nhu `ChatMessage`, `Citation`, `Document.metadata` nen ve bang composition hoac nested box.
- Neu ve entity cross-module, dung mau hong/label `external reference` giong mau Group1.
- Khong dua vao static model cac chuc nang khong con trong domain hien tai: class enrollment, subject password, quiz, flashcard, study assist.
