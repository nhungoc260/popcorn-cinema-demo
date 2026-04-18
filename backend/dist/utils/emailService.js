"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = sendOtpEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const https_1 = __importDefault(require("https"));
// ══════════════════════════════════════════════════════════
//  EMAIL SERVICE - Hỗ trợ 3 provider:
//  1. Resend.com  (VITE_RESEND_API_KEY) - khuyên dùng, free
//  2. Gmail SMTP  (SMTP_USER + SMTP_PASS App Password)
//  3. Ethereal    (dev fallback - không cần cấu hình gì)
// ══════════════════════════════════════════════════════════
function buildHtml(otp, purpose) {
    const title = purpose === 'forgot' ? 'Đặt lại mật khẩu' : 'Xác nhận tài khoản';
    const desc = purpose === 'forgot'
        ? 'Bạn vừa yêu cầu đặt lại mật khẩu. Dùng mã OTP bên dưới:'
        : 'Dùng mã OTP bên dưới để xác nhận tài khoản:';
    const boxes = otp.split('').map(d => `<td style="width:48px;height:60px;background:#1C1929;border:2px solid #A855F7;border-radius:12px;font-size:30px;font-weight:900;color:#A855F7;text-align:center;vertical-align:middle;font-family:monospace;">${d}</td>`).join('<td style="width:8px;"></td>');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0D0B14;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#13111E;border-radius:20px;border:1px solid rgba(168,85,247,0.25);overflow:hidden;">
  <div style="background:linear-gradient(135deg,#A855F7,#7C3AED);padding:28px;text-align:center;">
    <div style="font-size:36px;">🎬</div>
    <h1 style="color:white;margin:8px 0 0;font-size:20px;font-weight:800;">Popcorn Cinema</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">${title}</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#EDE9FE;font-size:15px;margin:0 0 8px;">Xin chào,</p>
    <p style="color:#9D89C4;font-size:14px;margin:0 0 24px;">${desc}</p>
    <div style="background:rgba(168,85,247,0.08);border:1.5px solid rgba(168,85,247,0.25);border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="color:#9D89C4;font-size:11px;margin:0 0 16px;text-transform:uppercase;letter-spacing:3px;">Mã xác nhận OTP</p>
      <table style="margin:0 auto;border-collapse:separate;border-spacing:0;"><tr>${boxes}</tr></table>
      <p style="color:#6B5FA8;font-size:12px;margin:16px 0 0;">⏰ Hết hạn sau <strong style="color:#FCD34D;">10 phút</strong></p>
    </div>
    <p style="color:#5C4F7A;font-size:12px;margin:0;">⚠️ Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  </div>
  <div style="padding:16px;text-align:center;border-top:1px solid rgba(168,85,247,0.1);">
    <p style="color:#3D3560;font-size:11px;margin:0;">© 2026 Popcorn Cinema · Hệ thống đặt vé xem phim</p>
  </div>
</div></body></html>`;
}
// ── Resend.com API (free, không cần SMTP) ────────────────
async function sendViaResend(to, subject, html, text) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'Popcorn Cinema <onboarding@resend.dev>';
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ from, to, subject, html, text });
        const req = https_1.default.request({
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode === 200 || res.statusCode === 201)
                        resolve(json);
                    else
                        reject(new Error(`Resend error ${res.statusCode}: ${data}`));
                }
                catch {
                    reject(new Error(`Parse error: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
// ── Gmail SMTP (App Password) ────────────────────────────
async function getGmailTransporter() {
    return nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
    });
}
// ── Ethereal (dev fallback) ──────────────────────────────
async function getEtherealTransporter() {
    const acc = await nodemailer_1.default.createTestAccount();
    return nodemailer_1.default.createTransport({
        host: 'smtp.ethereal.email', port: 587, secure: false,
        auth: { user: acc.user, pass: acc.pass },
    });
}
// ── Main export ──────────────────────────────────────────
async function sendOtpEmail(to, otp, purpose = 'forgot') {
    const subject = purpose === 'forgot'
        ? `🔑 ${otp} — Mã OTP đặt lại mật khẩu Popcorn Cinema`
        : `✅ ${otp} — Mã xác nhận Popcorn Cinema`;
    const html = buildHtml(otp, purpose);
    const text = `Mã OTP: ${otp} (hết hạn 10 phút) — Popcorn Cinema`;
    // 1. Resend.com
    if (process.env.RESEND_API_KEY) {
        try {
            await sendViaResend(to, subject, html, text);
            console.log(`\n✅ EMAIL SENT via Resend → ${to} | OTP: ${otp}\n`);
            return { success: true, provider: 'resend' };
        }
        catch (e) {
            console.error('Resend failed:', e.message);
        }
    }
    // 2. Gmail SMTP
    const gmailUser = process.env.SMTP_USER;
    const gmailPass = process.env.SMTP_PASS;
    if (gmailUser && gmailPass && !gmailUser.includes('your_gmail') && gmailPass.length > 10) {
        try {
            const t = await getGmailTransporter();
            await t.sendMail({ from: `"Popcorn Cinema 🎬" <${gmailUser}>`, to, subject, html, text });
            console.log(`\n✅ EMAIL SENT via Gmail (${gmailUser}) → ${to} | OTP: ${otp}\n`);
            return { success: true, provider: 'gmail' };
        }
        catch (e) {
            console.error('Gmail SMTP failed:', e.message);
        }
    }
    // 3. Ethereal fallback (dev)
    try {
        const t = await getEtherealTransporter();
        const info = await t.sendMail({ from: '"Popcorn Cinema" <demo@popcorn.vn>', to, subject, html, text });
        const url = nodemailer_1.default.getTestMessageUrl(info);
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📧 EMAIL (Ethereal dev preview)`);
        console.log(`   To:  ${to}`);
        console.log(`   OTP: ${otp}`);
        console.log(`   👉 PREVIEW: ${url}`);
        console.log(`${'═'.repeat(60)}\n`);
        return { success: true, provider: 'ethereal', previewUrl: url };
    }
    catch (e) {
        console.error('Ethereal failed:', e.message);
        console.log(`\n⚠️ ALL EMAIL PROVIDERS FAILED\n   OTP for ${to}: ${otp}\n`);
        return { success: false, provider: 'none' };
    }
}
//# sourceMappingURL=emailService.js.map