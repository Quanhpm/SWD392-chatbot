# Swimlane Workflows - Smart RAG Learning Platform

## Workflow 1: Thiết lập môn và lớp

```mermaid
flowchart TB
    subgraph Admin["Admin"]
        A([Bắt đầu]) --> B[Tạo subject]
        B --> C[Tạo class thuộc subject]
        C --> D[Phân công teacher]
        D --> E[Thiết lập self-enrollment]
        E --> F[Chia sẻ join code hoặc thêm student vào roster]
    end
    subgraph Student["Student"]
        F --> G[Nhập join code]
        G --> H[Nhận enrollment active]
    end
```

## Workflow 2: Upload, giới hạn phạm vi và duyệt tài liệu

```mermaid
flowchart TB
    subgraph Teacher["Teacher"]
        A([Bắt đầu]) --> B[Chọn subject được phân công]
        B --> C[Chọn file và metadata chương]
        C --> D{Phạm vi?}
        D -- Dùng chung toàn môn --> E[Chọn subject-wide]
        D -- Chỉ lớp cụ thể --> F[Chọn class-restricted]
        F --> G[Chọn một hoặc nhiều class active của mình]
        E --> H[Upload]
        G --> H
        H --> I[Chờ parse, chunk và embedding]
    end
    subgraph Admin["Admin"]
        I --> J[Xem file, metadata và phạm vi class]
        J --> K{Duyệt?}
        K -- Có --> L[Approve]
        K -- Không --> M[Reject kèm lý do]
    end
    subgraph Student["Student"]
        L --> N{Đúng phạm vi?}
        N -- subject-wide và có enrollment trong subject --> O[Được đọc và chat]
        N -- class-restricted và enrolled trong class được chọn --> O
        N -- Không --> P[Không hiển thị và từ chối truy cập]
    end
```

## Workflow 3: Hỏi đáp và quota tháng

Quota tính trên tổng câu hỏi của student trong tháng UTC: Free 50, Plus 300, Pro 1000. Đổi tài liệu, class hoặc subject không tạo quota mới; đổi gói không reset usage.
RAG chỉ dùng chunks của tài liệu đang chọn; nếu không đủ context, hệ thống từ chối trả lời thay vì dùng kiến thức chung.

```mermaid
flowchart TB
    subgraph Student["Student"]
        A([Bắt đầu]) --> B[Chọn tài liệu được phép truy cập]
        B --> C[Mở hoặc tạo chat]
        C --> D[Nhập câu hỏi]
        D --> E{Còn quota tháng?}
        E -- Không --> F[Xem thông báo hết quota]
        F --> G{Nâng cấp?}
        G -- Có --> H[Chọn gói]
        H --> D
        G -- Không --> I([Kết thúc])
        E -- Có --> J[Reserve 1 lượt nguyên tử]
        J --> K{AI pipeline thành công?}
        K -- Không --> L[Hoàn lại lượt]
        L --> D
        K -- Có --> M[Đọc câu trả lời và citation]
        M --> N{Hỏi tiếp?}
        N -- Có --> D
        N -- Không --> I
    end
```

### Ví dụ quota

- Student Free hỏi 30 câu ở tài liệu A và 20 câu ở tài liệu B thì đã dùng hết 50 câu của tháng.
- Chia một PDF thành nhiều file không tạo thêm lượt hỏi.
- Nâng từ Free lên Plus sau khi đã dùng 50 câu thì còn 250 câu trong tháng đó.
