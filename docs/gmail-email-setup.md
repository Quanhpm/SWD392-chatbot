# Thiết lập Gmail cho email thông báo EduSmart

## Các sự kiện được gửi email

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| Admin tạo tài khoản | User mới | Username, mật khẩu tạm thời và vai trò |
| Admin đặt lại mật khẩu | User | Username và mật khẩu mới |
| Admin phân công lớp | Giảng viên | Lớp và môn học được phân công |
| Admin thêm sinh viên vào lớp | Sinh viên | Lớp và môn học vừa được thêm |
| Admin duyệt tài liệu | Giảng viên upload | Tài liệu đã được công bố |
| Admin từ chối tài liệu | Giảng viên upload | Kết quả và lý do từ chối |

Lỗi SMTP không rollback thao tác nghiệp vụ. Backend sẽ ghi log `Email failed (...)` để admin xử lý mà không làm mất dữ liệu vừa tạo.

## 1. Chuẩn bị tài khoản Google

1. Dùng một Gmail riêng cho hệ thống, ví dụ `edusmart.notification@gmail.com`.
2. Mở trang **Google Account → Security**.
3. Bật **2-Step Verification** cho tài khoản.
4. Mở trang **App passwords** tại `https://myaccount.google.com/apppasswords`.
5. Tạo App Password với tên `EduSmart Backend`.
6. Sao chép mật khẩu ứng dụng 16 ký tự. Đây là giá trị của `SMTP_PASS`; không dùng mật khẩu Gmail thông thường.

Tài liệu chính thức của Google:

- [Đăng nhập bằng App Password](https://support.google.com/accounts/answer/185833)
- [Gửi email từ ứng dụng qua Gmail SMTP](https://support.google.com/a/answer/176600)

Nếu không thấy mục App passwords, tài khoản có thể đang dùng security-key-only, Advanced Protection hoặc bị Google Workspace admin vô hiệu hóa tính năng này.

## 2. Cấu hình backend

Mở `backend/.env` và điền:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=edusmart.notification@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM_NAME=EduSmart
EMAIL_FROM_ADDRESS=edusmart.notification@gmail.com
```

Lưu ý:

- `SMTP_PASS` là App Password, có thể dán có hoặc không có khoảng trắng; backend sẽ tự loại bỏ khoảng trắng.
- Với Gmail cá nhân, `EMAIL_FROM_ADDRESS` nên giống `SMTP_USER`.
- Không commit `backend/.env` hoặc App Password lên Git.
- `FRONTEND_URL` phải là URL người dùng thật sự truy cập vì nút trong email sử dụng giá trị này.

## 3. Kiểm tra Gmail SMTP

Trong thư mục `backend` chạy:

```bash
npm run email:test -- email-nguoi-nhan@example.com
```

Kết quả thành công:

```text
SMTP connection verified successfully.
Email sent (smtp-test) ...
```

Sau đó khởi động lại backend:

```bash
npm run dev
```

## 4. Xử lý lỗi thường gặp

- `Invalid login` / `535-5.7.8`: đang dùng sai App Password, chưa bật 2-Step Verification hoặc `SMTP_USER` không đúng.
- `Username and Password not accepted`: tạo lại App Password rồi cập nhật `SMTP_PASS`.
- Timeout: kiểm tra firewall có cho phép kết nối ra `smtp.gmail.com:465` hay không.
- Email vào Spam: dùng tên người gửi ổn định, tránh đổi địa chỉ gửi liên tục và yêu cầu người dùng đánh dấu “Not spam”.
- Google Workspace không có App passwords: nhờ Workspace admin cho phép hoặc chuyển sang SMTP relay/API email chuyên dụng.

## 5. Production

Gmail phù hợp demo và đồ án nhưng có giới hạn gửi. Khi triển khai nhiều người dùng, nên chuyển sang Resend, SendGrid, Amazon SES hoặc SMTP relay của Google Workspace. `EmailService` hiện dùng chuẩn SMTP nên có thể đổi nhà cung cấp chỉ bằng các biến môi trường.
