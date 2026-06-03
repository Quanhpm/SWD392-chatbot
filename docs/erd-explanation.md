# Smart RAG Learning Platform - ERD Explanation

File ERD chính: [`docs/erd.drawio`](./erd.drawio)

## 1. Tổng quan

ERD này mô tả mô hình dữ liệu logic của hệ thống Smart RAG Learning Platform. Dự án dùng MongoDB và Mongoose, nên đây không phải ERD quan hệ thuần như MySQL/PostgreSQL, mà là ERD logic để thể hiện collection, khóa, reference, embedded subdocument và bội số quan hệ.

Luồng dữ liệu chính:

1. Giáo viên tạo `subjects`.
2. Giáo viên upload `documents` vào từng `subjects`.
3. Mỗi `documents` được tách thành nhiều `chunks` để phục vụ RAG.
4. Người học chat với tài liệu thông qua `chat_sessions`.
5. Hệ thống theo dõi quota câu hỏi bằng `question_quotas`.
6. Người dùng có thể đăng ký gói học qua `subscription_plans` và `user_subscriptions`.

## 2. Ký hiệu trong ERD

| Ký hiệu | Ý nghĩa |
| --- | --- |
| `PK` | Primary Key, khóa chính của collection. |
| `FK` | Foreign Key/reference sang collection khác. Trong MongoDB thường là `ObjectId`. |
| `UQ` | Unique constraint/index, giá trị không được trùng. |
| `[]` | Mảng dữ liệu. |
| `?` | Trường không bắt buộc hoặc có thể `null`. |
| Đường liền | Quan hệ chính, bắt buộc hoặc quan hệ nghiệp vụ thường dùng. |
| Đường nét đứt | Quan hệ phụ hoặc optional reference. |
| Crow's foot | Thể hiện bội số quan hệ: một-nhiều, nhiều-nhiều, một-một. |

## 3. Các collection

### 3.1. `users`

Lưu thông tin tài khoản người dùng.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của user. |
| `username` | Tên đăng nhập, unique. |
| `password` | Mật khẩu đã được hash. |
| `role` | Vai trò: `teacher` hoặc `student`. |
| `enrolledSubjects[]` | Danh sách subject mà student đã tham gia. |
| `createdAt` | Thời điểm tạo tài khoản. |

Quan hệ chính:

| Quan hệ | Bội số | Ý nghĩa |
| --- | --- | --- |
| `users` - `subjects` qua `teacherId` | 1 user tạo nhiều subject | Teacher là người sở hữu môn học. |
| `users` - `subjects` qua `enrolledSubjects[]` | nhiều-nhiều | Student có thể enroll nhiều subject, và một subject có nhiều student. |
| `users` - `documents` qua `uploadedBy` | 1 user upload nhiều document | Teacher upload tài liệu. |
| `users` - `chat_sessions` qua `userId` | 1 user có nhiều chat session | Mỗi đoạn chat thuộc về một user. |
| `users` - `question_quotas` qua `userId` | 1 user có nhiều quota record | Theo dõi số câu hỏi theo user và document. |
| `users` - `user_subscriptions` qua `userId` | 1 user có nhiều subscription request | User là người mua hoặc yêu cầu gói. |
| `users` - `user_subscriptions` qua `approvedBy` | 1 user duyệt nhiều subscription | User có vai trò duyệt gói, thường là teacher/admin. |

### 3.2. `subjects`

Lưu thông tin môn học/lớp học.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của subject. |
| `name` | Tên subject, unique. |
| `description` | Mô tả subject, optional. |
| `password` | Mật khẩu join subject, đã hash. |
| `teacherId` | User tạo subject. |
| `createdAt` | Thời điểm tạo subject. |

Quan hệ chính:

| Quan hệ | Bội số | Ý nghĩa |
| --- | --- | --- |
| `subjects` - `documents` | 1 subject có nhiều document | Tài liệu được upload theo từng subject. |
| `subjects` - `chat_sessions` | 1 subject có nhiều chat session | Chat session nằm trong ngữ cảnh một subject. |

### 3.3. `documents`

Lưu metadata của tài liệu học tập được upload.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của document. |
| `fileName` | Tên file lưu trong hệ thống, unique. |
| `originalName` | Tên file gốc người dùng upload. |
| `fileType` | Loại file: `pdf`, `docx`, `pptx`. |
| `subjectId` | Subject chứa tài liệu. |
| `uploadedBy` | User upload tài liệu. |
| `chapter` | Chương của tài liệu. |
| `status` | Trạng thái xử lý: `uploaded`, `processing`, `indexed`, `failed`. |
| `totalChunks` | Tổng số chunk sau khi xử lý. |
| `uploadedAt` | Thời điểm upload. |
| `indexedAt` | Thời điểm index xong, optional. |

Quan hệ chính:

| Quan hệ | Bội số | Ý nghĩa |
| --- | --- | --- |
| `documents` - `chunks` | 1 document có nhiều chunk | Tài liệu được chia nhỏ để embedding và retrieval. |
| `documents` - `document_assists` | 1 document có tối đa 1 assist record | Một tài liệu có một bộ takeaways/flashcards. |
| `documents` - `chat_sessions` | 1 document có nhiều chat session | Người dùng chat theo từng document. |
| `documents` - `question_quotas` | 1 document có nhiều quota record | Quota được tính theo cặp user-document. |

### 3.4. `chunks`

Lưu các đoạn văn bản nhỏ được tách ra từ document để phục vụ RAG.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của chunk. |
| `documentId` | Document chứa chunk này. |
| `content` | Nội dung văn bản của chunk. |
| `chunkIndex` | Thứ tự chunk trong document. |
| `pageNumbers[]` | Các trang liên quan. |
| `embedding[]` | Vector embedding dùng để tìm kiếm ngữ nghĩa. |
| `metadata` | Metadata nhúng như subject, chapter, fileName. |
| `createdAt` | Thời điểm tạo chunk. |

Ghi chú: `chunks` là collection quan trọng nhất cho pipeline RAG vì retrieval sẽ tìm các chunk gần nhất với câu hỏi của người dùng.

### 3.5. `document_assists`

Lưu nội dung hỗ trợ học tập được sinh ra từ tài liệu.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của assist record. |
| `documentId` | Document liên quan, unique. |
| `takeaways[]` | Các ý chính được sinh tự động. |
| `flashcards[]` | Các flashcard hỏi-đáp. |
| `createdAt` | Thời điểm tạo assist record. |

Quan hệ `documents` - `document_assists` là một-một vì `documentId` trong `document_assists` có unique constraint.

### 3.6. `chat_sessions`

Lưu lịch sử chat của user với một document cụ thể.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của chat session. |
| `title` | Tiêu đề đoạn chat. |
| `userId` | User sở hữu đoạn chat. |
| `subjectId` | Subject đang chat. |
| `documentId` | Document đang chat. |
| `messages[]` | Các message của user và assistant. |
| `createdAt` | Thời điểm tạo session. |
| `updatedAt` | Thời điểm cập nhật cuối. |

Ghi chú: `messages[]` và citations được embed trong `chat_sessions`, vì đây là dữ liệu con thuộc trực tiếp một phiên chat.

### 3.7. `question_quotas`

Theo dõi số lượng câu hỏi của user trên từng document trong một chu kỳ.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của quota record. |
| `userId` | User bị tính quota. |
| `documentId` | Document được hỏi. |
| `questionCount` | Số câu hỏi đã dùng. |
| `periodStart` | Thời điểm bắt đầu chu kỳ. |
| `periodEnd` | Thời điểm kết thúc chu kỳ, có thể `null`. |
| `lastQuestionAt` | Lần hỏi gần nhất. |

Constraint quan trọng:

| Constraint | Ý nghĩa |
| --- | --- |
| `UQ userId + documentId` | Mỗi user chỉ có một quota record cho một document trong logic hiện tại. |

### 3.8. `subscription_plans`

Lưu danh sách các gói đăng ký.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của plan. |
| `name` | Tên gói: `free`, `plus`, `pro`, unique. |
| `displayName` | Tên hiển thị. |
| `price` | Giá gói. |
| `questionLimit` | Số câu hỏi được phép. |
| `durationDays` | Số ngày hiệu lực, `null` với gói vĩnh viễn. |
| `features[]` | Danh sách tính năng. |
| `isActive` | Gói còn đang được bán hay không. |

### 3.9. `user_subscriptions`

Lưu lịch sử yêu cầu/mua gói của user.

| Field | Ý nghĩa |
| --- | --- |
| `_id` | Khóa chính của subscription record. |
| `userId` | User yêu cầu/mua gói. |
| `planName` | Gói được chọn: `free`, `plus`, `pro`. |
| `status` | Trạng thái: `pending`, `active`, `expired`, `cancelled`. |
| `startDate` | Ngày bắt đầu. |
| `endDate` | Ngày kết thúc, có thể `null`. |
| `paymentMethod` | Phương thức thanh toán. |
| `paymentReference` | Mã tham chiếu thanh toán, optional. |
| `approvedBy` | User duyệt subscription, optional. |

Quan hệ chính:

| Quan hệ | Bội số | Ý nghĩa |
| --- | --- | --- |
| `subscription_plans` - `user_subscriptions` | 1 plan có nhiều subscription | Nhiều user có thể đăng ký cùng một gói. |
| `users` - `user_subscriptions` qua `userId` | 1 user có nhiều subscription | User là người sở hữu subscription. |
| `users` - `user_subscriptions` qua `approvedBy` | 1 user duyệt nhiều subscription | Người duyệt có thể duyệt nhiều yêu cầu. |

## 4. Giải thích nét đứt `users` - `user_subscriptions`

Trong ERD có hai quan hệ từ `users` sang `user_subscriptions`:

| Đường nối | Field | Ý nghĩa |
| --- | --- | --- |
| Đường liền | `user_subscriptions.userId` | User sở hữu subscription. Đây là quan hệ chính và bắt buộc. |
| Đường nét đứt | `user_subscriptions.approvedBy` | User duyệt subscription. Đây là quan hệ phụ và optional. |

Nói ngắn gọn: nét đứt không phải là người mua gói, mà là người duyệt gói.

Ví dụ:

- Student A gửi yêu cầu mua gói `plus`.
- Record trong `user_subscriptions` có `userId = Student A`.
- Teacher B duyệt yêu cầu đó.
- Record có thêm `approvedBy = Teacher B`.

Vì `approvedBy` có dấu `?` trong model, nên field này có thể chưa tồn tại khi subscription vẫn đang `pending`. Do đó ERD dùng nét đứt để thể hiện đây là optional reference.

## 5. Ghi chú thiết kế

Một số điểm thiết kế đáng chú ý:

1. `users.enrolledSubjects[]` tạo quan hệ nhiều-nhiều trực tiếp giữa users và subjects. Nếu muốn chuẩn hóa mạnh hơn theo relational database, có thể tách thành collection trung gian như `subject_enrollments`.
2. `document_assists.documentId` unique nên một document chỉ có một assist record.
3. `question_quotas` dùng unique index trên cặp `userId + documentId` để tránh tạo trùng quota record.
4. `chunks.embedding[]` là dữ liệu vector, phục vụ tìm kiếm semantic similarity trong RAG.
5. `chat_sessions.messages[]` là embedded subdocument vì message thuộc vòng đời của chat session.
6. `subscription_plans.name` đang được dùng như khóa nghiệp vụ để nối sang `user_subscriptions.planName`.

