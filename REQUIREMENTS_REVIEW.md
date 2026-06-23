# EduSmart — Software Requirements Specification

> Trạng thái: Working Draft  
> Phiên bản: `0.3 — Subject-only Q&A`  
> Ngày cập nhật: `2026-06-22`  
> Người duyệt: `[Điền tên]`

## 1. Mục tiêu sản phẩm

EduSmart là hệ thống quản lý tài liệu học tập và hỏi đáp bằng RAG dành cho môi trường đại học. Hệ thống tổ chức nội dung trực tiếp theo môn học (`Subject`), không chia theo lớp học.

Admin quản lý tài khoản, môn học và phân công giảng viên. Teacher được upload và quản lý tài liệu của mình trong các Subject đang được phân công. Student đã đăng nhập được xem toàn bộ Subject active, tài liệu sẵn sàng và hỏi AI theo tài liệu được chọn.

### 1.1. Mục tiêu chính

- Quản lý tài khoản theo ba vai trò: Admin, Teacher và Student.
- Quản lý Subject và quan hệ phân công nhiều-nhiều giữa Subject với Teacher.
- Cho phép Teacher tự công bố tài liệu sau khi hệ thống xử lý thành công.
- Cho phép Student truy cập toàn bộ nội dung học tập mà không cần mã tham gia hoặc mật khẩu môn học.
- Trả lời câu hỏi bằng RAG theo đúng một tài liệu.
- Quản lý quota câu hỏi theo User trong từng tháng UTC.
- Gửi email cho các sự kiện tài khoản và phân công Subject.

### 1.2. Ngoài phạm vi phiên bản hiện tại

- Tổ chức người dùng hoặc tài liệu theo lớp học.
- Danh sách sinh viên riêng theo từng môn học.
- Quy trình duyệt hoặc từ chối tài liệu.
- Mật khẩu hoặc mã tham gia Subject.
- Các tính năng ôn tập tự động ngoài hỏi đáp RAG.
- Chỉnh sửa nội dung file PDF, DOCX hoặc PPTX trực tiếp trên hệ thống.
- Thanh toán thật, hoàn tiền và webhook từ cổng thanh toán.
- Ứng dụng mobile native.

## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Subject | Môn học chứa tài liệu và được Admin phân công cho Teacher. |
| Subject Assignment | Quan hệ cấp quyền cho một Teacher quản lý nội dung trong một Subject. |
| Document | File học tập thuộc đúng một Subject và do một Teacher upload. |
| Ready Document | Document đã parse, chunk và embedding thành công, có thể được đọc và chat. |
| RAG | Truy xuất đoạn nội dung liên quan trước khi gọi mô hình AI. |
| Quota | Số câu hỏi một User được phép gửi trong một tháng UTC. |

## 3. Vai trò và quyền hạn

### 3.1. Admin

- Tạo, cập nhật, kích hoạt và vô hiệu hóa tài khoản.
- Tạo, cập nhật và archive Subject.
- Gán hoặc gỡ nhiều Teacher cho một Subject.
- Xem và quản lý toàn bộ Subject, Subject Assignment và Document.
- Xem, sửa metadata hoặc xóa mọi Document.
- Tạo chat theo Document và không bị giới hạn quota.

### 3.2. Teacher

- Chỉ xem các Subject active đang được phân công.
- Xem toàn bộ Ready Document trong Subject đang được phân công.
- Upload Document vào Subject đang được phân công.
- Xem, sửa metadata và xóa Document do chính mình upload.
- Chỉ có quyền quản lý khi Subject Assignment còn active.
- Có quota cố định 100 câu hỏi mỗi tháng UTC.

### 3.3. Student

- Xem toàn bộ Subject active.
- Xem toàn bộ Ready Document trong các Subject active.
- Không cần mã tham gia, mật khẩu hoặc thao tác đăng ký vào Subject.
- Tạo chat theo Document và xem lịch sử chat của chính mình.
- Sử dụng quota theo gói hiện hành: Free, Plus hoặc Pro.

## 4. Yêu cầu chức năng

### FR-01 — Quản lý tài khoản

1. Mỗi tài khoản có `username`, `fullName`, `email`, `userCode`, `role` và `isActive`.
2. `username`, `email` và `userCode` phải duy nhất.
3. Mật khẩu phải được hash trước khi lưu.
4. Chỉ Admin được tạo tài khoản; hệ thống không hỗ trợ đăng ký công khai.
5. Role không được thay đổi sau khi tài khoản được tạo.
6. Admin không được tự vô hiệu hóa tài khoản của chính mình.
7. Không được vô hiệu hóa Admin cuối cùng còn active.
8. Khi Teacher bị vô hiệu hóa, mọi Subject Assignment active của Teacher phải bị gỡ hoặc vô hiệu hóa trong cùng quy trình.
9. Vô hiệu hóa User phải thu hồi quyền gọi API ngay cả khi token cũ chưa hết hạn.

### FR-02 — Xác thực và phiên đăng nhập

1. User đăng nhập bằng `username` và mật khẩu tài khoản.
2. User bị vô hiệu hóa không được đăng nhập hoặc gọi API được bảo vệ.
3. Token phải có thời hạn và được kiểm tra lại với trạng thái User hiện tại.
4. Token không được truyền qua query string hoặc xuất hiện trong URL.
5. Hệ thống phải giới hạn số lần đăng nhập sai theo IP và tài khoản.
6. Yêu cầu “không cần mật khẩu” chỉ áp dụng cho việc truy cập Subject; Student vẫn phải đăng nhập ứng dụng.

### FR-03 — Quản lý Subject

1. Chỉ Admin được tạo, cập nhật hoặc archive Subject.
2. Mỗi Subject có `code`, `name`, `description` và `isActive`.
3. `code` và `name` phải duy nhất.
4. Student được xem mọi Subject active.
5. Teacher chỉ được xem Subject active có Assignment active với mình.
6. Subject bị archive không xuất hiện với Student hoặc Teacher.
7. Archive Subject phải vô hiệu hóa toàn bộ Assignment active của Subject.
8. Document của Subject archived được giữ lại để Admin quản lý nhưng không được Student hoặc Teacher truy cập.

### FR-04 — Phân công Teacher vào Subject

1. Một Subject có thể được phân công cho nhiều Teacher.
2. Một Teacher có thể được phân công cho nhiều Subject.
3. Chỉ Admin được gán hoặc gỡ Teacher.
4. Chỉ tài khoản active có role `teacher` mới được gán.
5. Chỉ Subject active mới được tạo Assignment mới.
6. Mỗi cặp `subjectId + teacherId` chỉ có tối đa một Assignment active.
7. Assignment lưu `subjectId`, `teacherId`, `assignedBy`, `assignedAt`, `status` (`active` hoặc `removed`) và `removedAt`.
8. Khi gán lại một cặp đã bị gỡ, hệ thống kích hoạt lại Assignment, cập nhật người/thời gian gán và xóa `removedAt`.
9. Khi bị gỡ Assignment, Teacher lập tức mất quyền xem, upload, sửa và xóa trong Subject đó.
10. Document Teacher đã upload vẫn tồn tại, vẫn hiển thị cho Student nếu Subject active và Document ready, đồng thời do Admin quản lý.

### FR-05 — Upload và xử lý Document

1. Chỉ Teacher có Assignment active với Subject mới được upload vào Subject đó.
2. Hệ thống hỗ trợ PDF, DOCX và PPTX.
3. Hệ thống phải kiểm tra phần mở rộng, MIME type và chữ ký thực tế của file.
4. Kích thước file tối đa là 50 MB.
5. Mỗi Document thuộc đúng một `subjectId` và lưu `uploadedBy` là Teacher tạo Document.
6. Document không có visibility hoặc phạm vi truy cập riêng; mọi Ready Document trong Subject active đều được Student xem.
7. Pipeline chuẩn là `uploaded → processing → ready`.
8. Nếu parse, chunk hoặc embedding lỗi, trạng thái chuyển thành `failed` và lưu thông báo lỗi kỹ thuật phù hợp.
9. Tài liệu tự động được công bố khi chuyển sang `ready`; không có bước Admin duyệt.
10. File upload không vượt qua validation phải được xóa khỏi storage.
11. Job bị gián đoạn ở trạng thái `uploaded` hoặc `processing` phải được resume hoặc retry an toàn.
12. Không được xử lý trùng một Document đồng thời.

### FR-06 — Quản lý Document

1. Admin được xem, sửa metadata và xóa mọi Document.
2. Teacher được xem toàn bộ Ready Document trong Subject đang được phân công.
3. Teacher chỉ được sửa metadata, retry xử lý hoặc xóa Document khi đồng thời:
   - Teacher là `uploadedBy` của Document.
   - Assignment với Subject của Document còn active.
4. Metadata Teacher được sửa gồm tên hiển thị, số chương và tên chương.
5. Teacher không được thay file gốc, đổi `subjectId` hoặc đổi `uploadedBy` của Document hiện tại.
6. Muốn thay file gốc, Teacher phải upload một Document mới.
7. Xóa Document phải xóa file gốc, chunks và các Chat Session gắn với Document.
8. Thao tác xóa phải có bước xác nhận và không thể hoàn tác.
9. Hệ thống phải lưu audit log tối thiểu cho hành động upload, sửa metadata và xóa Document.

### FR-07 — Đọc và tải Document

1. Admin được đọc/tải mọi Document còn tồn tại.
2. Teacher được đọc/tải Ready Document thuộc Subject đang được phân công.
3. Student được đọc/tải Ready Document thuộc Subject active.
4. Document `uploaded`, `processing` hoặc `failed` chỉ hiển thị cho Admin và Teacher sở hữu còn quyền quản lý.
5. Quyền phải được kiểm tra lại tại thời điểm request cho metadata, file gốc và chunks.
6. Token xác thực phải truyền bằng header hoặc secure cookie, không truyền trong URL.
7. HTML sinh từ file hoặc chunk phải được sanitize trước khi render.
8. Giao diện Reader chỉ hỗ trợ đọc; không hiển thị chế độ chỉnh sửa nội dung nếu thay đổi không được lưu.

### FR-08 — Document-scoped RAG

1. Mỗi Chat Session gắn với đúng một `documentId`.
2. Retrieval chỉ lấy Chunk có `documentId` đúng bằng Document đang được chọn.
3. Mỗi lần tạo, mở hoặc gửi chat phải kiểm tra lại quyền với Document.
4. LLM chỉ trả lời từ context được retrieve, không fallback sang kiến thức chung.
5. Không có Chunk đạt similarity threshold thì trả refusal message và không gọi LLM.
6. Citation chỉ được tạo từ Chunk của Document đang chọn.
7. Hệ thống phải phân biệt nội dung tài liệu với instruction để giảm prompt injection.
8. Lịch sử hội thoại chỉ thuộc User tạo Session và không được User khác truy cập.
9. Lịch sử phải có giới hạn kích thước hoặc cơ chế archive/tóm tắt để không vượt giới hạn lưu trữ.

### FR-09 — Quota câu hỏi

1. Quota tính trên tổng số câu hỏi của User trong một tháng UTC, không phụ thuộc Subject hoặc Document.
2. Unique key là `userId + periodKey`, trong đó `periodKey` có dạng `YYYY-MM` theo UTC.
3. Giới hạn theo role và gói:

| Role/Gói | Giới hạn mỗi tháng UTC |
| --- | ---: |
| Admin | Không giới hạn |
| Teacher | 100 câu |
| Student Free | 50 câu |
| Student Plus | 300 câu |
| Student Pro | 1000 câu |

4. Teacher không cần mua gói và luôn dùng limit 100 câu.
5. Một lượt phải được reserve nguyên tử trước khi gọi AI.
6. Pipeline lỗi trước khi trả kết quả sử dụng được phải hoàn quota.
7. Câu hỏi được xử lý thành công nhưng không tìm thấy context vẫn tính một lượt.
8. Đổi gói Student không reset số lượt đã dùng trong tháng.
9. Hạ gói có thể khóa chat nếu usage đã vượt limit mới.
10. Xóa Document hoặc Chat Session không hoàn lại quota đã dùng.

### FR-10 — Subscription

1. Subscription chỉ áp dụng cho Student.
2. Các gói gồm Free, Plus và Pro.
3. Bản demo kích hoạt gói ngay, không thực hiện thanh toán thật.
4. Một Student chỉ được có một Subscription active tại một thời điểm.
5. Production phải xác nhận thanh toán bằng webhook trước khi active gói trả phí.
6. Quy tắc nâng, hạ, hủy gói và hoàn tiền phải được chốt trước khi tích hợp thanh toán production.

### FR-11 — Email notification

Hệ thống tự động gửi email trong các trường hợp:

1. Admin tạo tài khoản mới.
2. Admin đặt lại mật khẩu tài khoản.
3. Admin gán Teacher vào Subject.
4. Admin gỡ Teacher khỏi Subject.

Quy tắc gửi email:

5. Email phân công phải chứa mã và tên Subject cùng trạng thái được gán hoặc bị gỡ.
6. Gửi email thất bại không được rollback thao tác nghiệp vụ chính.
7. Hệ thống phải ghi nhận trạng thái `queued`, `sent` hoặc `failed` cho từng thông báo.
8. Email lỗi phải có retry giới hạn và trạng thái phải hiển thị cho Admin.
9. Không gửi mật khẩu sử dụng lâu dài qua email; production ưu tiên link thiết lập mật khẩu một lần có thời hạn.
10. Không ghi đầy đủ email, mật khẩu, token hoặc App Password vào log.
11. Không gửi email cho upload Document hoặc xử lý Document thành công/thất bại trong phiên bản này.

### FR-12 — Evaluation Test Set

1. Test Set dùng để đánh giá chất lượng retrieval và câu trả lời RAG.
2. Ground-truth answer không được public cho Student trong production.
3. Chỉ Admin hoặc evaluator được truy cập Test Set đầy đủ.
4. Kết quả đánh giá cần lưu model version, embedding version, cấu hình retrieval và thời điểm chạy.

## 5. Yêu cầu phi chức năng

### NFR-01 — Bảo mật

- Bắt buộc HTTPS trong production.
- Không dùng JWT secret mặc định trong production.
- Áp dụng rate limit cho login, upload và chat.
- Thiết lập security headers và Content Security Policy.
- Không lưu JWT trong URL; ưu tiên secure HttpOnly cookie thay cho localStorage trong production.
- Kiểm tra magic bytes và chống file độc hại trước khi parse.
- Sanitize toàn bộ HTML từ tài liệu trước khi render.
- Không công khai Test Set có ground-truth answer.
- Dependency vulnerability mức High hoặc Critical phải được xử lý trước khi release.

### NFR-02 — Hiệu năng và khả năng mở rộng

- API thông thường có mục tiêu p95 nhỏ hơn 500 ms, không tính tác vụ AI.
- Upload và embedding phải chạy qua background job trong production.
- Không load toàn bộ embedding của Document vào RAM cho mỗi câu hỏi khi dữ liệu tăng lớn.
- Chat Session phải tránh vượt giới hạn document của MongoDB.
- Có timeout và retry hợp lý cho Gemini, SMTP và storage.

### NFR-03 — Độ tin cậy

- Job xử lý Document phải idempotent và có thể resume sau restart.
- Email phải có outbox/retry hoặc cơ chế tương đương.
- Thao tác vô hiệu hóa Teacher và Assignment phải dùng transaction hoặc quy trình bù trừ.
- Health check phải phản ánh Database, AI, Email và worker ở mức phù hợp.

### NFR-04 — Audit và logging

- Ghi nhận người thực hiện và thời gian cho: tạo/vô hiệu hóa User, gán/gỡ Teacher, archive Subject, upload/sửa/xóa Document và thay đổi Subscription.
- Log không chứa password, App Password, JWT, API key hoặc toàn bộ email cá nhân.
- Có correlation/request ID để truy vết lỗi.

### NFR-05 — Kiểm thử

- Có unit test cho Subject Assignment, Document access, quota và state transition.
- Có integration test API cho từng role.
- Có test Teacher không thể upload hoặc quản lý Document khi chưa được phân công.
- Có test Teacher không thể sửa/xóa Document của Teacher khác trong cùng Subject.
- Có test Student xem được mọi Ready Document nhưng không xem được Document chưa ready.
- Có test quyền bị thu hồi ngay khi Teacher bị gỡ khỏi Subject.
- Có test quota Teacher 100 và quota Student theo từng gói với request song song.
- Có test upload sai định dạng và cleanup file rác.
- Có end-to-end smoke test cho luồng Admin tạo Subject → gán Teacher → Teacher upload → Student đọc/chat.
- CI phải chạy lint, type-check, test, build và dependency audit.

### NFR-06 — Khả dụng và giao diện

- Giao diện responsive từ mobile đến desktop.
- Mỗi màn hình chỉ hiển thị hành động phù hợp role.
- Các thao tác bất đồng bộ phải có loading, success và error state rõ ràng.
- Không hiển thị bước duyệt tài liệu hoặc tùy chọn phạm vi theo lớp.
- Không hiển thị nút chỉnh sửa nội dung nếu thay đổi không được lưu.
- Tuân thủ accessibility cơ bản: keyboard navigation, focus state, label và contrast.

## 6. Quy tắc dữ liệu và migration

1. Ngừng sử dụng toàn bộ dữ liệu và API tổ chức theo lớp học hoặc danh sách tham gia.
2. Tạo collection Subject Assignment cho quan hệ nhiều-nhiều giữa Subject và Teacher.
3. Các cặp Teacher–Subject suy ra được từ dữ liệu phân công active cũ được migrate thành Assignment active và loại bỏ trùng lặp.
4. Các cặp không xác định được chính xác phải được đưa vào báo cáo để Admin xử lý thủ công.
5. Mọi Document cũ đang giới hạn theo lớp được chuyển thành Document cấp Subject và hiển thị cho mọi Student sau khi ở trạng thái ready.
6. Loại bỏ `visibility`, danh sách phạm vi lớp và các trường kiểm duyệt cũ khỏi Document sau khi migration hoàn tất.
7. Chuẩn hóa trạng thái Document cũ:
   - Document đã xử lý thành công và có Chunk chuyển thành `ready`.
   - Document đang upload/xử lý giữ `uploaded` hoặc `processing` để worker resume.
   - Document lỗi chuyển thành `failed`.
8. Chat Session mới và dữ liệu giữ lại sau migration bắt buộc có `documentId` hợp lệ.
9. Chat Session legacy thiếu `documentId` phải được archive hoặc xóa, không tự gán suy đoán.
10. Loại bỏ dữ liệu, API và giao diện của tính năng tạo nội dung ôn tập tự động cũ.
11. Migration phải có dry-run, báo cáo số bản ghi thay đổi, backup và phương án rollback.
12. Sau migration, hệ thống phải xác nhận không còn API/UI nào phụ thuộc vào mô hình lớp học, duyệt tài liệu hoặc nội dung ôn tập tự động.

## 7. Ma trận quyền truy cập

| Chức năng | Admin | Teacher | Student |
| --- | :---: | :---: | :---: |
| Quản lý User | Có | Không | Không |
| Quản lý Subject | Có | Không | Không |
| Gán/gỡ Teacher | Có | Không | Không |
| Xem Subject | Tất cả | Subject được gán | Tất cả Subject active |
| Upload Document | Không | Subject được gán | Không |
| Xem Ready Document | Tất cả | Subject được gán | Tất cả Subject active |
| Sửa metadata Document | Tất cả | Tài liệu của mình | Không |
| Xóa Document | Tất cả | Tài liệu của mình | Không |
| Chat theo Document | Không giới hạn | 100 câu/tháng | Theo gói |
| Chọn gói | Không | Không | Có |

## 8. Tiêu chí hoàn thành phiên bản Subject-only

- [ ] Không còn chức năng tổ chức người dùng hoặc tài liệu theo lớp học.
- [ ] Admin gán/gỡ được nhiều Teacher cho mỗi Subject.
- [ ] Teacher chỉ upload và quản lý tài liệu của mình trong Subject đang được gán.
- [ ] Student xem được toàn bộ Subject active và Ready Document mà không cần mã hoặc mật khẩu môn học.
- [ ] Student chỉ sử dụng chức năng đọc tài liệu và hỏi đáp RAG; không có nội dung ôn tập tự động khác.
- [ ] Document tự chuyển sang trạng thái ready sau khi xử lý thành công, không qua bước duyệt.
- [ ] Quota Admin, Teacher và Student đúng theo bảng quy định.
- [ ] Email tài khoản và gán/gỡ Subject hoạt động, có trạng thái gửi và retry.
- [ ] Không còn JWT trong URL hoặc HTML tài liệu chưa sanitize.
- [ ] Upload lỗi không để lại file rác; job processing có thể resume.
- [ ] Dữ liệu legacy được migrate hoặc archive có báo cáo.
- [ ] Requirement, ERD, API, email và UI thống nhất với mô hình Subject-only.

## 9. Các quyết định đã chốt

| Mã | Vấn đề | Quyết định |
| --- | --- | --- |
| D-01 | Đơn vị tổ chức nội dung | Chỉ dùng Subject; không dùng lớp học. |
| D-02 | Phân công Teacher | Quan hệ nhiều-nhiều giữa Teacher và Subject. |
| D-03 | Quyền Student | Xem mọi Subject active và Ready Document sau khi đăng nhập. |
| D-04 | Mật khẩu Subject | Không sử dụng. |
| D-05 | Công bố Document | Tự động khi xử lý thành công; không cần Admin duyệt. |
| D-06 | Quyền Teacher | Quản lý Document của mình khi Assignment còn active. |
| D-07 | Gỡ Assignment | Teacher mất quyền; Document cũ vẫn hiển thị và Admin quản lý. |
| D-08 | Quota Teacher | 100 câu mỗi tháng UTC. |
| D-09 | Quota Student | Free 50, Plus 300, Pro 1000 câu mỗi tháng UTC. |
| D-10 | Email | Tạo/reset tài khoản và gán/gỡ Teacher khỏi Subject. |
| D-11 | Chỉnh sửa Document | Chỉ sửa metadata; không sửa file gốc. |
| D-12 | Dữ liệu giới hạn cũ | Chuyển thành tài liệu cấp Subject cho mọi Student. |
