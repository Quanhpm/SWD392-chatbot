type EmailContent = { subject: string; text: string; html: string };

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const layout = (title: string, preview: string, body: string, action?: { label: string; url: string }): string => `<!doctype html>
<html lang="vi">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <tr><td style="padding:22px 28px;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:700">EduSmart</td></tr>
          <tr><td style="padding:28px">
            <h1 style="font-size:22px;line-height:1.35;margin:0 0 18px">${escapeHtml(title)}</h1>
            ${body}
            ${action ? `<p style="margin:24px 0 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">${escapeHtml(action.label)}</a></p>` : ''}
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6">Đây là email tự động từ EduSmart. Vui lòng không trả lời email này.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const paragraph = (value: string): string => `<p style="margin:0 0 14px;line-height:1.7;color:#334155">${value}</p>`;
const infoBox = (rows: Array<[string, string]>): string => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">${rows.map(([label, value]) => `<tr><td style="padding:9px 12px;color:#64748b;width:145px;border-bottom:1px solid #eef2f7">${escapeHtml(label)}</td><td style="padding:9px 12px;font-weight:600;border-bottom:1px solid #eef2f7">${escapeHtml(value)}</td></tr>`).join('')}</table>`;

export const accountCreatedEmail = (input: {
  fullName: string; username: string; password: string; roleLabel: string; loginUrl: string;
}): EmailContent => {
  const title = 'Tài khoản EduSmart của bạn đã được tạo';
  const text = `Xin chào ${input.fullName},\n\nTài khoản EduSmart đã được tạo.\nTên đăng nhập: ${input.username}\nMật khẩu tạm thời: ${input.password}\nVai trò: ${input.roleLabel}\n\nĐăng nhập: ${input.loginUrl}\nKhông chia sẻ mật khẩu này với người khác.`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, tài khoản của bạn đã được quản trị viên tạo.`)
    + infoBox([['Tên đăng nhập', input.username], ['Mật khẩu tạm thời', input.password], ['Vai trò', input.roleLabel]])
    + paragraph('Vui lòng bảo mật thông tin đăng nhập và đổi mật khẩu khi quản trị viên yêu cầu.');
  return { subject: title, text, html: layout(title, `Tài khoản ${input.username} đã sẵn sàng`, body, { label: 'Đăng nhập EduSmart', url: input.loginUrl }) };
};

export const passwordResetEmail = (input: {
  fullName: string; username: string; password: string; loginUrl: string;
}): EmailContent => {
  const title = 'Mật khẩu EduSmart đã được đặt lại';
  const text = `Xin chào ${input.fullName},\n\nMật khẩu cho tài khoản ${input.username} đã được quản trị viên đặt lại.\nMật khẩu mới: ${input.password}\n\nĐăng nhập: ${input.loginUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, mật khẩu của bạn vừa được quản trị viên cập nhật.`)
    + infoBox([['Tên đăng nhập', input.username], ['Mật khẩu mới', input.password]])
    + paragraph('Nếu bạn không yêu cầu thay đổi này, hãy liên hệ quản trị viên ngay.');
  return { subject: title, text, html: layout(title, 'Mật khẩu tài khoản vừa được cập nhật', body, { label: 'Đăng nhập EduSmart', url: input.loginUrl }) };
};

export const teacherAssignedEmail = (input: {
  fullName: string; classCode: string; className: string; subjectCode: string; subjectName: string; dashboardUrl: string;
}): EmailContent => {
  const title = `Bạn được phân công lớp ${input.classCode}`;
  const text = `Xin chào ${input.fullName},\n\nBạn được phân công giảng dạy lớp ${input.classCode} - ${input.className}, môn ${input.subjectCode} - ${input.subjectName}.\n\nMở EduSmart: ${input.dashboardUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, quản trị viên đã phân công bạn phụ trách lớp học sau:`)
    + infoBox([['Lớp', `${input.classCode} · ${input.className}`], ['Môn học', `${input.subjectCode} · ${input.subjectName}`]])
    + paragraph('Bạn có thể quản lý roster và tải tài liệu đúng phạm vi lớp trong EduSmart.');
  return { subject: title, text, html: layout(title, `Phân công lớp ${input.classCode}`, body, { label: 'Mở trang giảng viên', url: input.dashboardUrl }) };
};

export const studentEnrolledEmail = (input: {
  fullName: string; classCode: string; className: string; subjectCode: string; subjectName: string; portalUrl: string;
}): EmailContent => {
  const title = `Bạn đã được thêm vào lớp ${input.classCode}`;
  const text = `Xin chào ${input.fullName},\n\nBạn đã được thêm vào lớp ${input.classCode} - ${input.className}, môn ${input.subjectCode} - ${input.subjectName}.\n\nVào học: ${input.portalUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, quản trị viên đã thêm bạn vào lớp học:`)
    + infoBox([['Lớp', `${input.classCode} · ${input.className}`], ['Môn học', `${input.subjectCode} · ${input.subjectName}`]])
    + paragraph('Các tài liệu đã duyệt và đúng phạm vi lớp sẽ xuất hiện trong tài khoản của bạn.');
  return { subject: title, text, html: layout(title, `Bạn đã tham gia lớp ${input.classCode}`, body, { label: 'Vào EduSmart', url: input.portalUrl }) };
};

export const documentReviewedEmail = (input: {
  fullName: string; documentName: string; subjectName: string; chapter: number; chapterTitle: string;
  approved: boolean; reason?: string; documentsUrl: string;
}): EmailContent => {
  const title = input.approved ? 'Tài liệu đã được duyệt' : 'Tài liệu cần chỉnh sửa';
  const status = input.approved ? 'Đã duyệt' : 'Từ chối';
  const reasonText = input.reason ? `\nLý do: ${input.reason}` : '';
  const text = `Xin chào ${input.fullName},\n\nTài liệu ${input.documentName} đã được admin xử lý.\nTrạng thái: ${status}\nMôn học: ${input.subjectName}\nChương ${input.chapter}: ${input.chapterTitle}${reasonText}\n\nXem tài liệu: ${input.documentsUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, tài liệu của bạn đã được quản trị viên xử lý.`)
    + infoBox([['Tài liệu', input.documentName], ['Môn học', input.subjectName], ['Chương', `${input.chapter} · ${input.chapterTitle}`], ['Kết quả', status]])
    + (input.reason ? paragraph(`<strong>Lý do:</strong> ${escapeHtml(input.reason)}`) : paragraph('Tài liệu hiện đã sẵn sàng cho người học đúng phạm vi truy cập.'));
  return { subject: `${title}: ${input.documentName}`, text, html: layout(title, `${input.documentName}: ${status}`, body, { label: 'Xem thư viện tài liệu', url: input.documentsUrl }) };
};

export const testEmail = (loginUrl: string): EmailContent => {
  const title = 'Kiểm tra kết nối email EduSmart';
  const body = paragraph('Gmail SMTP đã được cấu hình thành công. EduSmart có thể gửi email thông báo.') + infoBox([['Thời gian', new Date().toISOString()]]);
  return { subject: title, text: `${title}\n\nGmail SMTP đã được cấu hình thành công.\n${loginUrl}`, html: layout(title, 'Kết nối Gmail SMTP thành công', body, { label: 'Mở EduSmart', url: loginUrl }) };
};
