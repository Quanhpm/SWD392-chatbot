# 📐 HƯỚNG DẪN KIẾN TRÚC LỤC GIÁC (HEXAGONAL ARCHITECTURE)
## Dự án: SE1939 — RAG Chatbot (Ports & Adapters Pattern)

Tài liệu này giải thích chi tiết cách áp dụng **Kiến trúc Lục giác (Hexagonal Architecture)** vào phần Backend của dự án RAG Chatbot, cách tổ chức mã nguồn, bản đồ ánh xạ các file và luồng dữ liệu chạy thực tế của hệ thống.

---

## 1. Sơ đồ Kiến trúc Lục giác trong Dự án

Kiến trúc Lục giác chia hệ thống thành 3 phần phân ranh giới rõ rệt, giao tiếp với nhau qua các **Cổng (Ports)** và **Bộ chuyển đổi (Adapters)**:

```
                  ┌───────────────────────────────────────────┐
                  │          CORE DOMAIN (Hạt nhân)           │
                  │  Logic xử lý RAG & nghiệp vụ cốt lõi      │
                  │  (Không phụ thuộc công nghệ, framework)   │
                  └─────────────────────┬─────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
     [ DRIVING PORTS ] (Cổng vào)                           [ DRIVEN PORTS ] (Cổng ra)
     Định nghĩa cách thế giới bên                           Định nghĩa các dịch vụ mà Core
     ngoài tương tác với Core.                              cần gọi ra ngoài (AI, DB, File).
             ▲                                                     ▲
             │                                                     │
     [ DRIVING ADAPTERS ]                                   [ DRIVEN ADAPTERS ]
     - Express Router                                       - GeminiChatAdapter (AI Chat)
     - Controllers (REST API)                               - GeminiEmbeddingAdapter (Vector)
                                                            - ParserAdapter (PDF/Word Reader)
                                                            - Mongoose Models (MongoDB Store)
```

---

## 2. Bản đồ Ánh xạ các File nguồn (File Mapping Map)

Dưới đây là sơ đồ tổ chức thư mục backend chuẩn Hexagonal:

### 🌟 A. CORE DOMAIN (Hạt nhân Nghiệp vụ)
Nơi chứa toàn bộ logic RAG và quy tắc tính toán của chatbot. Lớp này hoàn toàn sạch bóng công nghệ bên thứ ba, không import Express, không gọi Gemini trực tiếp.
* **[services/chatService.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/services/chatService.ts):** Bộ điều phối hội thoại RAG (sinh câu trả lời, gắn citation, kiểm soát lịch sử chat).
* **[services/documentService.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/services/documentService.ts):** Bộ điều phối quy trình xử lý tài liệu tải lên.
* **[services/chunkingService.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/services/chunkingService.ts):** Logic thuật toán bẻ nhỏ văn bản lớn thành từng đoạn (chunk) có gối đầu (`chunkOverlap`).
* **[services/retrievalService.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/services/retrievalService.ts):** Thuật toán tìm kiếm ngữ nghĩa, so khớp vector tương đồng Cosine.
* **[services/citationService.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/services/citationService.ts):** Logic trích dẫn chương mục và số trang tài liệu nguồn.

### 🔌 B. PORTS (Cổng giao tiếp - Định nghĩa các Interfaces)
Là ranh giới bảo vệ Core Domain. Trong mã nguồn TypeScript, các Port được khai báo là các **Interface** định nghĩa khuôn mẫu hàm.
* **[ports/IParserPort.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/ports/IParserPort.ts):** Cổng trích xuất văn bản từ file (`pdf`, `docx`, `pptx`).
* **[ports/IEmbeddingPort.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/ports/IEmbeddingPort.ts):** Cổng tạo vector nhúng (vector embedding) từ văn bản chữ.
* **[ports/ILLMPort.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/ports/ILLMPort.ts):** Cổng gọi mô hình ngôn ngữ lớn để trả lời câu hỏi.

### 🔌 C. DRIVEN ADAPTERS (Bộ cắm Công nghệ Ra Ngoài)
Các file chứa công nghệ cụ thể kết nối API bên thứ 3 và các thư viện bên ngoài. Chúng thực thi (implement) các Port tương ứng.
* **[adapters/ParserAdapter.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/adapters/ParserAdapter.ts):** Hiện tại đang dùng `pdf-parse`, `mammoth`, và `officeparser` để đọc file chữ.
* **[adapters/GeminiEmbeddingAdapter.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/adapters/GeminiEmbeddingAdapter.ts):** Chứa code gọi API tạo vector từ xa của mô hình `gemini-embedding-001`.
* **[adapters/GeminiChatAdapter.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/adapters/GeminiChatAdapter.ts):** Chứa code gọi API chat từ xa của mô hình `gemini-2.5-flash`.
* **[models/](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/models/):** Các Model Mongoose (`Document`, `Chunk`, `ChatSession`, `Subject`) tương tác trực tiếp với MongoDB.

### 🔌 D. DRIVING ADAPTERS (Bộ cắm Nhận Yêu Cầu Vào)
* **[routes/chatRoutes.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/routes/chatRoutes.ts) & [routes/documentRoutes.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/routes/documentRoutes.ts):** Express Router tiếp nhận các cuộc gọi API HTTP từ giao diện React Frontend, giải nén dữ liệu và gọi Core để xử lý.

### 🧩 E. COMPOSITION ROOT (Bộ Kết Nối & Tiêm Phụ Thuộc)
* **[config/dependencies.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/config/dependencies.ts):** Trái tim khởi tạo của hệ thống. File này sẽ tạo ra các Adapter cụ thể và truyền chúng vào constructor của `DocumentService` và `ChatService` (Dependency Injection), rồi xuất ra ngoài dạng Singleton để các file Route sử dụng.

---

## 3. Luồng dữ liệu chạy thực tế (Execution Flows)

### 📈 Luồng 1: Quy trình nạp và xử lý tài liệu (Document Ingestion Pipeline)

Khi người dùng upload một file tài liệu từ giao diện Frontend:

```
[Client (React)] --(1. Gửi file qua REST API)--> [documentRoutes.ts]
                                                         │
                                               (2. Gọi create & process)
                                                         ▼
[documentService.ts (Core)] <──(4. Nhận chữ)─── [IParserPort (Cổng)]
         │                                               ▲
         │                                         (Chạy thực tế)
         │                                               │
         │                                       [ParserAdapter.ts] --(3. Đọc file)--> (Mammoth / PDF-Parse)
   (5. Gọi chunking) ➔ Trả về danh sách Chunks
         │
         ▼
[documentService.ts (Core)] ──(6. Gửi text chunks)──> [IEmbeddingPort (Cổng)]
         │                                                      ▲
         │                                                (Chạy thực tế)
         │                                                      │
         │                                            [GeminiEmbeddingAdapter.ts] ➔ Gọi Google Gemini API
         ▼                                                      │
[documentService.ts (Core)] <──(7. Nhận danh sách Vectors)─────┘
         │
  (8. Ghi dữ liệu)
         ▼
  [MongoDB Database] (Lưu trữ Chunks & Embeddings)
```

---

### 💬 Luồng 2: Quy trình hỏi đáp hội thoại RAG (Real-time Chat Pipeline)

Khi người dùng gửi câu hỏi trong khung Chat:

```
[Client (React)] --(1. Gửi câu hỏi)--> [chatRoutes.ts]
                                              │
                                      (2. Gọi generateChatResponse)
                                              ▼
[chatService.ts (Core)] ──(3. Gửi câu hỏi)──> [IEmbeddingPort (Cổng)]
         │                                                 ▲
         │                                           (Chạy thực tế bằng GeminiEmbeddingAdapter)
         ▼                                                 │
[chatService.ts (Core)] <──(4. Nhận Query Vector)──────────┘
         │
  (5. Gọi retrievalService.ts) ➔ Quét MongoDB tính toán Cosine Similarity
         │
         ▼ (Trả về Top 5 Chunks phù hợp nhất)
[chatService.ts (Core)] ➔ (6. Xây dựng Context Prompt chứa tài liệu nguồn và câu hỏi)
         │
         ├──(7. Gửi Context Prompt + Lịch sử chat)──> [ILLMPort (Cổng)]
         │                                                   ▲
         │                                             (Chạy thực tế bằng GeminiChatAdapter)
         ▼                                                   │
[chatService.ts (Core)] <──(8. Nhận câu trả lời chữ)────────┘
         │
  (9. Lưu chat & citation)
         ▼
  [MongoDB Database] ➔ Trả response JSON về cho Client hiển thị.
```

---

## 4. Tại sao thiết kế này vô cùng ưu việt và dễ thuyết trình?

### 🛡️ Độc lập công nghệ tối đa (Technology Agnostic)
Hãy mở file [chatService.ts](file:///Users/FPTU/Ki%207/SWD/ProjectBaseLearning/se1939-rag-chatbot/backend/src/services/chatService.ts) ra xem. Bạn sẽ thấy dòng code cốt lõi:
```typescript
const content = await this.llmPort.callLLM(SYSTEM_PROMPT, priorMessages, currentPrompt);
```
Nó hoàn toàn chỉ tương tác với interface `ILLMPort`. Core Domain không hề hay biết đằng sau cổng này đang dùng mô hình **Gemini**, **GPT-4o** hay mô hình mã nguồn mở chạy local như **Llama 3**. 

### 🚀 Thay thế công nghệ siêu tốc chỉ bằng 1 file Adapter
Nếu ngày mai thầy giáo yêu cầu bạn: *"Hãy chuyển chatbot này sang dùng API của OpenAI (ChatGPT) thay vì Gemini!"*
* **Ở Layered Architecture truyền thống:** Bạn sẽ phải lục tung các file service của hệ thống, tìm tất cả chỗ gọi API Google để thay đổi cấu hình thư viện, sửa đổi hàm fetch, sửa cấu trúc dữ liệu trả về ➔ Dễ gây lỗi ở các phần khác.
* **Ở Hexagonal Architecture:** Lõi hệ thống giữ nguyên 100%. Bạn chỉ cần viết đúng 1 file Adapter mới: `adapters/OpenAIChatAdapter.ts` (thực thi `ILLMPort`) rồi vào file `config/dependencies.ts` đổi dòng khai báo:
  ```diff
  - const chatAdapter = new GeminiChatAdapter();
  + const chatAdapter = new OpenAIChatAdapter();
  ```
  Hệ thống của bạn đã được chuyển đổi nhà cung cấp AI thành công trong vòng đúng 5 giây!

---
*Tài liệu này được tạo ra để hỗ trợ nhóm thuyết trình dự án SWD. Hãy tận dụng bản vẽ pipeline và bản đồ ánh xạ file ở trên làm slide để đạt điểm số tối đa nhé!*
