# Swimlane Workflows - Smart RAG Learning Platform

Tài liệu này mô tả 3 workflow nghiệp vụ chính của ứng dụng. Các swimlane chỉ
bao gồm thao tác của con người, không mô tả xử lý nội bộ của hệ thống như API,
database, embedding, cache hoặc AI model.

## Workflow 1: Giảng viên chuẩn bị môn học và tài liệu

**Tác nhân:** Giảng viên

```mermaid
flowchart TB
    subgraph Teacher["Giảng viên"]
        A([Bắt đầu]) --> B[Đăng nhập tài khoản giảng viên]
        B --> C[Chọn Tạo môn học]
        C --> D[Nhập tên môn học, mô tả và mật khẩu truy cập]
        D --> E[Chọn Xác nhận tạo môn học]
        E --> F[Chọn Tải tài liệu]
        F --> G[Chọn môn học]
        G --> H[Chọn file PDF, DOCX hoặc PPTX]
        H --> I[Nhập chương và tiêu đề chương]
        I --> J[Chọn Xác nhận tải lên]
        J --> K[Theo dõi trạng thái tài liệu trên dashboard]
        K --> L{Tài liệu hiển thị lỗi?}
        L -- Có --> M[Xóa tài liệu lỗi]
        M --> F
        L -- Không --> N[Chia sẻ mật khẩu môn học cho sinh viên]
        N --> O([Kết thúc])
    end
```

## Workflow 2: Sinh viên tham gia môn học và đọc tài liệu

**Tác nhân:** Giảng viên, Sinh viên

```mermaid
flowchart TB
    subgraph Teacher["Giảng viên"]
        A([Bắt đầu]) --> B[Chia sẻ mật khẩu môn học]
    end

    subgraph Student["Sinh viên"]
        B --> C[Đăng nhập hoặc đăng ký tài khoản sinh viên]
        C --> D[Xem danh sách môn học]
        D --> E[Chọn môn học đang bị khóa]
        E --> F[Chọn Tham gia ngay]
        F --> G[Nhập mật khẩu môn học]
        G --> H[Chọn Xác nhận tham gia]
        H --> I{Nhận thông báo tham gia thành công?}
        I -- Không --> J[Kiểm tra và nhập lại mật khẩu]
        J --> H
        I -- Có --> K[Chọn Vào học]
        K --> L[Chọn chương hoặc tài liệu]
        L --> M[Đọc nội dung tài liệu]
        M --> N[Xem nội dung hỗ trợ học tập khi cần]
        N --> O([Kết thúc])
    end
```

## Workflow 3: Sinh viên hỏi đáp với chatbot theo tài liệu

**Tác nhân:** Sinh viên

**Quy tắc nghiệp vụ:** Mỗi sinh viên được hỏi miễn phí tối đa 5 câu cho từng
tài liệu. Bộ đếm được tính độc lập theo tài liệu. Khi muốn gửi câu thứ 6 trong
cùng một tài liệu, sinh viên phải nâng cấp gói để tiếp tục.

```mermaid
flowchart TB
    subgraph Student["Sinh viên"]
        A([Bắt đầu]) --> B[Vào không gian học tập]
        B --> C[Chọn môn học]
        C --> D[Chọn tài liệu cần học]
        D --> E[Mở chatbot hỗ trợ tài liệu]
        E --> F[Nhập câu hỏi]
        F --> G[Chọn Gửi]
        G --> H{Nhận thông báo đã dùng đủ 5 câu miễn phí<br/>cho tài liệu này?}
        H -- Không --> I[Chờ câu trả lời hiển thị]
        I --> J[Đọc câu trả lời và nguồn trích dẫn]
        J --> K{Còn thắc mắc?}
        K -- Có --> F
        K -- Không --> Q([Kết thúc])
        H -- Có --> L{Muốn tiếp tục hỏi?}
        L -- Không --> Q
        L -- Có --> M[Chọn Nâng cấp gói]
        M --> N[Chọn gói dịch vụ]
        N --> O[Chọn Xác nhận nâng cấp]
        O --> P[Quay lại chatbot]
        P --> F
    end
```

### Ví dụ áp dụng giới hạn câu hỏi

- Sinh viên đã hỏi 5 câu trong tài liệu A thì phải nâng cấp gói để gửi câu thứ
  6 trong tài liệu A.
- Sinh viên vẫn có thể hỏi miễn phí tối đa 5 câu trong tài liệu B.
