# MongoDB Requirement Check

Ngày kiểm tra: 2026-06-28

## Kết luận ngắn

Trước khi sửa, MongoDB hiện tại không phản ánh đúng requirement Subject-only vì database đang dùng là database test/legacy:

- DB name trong `backend/.env`: `se1939-admin-classes-test-20260610`
- Có dữ liệu legacy như `legacy_student`, `legacy.pdf`, `Legacy subject`
- `users` còn field `enrolledSubjects`, trong khi requirement hiện tại không dùng enrollment
- `questionquotas` còn index cũ theo `userId + documentId`
- `subscriptionplans.free.questionLimit` trong DB đang là `5`, trong khi requirement/code hiện tại là `50`
- DB chưa có collection `emailnotifications` và `auditlogs`, nên Mongo diagram không thể hiện hai phần Notification/Audit

Đã chạy script sửa DB ngày 2026-06-28:

```text
backend/src/utils/fixSubjectOnlyDatabase.ts --apply
```

Backup snapshot trước khi sửa:

```text
/var/folders/pg/czqsnp813m17qxshwgs9sc7c0000gn/T/se1939-rag-chatbot-db-backups/subject-only-fix-2026-06-28T11-41-56-377Z.json
```

## Trạng thái sau khi sửa

Các điểm đã khớp requirement/app hiện tại:

- `users.enrolledSubjects`: còn `0` document
- Document legacy fields như `visibility`, `classIds`, `reviewedBy`, `reviewedAt`, `rejectionReason`: còn `0` document
- `questionquotas` index đúng:
  - `{ userId: 1, periodKey: 1 }` unique
  - `{ periodEnd: 1 }`
- `subscriptionplans` đúng quota:
  - Free: `50`
  - Plus: `300`
  - Pro: `1000`
- Đã có đủ collection:
  - `auditlogs`
  - `emailnotifications`

## Collection hiện có trong DB sau khi sửa

Atlas hiện có các collection:

- `auditlogs`
- `emailnotifications`
- `users`
- `subjects`
- `subjectassignments`
- `documents`
- `chunks`
- `chatsessions`
- `subscriptionplans`
- `usersubscriptions`
- `questionquotas`

## Điểm lệch quan trọng trước khi sửa

### 1. Database name là legacy/test

Tên database đang là:

```text
se1939-admin-classes-test-20260610
```

Tên này cho thấy DB từng dùng cho phiên bản có concept `classes`. Requirement mới đã chốt Subject-only, không dùng class/enrollment.

### 2. User còn field legacy `enrolledSubjects`

Sample trong `users` có:

```text
role: student
enrolledSubjects: [...]
```

Requirement mới nói Student xem mọi active Subject, không có enrollment theo môn/lớp.

### 3. Question quota index đang sai requirement

DB hiện tại:

```text
questionquotas index: { userId: 1, documentId: 1 } unique
```

Requirement/code hiện tại cần:

```text
questionquotas index: { userId: 1, periodKey: 1 } unique
```

Code đã khai báo đúng trong `backend/src/models/QuestionQuota.ts`, nhưng DB chưa được sync sang index mới.

### 4. Subscription plan trong DB chưa được seed theo requirement mới

DB hiện tại:

```text
free.questionLimit = 5
```

Requirement/code hiện tại:

```text
free.questionLimit = 50
plus.questionLimit = 300
pro.questionLimit = 1000
```

`backend/src/utils/seedPlans.ts` đã đúng, nên nhiều khả năng backend bản hiện tại chưa chạy seed trên database này.

### 5. Mongo diagram tự generate không hiểu quan hệ conceptual

MongoDB diagram thường suy luận quan hệ từ ObjectId trong data. Vì vậy nó sẽ lệch requirement ở các trường hợp:

- `UserSubscription.planName` là string, không phải ObjectId tới `subscriptionplans`
- `QuestionQuota` chưa có document, nên không có edge để suy luận
- `ChatSession.messages` và `Citation` là embedded object, không phải collection riêng
- `EmailNotification` và `AuditLog` chưa có collection/data nên không xuất hiện
- Field legacy như `users.enrolledSubjects` có thể tạo edge thừa tới `subjects`

## Vì sao hình Mongo đang nhìn sai

Hình Mongo hiện tại là diagram suy luận từ database cũ/stale, không phải diagram theo requirement. Nó hiển thị các collection hiện có và các reference Mongo suy ra được, nhưng không thể hiện đầy đủ rule nghiệp vụ:

- Student không enrollment
- Quota theo user + tháng UTC
- Subscription plan nối bằng `planName`
- Chat message/citation embedded trong chat session
- Email/audit chỉ xuất hiện khi collection đã được tạo

## Script đã thêm để sửa/verify lại DB

Đã thêm script:

```text
backend/src/utils/fixSubjectOnlyDatabase.ts
```

Lệnh dry-run:

```bash
cd backend
npm run db:fix-subject-only:dry
```

Lệnh apply:

```bash
cd backend
npm run db:fix-subject-only
```

Script này sẽ:

- backup snapshot vào thư mục temp trước khi apply
- seed lại subscription plans 50/300/1000
- remove field legacy `users.enrolledSubjects`
- remove field document legacy
- migrate quota legacy nếu có
- tạo collection `emailnotifications`, `auditlogs`
- sync indexes theo Mongoose models hiện tại

## Cách sửa DB cho khớp hơn trong tương lai

Không nên sửa trực tiếp khi chưa backup. Quy trình đề xuất:

1. Backup DB hiện tại.
2. Tạo DB mới đúng tên, ví dụ `se1939-rag-chatbot-subject-only`.
3. Trỏ `MONGODB_URI` sang DB mới.
4. Start backend bản hiện tại để chạy:
   - `seedInitialAdmin()`
   - `seedSubscriptionPlans()`
   - `migrateSubjectOnly()`
   - `syncIndexes()`
5. Nếu vẫn dùng DB cũ, cần drop index sai:
   - drop `questionquotas` index `{ userId: 1, documentId: 1 }`
   - tạo index `{ userId: 1, periodKey: 1 }`
6. Chạy lại seed plans để cập nhật quota 50/300/1000.
7. Xóa hoặc migrate field legacy như `users.enrolledSubjects` nếu không còn cần.

## Ghi chú cho class diagram/ERD

Không nên dựa hoàn toàn vào diagram Mongo auto-generate để vẽ requirement. Với project này, diagram đúng nên dựa trên:

- `PROJECT_REQUIREMENTS.md`
- Mongoose model trong `backend/src/models`
- ERD thủ công trong thư mục `erd`
- Quyết định Subject-only hiện tại
