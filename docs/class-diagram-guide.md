# Hướng dẫn vẽ Class Diagram ngắn gọn

Class diagram của project nên vẽ theo ERD hiện có trong thư mục `erd`: giữ các entity chính, thêm thuộc tính và hàm tiêu biểu. Không vẽ microservice, không vẽ ports/adapters, không vẽ toàn bộ service layer.

File draw.io hiện tại:

- `erd/class-diagram.drawio`
- Page: `Concise Class Diagram`
- Kiểu vẽ: giống ảnh mẫu, một canvas, box class đơn giản, enum riêng, association có multiplicity.

## 1. Các class cần vẽ

Vẽ đúng các entity chính trong ERD:

| Class | Biến chính | Hàm gợi ý |
| --- | --- | --- |
| `User` | `userId`, `username`, `email`, `fullName`, `userCode`, `role`, `isActive` | `login()`, `activate()`, `deactivate()` |
| `Subject` | `subjectId`, `code`, `name`, `description`, `isActive` | `updateInfo()`, `archive()` |
| `SubjectAssignment` | `assignmentId`, `subjectId`, `teacherId`, `assignedBy`, `status` | `activate()`, `remove()` |
| `Document` | `documentId`, `subjectId`, `uploadedBy`, `originalName`, `fileType`, `status`, `chapter` | `markProcessing()`, `markReady()`, `markFailed()` |
| `Chunk` | `chunkId`, `documentId`, `chunkIndex`, `content`, `embedding` | `similarity()`, `preview()` |
| `ChatSession` | `sessionId`, `userId`, `documentId`, `title`, `messages` | `addMessage()`, `delete()` |
| `QuestionQuota` | `userId`, `periodKey`, `questionCount`, `periodEnd` | `reserve()`, `release()`, `remaining()` |
| `SubscriptionPlan` | `planName`, `price`, `questionLimit`, `durationDays`, `isActive` | `isAvailable()`, `getLimit()` |
| `UserSubscription` | `subscriptionId`, `userId`, `planName`, `status`, `startDate`, `endDate` | `isExpired()`, `cancel()` |

## 2. Enum cần vẽ

Vẽ enum thành box riêng, nối bằng dependency nét đứt tới class dùng enum:

- `UserRole`: `admin`, `teacher`, `student`
- `AssignmentStatus`: `active`, `removed`
- `DocumentStatus`: `uploaded`, `processing`, `ready`, `failed`
- `FileType`: `pdf`, `docx`, `pptx`
- `PlanName`: `free`, `plus`, `pro`
- `SubscriptionStatus`: `active`, `expired`, `cancelled`

## 3. Quan hệ cần vẽ

Các quan hệ nên bám theo ERD:

| Quan hệ | Multiplicity | Ý nghĩa |
| --- | --- | --- |
| `User` - `UserRole` | dependency | User có role |
| `Subject` - `SubjectAssignment` | `1` - `*` | Một môn có nhiều phân công teacher |
| `User` - `SubjectAssignment` | `1` - `*` | Teacher/Admin xuất hiện trong assignment |
| `Subject` - `Document` | `1` - `*` | Một môn có nhiều tài liệu |
| `User` - `Document` | `1` - `*` | Teacher upload nhiều tài liệu |
| `Document` - `Chunk` | `1` - `*` composition | Tài liệu được tách thành nhiều chunk |
| `User` - `ChatSession` | `1` - `*` | Một user có nhiều chat session |
| `Document` - `ChatSession` | `1` - `*` | Chat được scope theo một document |
| `User` - `QuestionQuota` | `1` - `*` | Quota theo user từng tháng |
| `User` - `UserSubscription` | `1` - `*` | User có lịch sử gói |
| `SubscriptionPlan` - `UserSubscription` | `1` - `*` | Một plan có nhiều subscription |
| `SubscriptionPlan` - `QuestionQuota` | dependency | Plan hiện hành quyết định monthly limit của quota |

## 4. Style vẽ giống mẫu

- Title ở trên cùng: `EduSmart RAG Chatbot`
- Box class gồm 3 phần: tên class, biến, hàm.
- Dùng dấu `-` cho biến và `+` cho hàm.
- Box trắng, viền đen, không bo góc.
- Font Helvetica hoặc font mặc định draw.io.
- Connector vuông góc.
- Enum để riêng bên cạnh class dùng enum.
- Không đưa routes, controllers, middleware, adapters hoặc service layer vào sơ đồ này.
- Quan hệ `SubscriptionPlan -> QuestionQuota` chỉ là dependency nghiệp vụ, không phải ObjectId trong Mongo.

## 5. Lưu ý khi giải thích

Đây là class diagram ngắn gọn dựa trên ERD, không phải sơ đồ kiến trúc hệ thống. Các hàm trong class là domain behavior tiêu biểu để report dễ đọc; một số hàm đang được implement trong service code thay vì là method trực tiếp trên Mongoose model.
