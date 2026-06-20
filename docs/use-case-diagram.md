# Use Case Diagram - Smart RAG Learning Platform

Tài liệu này mô tả workflow hiện tại sau khi bổ sung quản trị lớp, duyệt tài liệu, class privacy và quota tháng.

## Actors

| Actor | Trách nhiệm |
| --- | --- |
| Admin | Quản lý tài khoản, môn, lớp, roster và duyệt/từ chối tài liệu. |
| Teacher | Quản lý lớp được phân công, upload tài liệu theo phạm vi và tạo Study Assist. |
| Student | Tham gia lớp, đọc tài liệu đúng phạm vi, chat và chọn gói. |
| Gemini API | Tạo embedding, Study Assist và câu trả lời RAG. |
| MongoDB | Lưu dữ liệu học vụ, tài liệu, chunks, chat, subscription và quota tháng. |

## Main Use Cases

| Nhóm | Use case | Quy tắc chính |
| --- | --- | --- |
| Admin | Quản lý môn và lớp | Class thuộc một subject, có một teacher phụ trách và roster riêng. |
| Admin | Duyệt tài liệu | Admin xem file, metadata và phạm vi lớp trước khi approve/reject. |
| Teacher | Upload tài liệu | Chọn `subject-wide` hoặc `class-restricted`; lớp được chọn phải active, cùng subject và do teacher phụ trách. |
| Student | Tham gia lớp | Enrollment chỉ cấp quyền khi enrollment, class và subject đều active. |
| Learning | Đọc tài liệu | Chỉ tài liệu approved và đúng phạm vi class mới xuất hiện. |
| Learning | Study Assist | Teacher uploader tạo; student chỉ đọc khi tài liệu approved và đúng phạm vi. |
| Chat | Chat theo document | Retrieval chỉ dùng chunks của document được chọn; quyền được kiểm tra lại khi tạo, mở và gửi chat. |
| Quota | Kiểm tra quota tháng | Tổng câu hỏi của user trên mọi tài liệu trong tháng UTC; Free/Plus/Pro = 50/300/1000. |
| Subscription | Chọn gói | Demo kích hoạt ngay; đổi gói không reset quota đã dùng trong tháng. |

## Business Rules

- Tài liệu cũ được migrate thành `subject-wide` để tương thích ngược.
- `class-restricted` phải có ít nhất một `classId`; không cho phép teacher chọn lớp của teacher khác.
- Mất enrollment hoặc class bị archive thì student mất quyền đọc tài liệu restricted và lịch sử chat liên quan.
- Quota có unique key `userId + periodKey`; chia nhỏ file, đổi subject hay đổi class không tạo thêm lượt hỏi.
- Quota được reserve nguyên tử trước khi chạy AI và hoàn lại nếu pipeline lỗi.
- Xóa/reject document không làm giảm quota tháng đã sử dụng.
- RAG chỉ retrieve chunks của document đang chọn và không fallback sang kiến thức chung; thiếu context thì trả refusal message.

## PlantUML Source

[`docs/use-case-diagram.puml`](./use-case-diagram.puml)
