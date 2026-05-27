# 🎯 Hướng dẫn về Evaluation Test Set & Ground Truth — SE1939 RAG Chatbot

Tài liệu này giải thích chi tiết khái niệm **Evaluation Test Set (Bộ câu hỏi đánh giá)** và **Ground Truth (Đáp án chuẩn)** được triển khai trong đồ án **SE1939 RAG Chatbot**. 

Đây là một trong những phần quan trọng nhất giúp đồ án đạt điểm tối đa nhờ tính học thuật cao, chứng minh được độ tin cậy và chất lượng phản hồi của Chatbot trước Hội đồng chấm thi.

---

## 1. Khái niệm cơ bản

Trong các hệ thống AI tiên tiến, ta không thể đánh giá chất lượng chatbot bằng cách chat thử vài câu cảm tính. Thay vào đó, ta phải sử dụng một **phương pháp khoa học để đo lường định lượng**.

### A. Evaluation Test Set (Bộ câu hỏi đánh giá) là gì?
* Là một tập hợp gồm đúng **50 câu hỏi tiêu chuẩn (Benchmark)** bao quát toàn bộ nội dung giáo trình môn học: *"Software Modeling and Design: UML, Use Cases, Patterns, and Software Architectures"*.
* Các câu hỏi này không được tạo ra ngẫu nhiên mà được phân loại khoa học theo chương, độ khó và dạng câu hỏi để kiểm tra toàn diện khả năng đọc hiểu tài liệu của chatbot.

### B. Ground Truth (Sự thật khách quan / Đáp án chuẩn) là gì?
* **Ground Truth** là tập hợp các **câu trả lời chuẩn xác nhất được chuẩn bị sẵn bởi con người (chuyên gia/giảng viên)**. 
* Đây được coi là thước đo "vàng" (Gold Standard). Mọi câu trả lời do AI sinh ra (AI response) sẽ được đối chiếu trực tiếp với Ground Truth này để đánh giá chất lượng.

---

## 2. Cấu trúc phân bổ 50 câu hỏi Benchmark

Tệp tin cấu hình dữ liệu [test-set.json](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/test-set.json) trong dự án chứa 50 câu hỏi được thiết kế theo cấu trúc cực kỳ cân đối và học thuật:

### A. Phân bổ theo Dạng câu hỏi (Category) — 4 Dạng
1.  **Factual (Thực tế - 13 câu)**: Hỏi trực tiếp về định nghĩa, dữ liệu số.
    * *Ví dụ*: *"Bốn giai đoạn của Unified Process là gì?"*
2.  **Conceptual (Khái niệm - 15 câu)**: Hỏi để kiểm tra khả năng giải thích bản chất lý thuyết.
    * *Ví dụ*: *"Domain Model trong OOAD là gì?"*
3.  **Comparison (So sánh - 12 câu)**: Yêu cầu AI phân biệt và tìm sự khác nhau giữa các thực thể.
    * *Ví dụ*: *"Sự khác biệt giữa quan hệ include và extend trong use case?"*
4.  **Application (Ứng dụng - 10 câu)**: Đưa ra tình huống thực tế để kiểm tra tính ứng dụng của lý thuyết.
    * *Ví dụ*: *"Hãy cho một kịch bản áp dụng Strategy Design Pattern trong thực tế."*

### B. Phân bổ theo Độ khó (Difficulty) — 3 Mức độ
*   **Easy (Dễ)**: `19 câu` — Kiểm tra khả năng tra cứu thông tin bề mặt.
*   **Medium (Trung bình)**: `21 câu` — Kiểm tra khả năng tổng hợp thông tin từ nhiều trang.
*   **Hard (Khó)**: `10 câu` — Đòi hỏi suy luận và xâu chuỗi kiến thức sâu sắc.

### C. Phân bổ theo Chương giáo trình (Chapters)
*   Trải đều trên toàn bộ **10 chương sách giáo khoa FLM** (từ Chương 1: Giới thiệu chung đến các chương Use case, Domain model, Interaction diagrams, GoF Design Patterns, và Software Architectures).

---

## 3. Cấu trúc một bản ghi câu hỏi chuẩn (Schema)

Mỗi câu hỏi trong bộ dữ liệu được định nghĩa đầy đủ siêu dữ liệu (metadata) phục vụ đánh giá:

```json
{
  "id": 1,
  "question": "What are the four phases of the Unified Process?",
  "groundTruthAnswer": "The four phases of the Unified Process are: (1) Inception – defining the scope and vision, (2) Elaboration – establishing architectural foundation...",
  "sourceDocument": "Chapter 2 - Iterative, Evolutionary, and Agile",
  "chapter": 2,
  "difficulty": "easy",
  "category": "factual",
  "expectedKeywords": ["inception", "elaboration", "construction", "transition"]
}
```

*   **Expected Keywords (Từ khóa kỳ vọng)**: Là các từ khóa bắt buộc phải xuất hiện trong câu trả lời của AI. Đây là cơ sở để tính điểm tự động (ví dụ: chấm điểm xem AI có trích xuất đúng thuật ngữ chuyên ngành hay không).

---

## 4. Vai trò và Lợi ích khi demo trước Hội đồng chấm đồ án

Khi bạn giới thiệu trang **Evaluation Test Set (Model Evaluation Database)** trên giao diện web app, hãy nhấn mạnh các ý sau với giảng viên chấm thi:

### 🌟 1. Chứng minh tính tin cậy tuyệt đối (No Hallucination)
*   *"Hệ thống của chúng em không chỉ chat tự do mà được ràng buộc bằng bộ dữ liệu benchmark 50 câu chuẩn của trường. Chúng em đối chiếu câu trả lời của AI với Ground Truth để đảm bảo AI trả lời đúng 100% kiến thức giáo trình FLM mà không bị ảo giác bịa đặt thông tin."*

### 🌟 2. Công cụ kiểm soát chất lượng (QA/QC Dashboard)
*   Giao diện trang `/test-set` hiển thị đầy đủ bảng phân tích biểu đồ trực quan (Thống kê phần trăm độ khó, phần trăm dạng câu hỏi, danh sách chương).
*   Hội đồng có thể dùng các bộ lọc (Filter) thông minh để chọn nhanh một câu hỏi khó trong chương 7, xem trước **Ground Truth** và **Từ khóa bắt buộc**, sau đó bấm copy nhanh câu hỏi đó dán sang bên khung Chat để kiểm chứng ngay lập tức xem chatbot của nhóm có phản hồi khớp 100% hay không.

### 🌟 3. Khả năng mở rộng
*   Hệ thống được thiết kế dạng modular. Khi nhà trường đổi giáo trình hoặc cập nhật môn học mới, nhóm chỉ cần cập nhật file `test-set.json` mới là hệ thống lập tức có ngay một bộ thước đo đánh giá chất lượng chatbot mới mà không cần sửa code.
