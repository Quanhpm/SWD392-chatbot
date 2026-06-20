# Functional Requirements

Tài liệu này là nguồn requirement chuẩn của hệ thống. Các tài liệu workflow/ERD phải tuân theo các quy tắc dưới đây.

## 1. Academic access

1. Admin tạo subject, class và quản lý roster. Mỗi class active có đúng một teacher; class draft có thể chưa được phân công. Hệ thống không hỗ trợ co-teaching/trợ giảng ở cấp class.
2. Teacher chỉ thao tác học vụ trên class active đang được phân công.
3. Student có quyền vào subject khi tồn tại enrollment active nối tới class active của subject active.
4. Archive class hoặc remove enrollment phải thu hồi ngay quyền document và chat history phụ thuộc class đó.

## 2. Document privacy

1. Mọi document thuộc đúng một `subjectId` và có một `visibility`:
   - `subject-wide`: `classIds` rỗng; mọi student có quyền vào subject đều có thể đọc sau khi approve.
   - `class-restricted`: `classIds` có ít nhất một class active cùng subject; chỉ student enrolled trong một class được chọn mới có quyền.
2. Teacher chỉ được chọn class active cùng subject mà mình đang phụ trách.
3. Admin phải thấy visibility và danh sách class khi review.
4. Cùng một rule authorization áp dụng cho metadata, file gốc, chunks, Study Assist, tạo/mở chat và gửi message.
5. Teacher uploader luôn được xem tài liệu của mình; teacher khác chỉ xem subject-wide hoặc restricted document thuộc class mình phụ trách.
6. Không cho phép đổi visibility sau approval. Muốn đổi phạm vi phải tạo bản upload mới và review lại để có audit rõ ràng.

## 3. Monthly question quota

1. Quota tính theo tổng câu hỏi của user trong tháng UTC, không theo document/subject/class.
2. Limit: Free 50, Plus 300, Pro 1000 câu/tháng.
3. Unique key là `userId + periodKey (YYYY-MM)`; period là `[đầu tháng, đầu tháng kế tiếp)`.
4. Đổi gói giữa tháng giữ nguyên `questionCount`; limit mới có hiệu lực ngay. Hạ gói có thể khóa chat nếu usage đã vượt limit mới.
5. Mỗi câu hỏi hợp lệ được reserve nguyên tử trước khi gọi AI. Pipeline lỗi thì hoàn quota; câu trả lời từ chối vì không có context vẫn tính một lượt vì request đã được xử lý thành công.
6. Xóa/reject/chia nhỏ document không reset hoặc tăng quota.
7. Teacher và admin không bị giới hạn quota; chỉ student sử dụng subscription quota.

## 4. Document-scoped RAG

1. Mỗi chat session gắn với đúng một `documentId`.
2. Retrieval chỉ tìm chunks có `documentId` đúng bằng document đang được chọn.
3. LLM chỉ được trả lời từ context đã retrieve; không được dùng kiến thức chung để bổ sung.
4. Không có chunk đạt similarity threshold thì hệ thống trả refusal message và không gọi LLM fallback.
5. Citation chỉ được tạo từ chunks của document đang chọn.

## 5. Document lifecycle

`uploaded -> processing -> pending -> approved | rejected`, hoặc `processing -> failed`.

- Student chỉ truy cập document `approved`.
- Admin là role duy nhất approve/reject.
- Reject xóa chunks, Study Assist và chat session liên quan nhưng giữ metadata/file phục vụ audit.

## 6. Điểm cần quyết định trước production

1. Subscription hiện là demo activation, chưa có payment gateway, refund hoặc webhook.
2. Calendar quota dùng UTC; nếu nghiệp vụ Việt Nam yêu cầu chốt tháng theo GMT+7 thì phải thêm business timezone cố định và migration period key.
3. Paid plan hiện có hiệu lực 30 ngày nhưng quota reset theo tháng UTC; mua gần cuối tháng có thể đi qua hai quota period. Production phải chọn một trong hai: quota theo billing cycle, hoặc subscription/proration theo calendar month.
4. `subject-wide` do teacher chọn và admin duyệt. Nếu chỉ bộ môn được phép phát hành tài liệu toàn môn, cần giới hạn lựa chọn này cho admin/content manager.
5. Chưa có document versioning. Nếu thay file nhưng cần giữ citation/audit cũ, nên thêm `documentGroupId`, `version` và trạng thái superseded.
