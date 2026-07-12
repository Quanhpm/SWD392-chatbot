type EmailContent = { subject: string; text: string; html: string };

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const layout = (title: string, preview: string, body: string, action?: { label: string; url: string }): string => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
<tr><td style="padding:22px 28px;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:700">EduSmart</td></tr>
<tr><td style="padding:28px"><h1 style="font-size:22px;line-height:1.35;margin:0 0 18px">${escapeHtml(title)}</h1>${body}
${action ? `<p style="margin:24px 0 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">${escapeHtml(action.label)}</a></p>` : ''}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6">Đây là email tự động từ EduSmart. Vui lòng không trả lời email này.</td></tr>
</table></td></tr></table></body></html>`;

const paragraph = (value: string): string => `<p style="margin:0 0 14px;line-height:1.7;color:#334155">${value}</p>`;
const infoBox = (rows: Array<[string, string]>): string => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">${rows.map(([label, value]) => `<tr><td style="padding:9px 12px;color:#64748b;width:145px">${escapeHtml(label)}</td><td style="padding:9px 12px;font-weight:600">${escapeHtml(value)}</td></tr>`).join('')}</table>`;

export const accountCreatedEmail = (input: { fullName: string; username: string; password: string; roleLabel: string; loginUrl: string }): EmailContent => {
  const title = 'Tài khoản EduSmart của bạn đã được tạo';
  const text = `Xin chào ${input.fullName},\n\nTên đăng nhập: ${input.username}\nMật khẩu tạm thời: ${input.password}\nVai trò: ${input.roleLabel}\n\nĐăng nhập: ${input.loginUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, tài khoản của bạn đã được quản trị viên tạo.`)
    + infoBox([['Tên đăng nhập', input.username], ['Mật khẩu tạm thời', input.password], ['Vai trò', input.roleLabel]]);
  return { subject: title, text, html: layout(title, `Tài khoản ${input.username} đã sẵn sàng`, body, { label: 'Đăng nhập EduSmart', url: input.loginUrl }) };
};

export const passwordResetEmail = (input: { fullName: string; username: string; password: string; loginUrl: string }): EmailContent => {
  const title = 'Mật khẩu EduSmart đã được đặt lại';
  const text = `Xin chào ${input.fullName},\n\nMật khẩu cho ${input.username} đã được đặt lại.\nMật khẩu mới: ${input.password}\n\nĐăng nhập: ${input.loginUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, mật khẩu của bạn vừa được quản trị viên cập nhật.`)
    + infoBox([['Tên đăng nhập', input.username], ['Mật khẩu mới', input.password]]);
  return { subject: title, text, html: layout(title, 'Mật khẩu vừa được cập nhật', body, { label: 'Đăng nhập EduSmart', url: input.loginUrl }) };
};

export const passwordResetCodeEmail = (input: { fullName: string; code: string; expiresInMinutes: number }): EmailContent => {
  const title = 'Mã xác nhận đặt lại mật khẩu EduSmart';
  const text = `Xin chào ${input.fullName},\n\nMã xác nhận của bạn là: ${input.code}\nMã có hiệu lực trong ${input.expiresInMinutes} phút.\n\nNếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.`)
    + infoBox([['Mã xác nhận', input.code], ['Hiệu lực', `${input.expiresInMinutes} phút`]])
    + paragraph('Không chia sẻ mã này với bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.');
  return { subject: title, text, html: layout(title, 'Mã xác nhận đặt lại mật khẩu', body) };
};

export const teacherSubjectAssignmentEmail = (input: { fullName: string; subjectCode: string; subjectName: string; assigned: boolean; dashboardUrl: string }): EmailContent => {
  const title = input.assigned ? `Bạn được phân công môn ${input.subjectCode}` : `Bạn đã được gỡ khỏi môn ${input.subjectCode}`;
  const status = input.assigned ? 'Đã phân công' : 'Đã gỡ phân công';
  const text = `Xin chào ${input.fullName},\n\n${status}: ${input.subjectCode} - ${input.subjectName}.\n\nMở EduSmart: ${input.dashboardUrl}`;
  const body = paragraph(`Xin chào <strong>${escapeHtml(input.fullName)}</strong>, phân công giảng dạy của bạn vừa được cập nhật.`)
    + infoBox([['Môn học', `${input.subjectCode} · ${input.subjectName}`], ['Trạng thái', status]])
    + paragraph(input.assigned ? 'Bạn có thể upload và quản lý tài liệu của mình trong môn học này.' : 'Bạn không còn quyền quản lý tài liệu trong môn học này.');
  return { subject: title, text, html: layout(title, `${input.subjectCode}: ${status}`, body, { label: 'Mở EduSmart', url: input.dashboardUrl }) };
};

export const testEmail = (loginUrl: string): EmailContent => {
  const title = 'Kiểm tra kết nối email EduSmart';
  const body = paragraph('Gmail SMTP đã được cấu hình thành công.') + infoBox([['Thời gian', new Date().toISOString()]]);
  return { subject: title, text: `${title}\n\nGmail SMTP đã được cấu hình thành công.\n${loginUrl}`, html: layout(title, 'Kết nối Gmail SMTP thành công', body, { label: 'Mở EduSmart', url: loginUrl }) };
};
