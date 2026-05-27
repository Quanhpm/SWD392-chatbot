# 📋 Tài Liệu Đặc Tả Quy Trình Hệ Thống (Workflow Specifications)

Tài liệu này đặc tả chi tiết 3 quy trình (workflows) cốt lõi của hệ thống **Smart RAG Learning Platform** phục vụ cho báo cáo PBL4 và phân chia công việc trong đội ngũ phát triển.

---

## 🎨 1. Sơ Đồ Swimlane Mẫu: Quy Trình Truy Vấn RAG AI & Đọc Bộ Đệm Cache

Sơ đồ dưới đây mô tả luồng di chuyển của dữ liệu qua 6 phân làn (Swimlanes), đảm bảo tính bảo mật môn học và tốc độ truy xuất tối ưu nhờ bộ đệm Cache.

```mermaid
flowchart TB
    %% Cấu hình các làn bơi bằng Subgraph
    subgraph Student ["🏊 Làn 1: Student (Client)"]
        A([Bắt đầu: Gửi câu hỏi]) --> B[Hiển thị trạng thái chờ...]
        I[Nhận câu trả lời & Nguồn trích dẫn] --> J([Kết thúc: Xem kết quả trên giao diện])
    end

    subgraph API ["🏊 Làn 2: Express API / Routes (Driver Adapter)"]
        B --> C{Xác thực JWT Token & Ghi danh?}
        C -- "Hợp lệ" --> D[Gọi ChatService.generateChatResponse]
        C -- "Từ chối" --> K[Trả về lỗi 403 Access Denied]
        K --> J
    end

    subgraph Domain ["🏊 Làn 3: ChatService (Core Domain Logic)"]
        D --> E{Kiểm tra bộ đệm phiên đang chat?}
        E -- "Cache Hit (Tìm thấy)" --> H[Tải nhanh lịch sử & Trả kết quả]
        E -- "Cache Miss (Chưa có)" --> F[Gọi Vector Search giới hạn theo Subject]
        G[Trộn Ngữ cảnh & Lịch sử -> Tạo Prompt] --> O[Gọi LLM Port]
    end

    subgraph Cache ["🏊 Làn 4: Redis / In-Memory (Driven Adapter)"]
        E
        H --> P[Ghi đè/Cập nhật Active Session Cache với TTL 30p]
    end

    subgraph DB ["🏊 Làn 5: MongoDB Vector DB (Driven Adapter)"]
        F -->|Tìm kiếm tương đồng Vector| M[(Mongoose collections)]
        M -->|Trả về các Text Chunks khớp nhất| G
    end

    subgraph LLM ["🏊 Làn 6: Gemini API (Driven Adapter)"]
        O -->|Gửi API Request generateContent| N{Gemini LLM}
        N -->|Trả về chuỗi text đúc kết| H
    end

    P --> I
    
    %% Định dạng CSS
    classDef lanes fill:rgba(255,255,255,0.05),stroke:#cccccc,stroke-width:1.5px,color:#333333;
    classDef startEnd fill:#d1e7dd,stroke:#0f5132,stroke-width:2px,color:#0f5132;
    classDef action fill:#f8f9fa,stroke:#6c757d,stroke-width:1px;
    classDef decision fill:#fff3cd,stroke:#664d03,stroke-width:1.5px;
    
    class Student,API,Domain,Cache,DB,LLM lanes;
    class A,J startEnd;
    class B,D,G,I,P action;
    class C,E,H,K,F,O,M,N decision;
```

---

## 📋 2. Đặc Tả Chi Tiết 3 Quy Trình Hệ Thống (Workflow Tasks)

---

### WORKFLOW TASK #1: Quy Trình Đăng Ký & Ghi Danh Môn Học Bảo Mật (Secure Subject Enrollment)

#### 1. Mô tả & Mục tiêu
Thiết lập quy trình cho phép Sinh viên thực hiện nhập mã ghi danh (Course Password) để mở khóa môn học. Hệ thống bắt buộc phải kiểm tra phân quyền, thực hiện so sánh mật khẩu đã được mã hóa bằng `bcrypt` dưới cơ sở dữ liệu MongoDB và cập nhật trạng thái ghi danh cho tài khoản sinh viên.

#### 2. Các thành phần tham gia (Swimlanes)
* **Student Client (Frontend)**: Giao diện hiển thị trạng thái khóa/mở khóa môn học và form nhập password.
* **Auth Middleware**: Xác thực token JWT của yêu cầu để đảm bảo sinh viên đã đăng nhập hợp lệ.
* **Subject Service (Domain Core)**: Logic kiểm tra ghi danh, xử lý nghiệp vụ so sánh và cập nhật dữ liệu.
* **Bcrypt Security (Infrastructure Adapter)**: Thực hiện so sánh bất đồng bộ mã băm mật khẩu.
* **MongoDB (Database)**: Lưu trữ bảng `subjects` và `users`.

#### 3. Luồng xử lý chi tiết (Step-by-step Flow)
1. **Yêu cầu ghi danh**: Sinh viên click vào môn học có trạng thái "Locked" -> Giao diện hiển thị Modal yêu cầu nhập Password môn học.
2. **Gửi Request**: Sinh viên nhập password -> Frontend gửi request `POST /api/subjects/:id/enroll` đính kèm mật khẩu thô và Header `Authorization: Bearer <Token>`.
3. **Xác thực API**: `Auth Middleware` kiểm tra JWT. Nếu token không hợp lệ, trả về lỗi `401 Unauthorized`.
4. **Truy xuất thông tin**: `Subject Service` gọi MongoDB lấy ra bản ghi Subject tương ứng (chứa mật khẩu đã băm `passwordHash`).
5. **So sánh bảo mật**: Service chuyển mật khẩu thô và mật khẩu đã băm cho `Bcrypt Adapter` để đối chiếu:
   - *Nếu khớp*: Tiến hành cập nhật ID của môn học này vào mảng `enrolledSubjects` trong tài khoản User tại MongoDB. Trả về Response `200 OK` (success: true).
   - *Nếu sai*: Trả về lỗi `403 Forbidden` (Thông báo: "Incorrect course password").
6. **Mở khóa giao diện**: Frontend nhận phản hồi thành công, cập nhật state từ khóa sang mở khóa (Green Checked Badge), và tự động chuyển hướng Sinh viên vào không gian học tập của môn học.

#### 4. Tiêu chí nghiệm thu (Acceptance Criteria / DoD)
* [ ] Sinh viên không thể vào được trang học tập (`/study/:subjectId`) bằng cách nhập tay URL nếu chưa ghi danh (trả về `/portal` hoặc báo lỗi 403).
* [ ] Mật khẩu môn học không bao giờ được trả về dạng thô dưới client (chỉ lưu dạng hash bcrypt ở DB).
* [ ] Cập nhật Real-time trạng thái môn học trên Dashboard của Sinh viên ngay khi ghi danh thành công.

---

### WORKFLOW TASK #2: Quy Trình Tải Lên & Xử Lý Tài Liệu Bất Đồng Bộ (Async Document Indexing Pipeline)

#### 1. Mô tả & Mục tiêu
Xây dựng pipeline xử lý tài liệu học tập (`PDF`/`DOCX`) do Giảng viên tải lên. Quy trình này hoạt động bất đồng bộ (non-blocking) để tránh treo giao diện UI, tự động chuyển đổi file vật lý thành văn bản thô, chia nhỏ (chunking), tạo vector nhúng (vector embeddings) qua Gemini API và lưu vào cơ sở dữ liệu Vector DB.

#### 2. Các thành phần tham gia (Swimlanes)
* **Teacher Client (Frontend)**: Giao diện Form tải lên tài liệu (Subject, Chapter, Title, File).
* **Document Routes (API Controller)**: Tiếp nhận Multipart/Form-data, xác thực quyền `Teacher` qua JWT.
* **Document Service (Domain Core)**: Điều phối toàn bộ quy trình lưu trữ, chia nhỏ văn bản và chạy tác vụ ngầm.
* **Parser Port (Mammoth/PDF-Parse Adapters)**: Trích xuất nội dung văn bản thô từ file Word hoặc PDF.
* **Embedding Port (Gemini Embedding Adapter)**: Gọi API Gemini để tạo ra Vector nhúng 768 chiều cho từng chunk.
* **MongoDB (Database)**: Lưu trữ bảng `documents` và bảng vector `chunks`.

#### 3. Luồng xử lý chi tiết (Step-by-step Flow)
1. **Tải lên**: Giảng viên chọn tệp tin và điền metadata môn học -> Bấm "Upload".
2. **Tiếp nhận & Lưu vật lý**: API kiểm tra quyền `teacher` -> Lưu file vào thư mục `/uploads` -> Tạo bản ghi Document trong MongoDB với trạng thái `processing`.
3. **Phản hồi tức thì**: API lập tức trả về mã `201 Created` kèm thông tin tài liệu để Frontend hiển thị trạng thái *"Đang xử lý tài liệu..."*.
4. **Kích hoạt quy trình ngầm (Async Background Task)**:
   - **Bước 4.1 (Trích xuất)**: Gọi `IParserPort` đọc file vật lý, trích xuất toàn bộ text thô dựa theo định dạng đuôi file (`.pdf`/`.docx`).
   - **Bước 4.2 (Chia nhỏ)**: Chạy hàm `chunkText` để băm text thô thành các đoạn nhỏ (mặc định 800 ký tự, trùng lặp 200 ký tự để giữ ngữ cảnh).
   - **Bước 4.3 (Nhúng vector)**: Gọi `IEmbeddingPort` gửi các đoạn text thô lên Gemini API để lấy về mảng số thực vector nhúng tương ứng.
   - **Bước 4.4 (Lưu Vector DB)**: Lưu hàng loạt (Bulk Write) danh sách Chunk cùng Vector nhúng và thông tin metadata vào bảng `chunks`.
   - **Bước 4.5 (Hoàn tất)**: Cập nhật trạng thái Document trong MongoDB thành `indexed`.

#### 4. Tiêu chí nghiệm thu (Acceptance Criteria / DoD)
* [ ] Giao diện Giảng viên hiển thị trạng thái Spinner/Loading trong suốt thời gian tài liệu ở trạng thái `processing` và tự động đổi màu xanh khi đạt `indexed`.
* [ ] Kiểm tra lỗi: Nếu file hỏng/lỗi đọc text, Document phải cập nhật trạng thái `failed` kèm log lỗi rõ ràng trong DB, không làm crash ứng dụng backend.

---

### WORKFLOW TASK #3: Quy Trình Truy Vấn RAG AI Bảo Mật & Đọc Bộ Đệm (Secure Scoped RAG & Caching)

#### 1. Mô tả & Mục tiêu
Xây dựng luồng hỏi đáp AI thông minh theo phương pháp RAG (Retrieval-Augmented Generation). Luồng này bắt buộc phải kiểm tra quyền học tập của sinh viên, ưu tiên đọc lịch sử chat từ bộ đệm (Redis/In-Memory Cache) để đạt độ trễ `<10ms`, thực hiện tìm kiếm vector giới hạn nghiêm ngặt theo phạm vi môn học đang học để tránh rò rỉ thông tin môn khác, và gọi Gemini API để tổng hợp câu trả lời.

#### 2. Các thành phần tham gia (Swimlanes)
* **Student Client (Frontend)**: Giao diện Chatbot gửi tin nhắn và nhận câu trả lời kèm Citations.
* **Chat Service (Domain Core)**: Logic chính điều phối luồng hỏi đáp, RAG và lưu trữ lịch sử.
* **Cache Port (Redis/In-Memory Adapter)**: Lưu trữ tạm thời các phiên chat đang hoạt động để truy xuất tốc độ cao.
* **Retrieval Service (Outbound Port)**: Thực hiện tính toán khoảng cách cosine vector search trên MongoDB.
* **Gemini LLM Port (Outbound Adapter)**: Kết nối API Gemini để tổng hợp câu trả lời cuối cùng từ ngữ cảnh học tập.

#### 3. Luồng xử lý chi tiết (Step-by-step Flow)
1. **Sinh viên gửi câu hỏi**: Nhập *"Mối quan hệ Composition là gì?"* -> Bấm Gửi.
2. **Kiểm tra bộ đệm (Cache Lookup)**: 
   - `Chat Service` gọi `Cache Port` tìm kiếm theo Key `chat_session:<sessionId>`.
   - *Nếu Cache Hit*: Lấy ngay lịch sử chat và trả về kết quả mượt mà.
   - *Nếu Cache Miss*: Đọc lịch sử từ MongoDB -> Ghi ngược lại vào Cache với TTL 30 phút.
3. **Tạo Vector câu hỏi**: Gọi `IEmbeddingPort` tạo vector nhúng cho câu hỏi của sinh viên.
4. **Tìm kiếm ngữ cảnh giới hạn (Scoped Vector Search)**: 
   - Gọi `retrieveRelevantChunks` để tìm kiếm các văn bản liên quan nhất.
   - **CRITICAL**: Bắt buộc truyền tham số `subjectName` vào bộ lọc MongoDB. Việc này ngăn chặn tuyệt đối việc AI lấy nhầm ngữ cảnh từ môn học khác mà sinh viên chưa ghi danh.
5. **Tổng hợp câu trả lời (LLM Call)**: Trộn nội dung 3-5 đoạn văn tìm được + Lịch sử chat + System Prompt thành một Prompt hoàn chỉnh -> Gửi tới `ILLMPort` (Gemini API) để tạo câu trả lời.
6. **Lưu & Phản hồi**: 
   - Nhận câu trả lời từ Gemini -> Đóng gói nguồn trích dẫn.
   - Lưu tin nhắn mới vào MongoDB.
   - Cập nhật phiên chat mới này vào `Cache Port`.
   - Trả về kết quả cho Giao diện hiển thị.

#### 4. Tiêu chí nghiệm thu (Acceptance Criteria / DoD)
* [ ] Kiểm tra phân quyền: Sinh viên học môn A tuyệt đối không thể nhận được câu trả lời chứa kiến thức/nguồn trích dẫn của môn B.
* [ ] Tốc độ phản hồi khi chuyển tab hoặc tải lại phiên chat đang hoạt động dở phải đạt dưới **50ms** nhờ được tải từ bộ đệm RAM Cache.
