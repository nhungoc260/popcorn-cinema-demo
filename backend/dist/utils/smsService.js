"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpSms = sendOtpSms;
const https_1 = __importDefault(require("https"));
// ══════════════════════════════════════════════════════════
//  SMS SERVICE - Hỗ trợ:
//  1. ESMS.vn     (ESMS_API_KEY + ESMS_SECRET) - VN, rẻ nhất
//  2. Twilio      (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN)
//  3. Console log (dev fallback)
// ══════════════════════════════════════════════════════════
// ── ESMS.vn ─────────────────────────────────────────────
async function sendViaESMS(phone, otp) {
    const { ESMS_API_KEY, ESMS_SECRET, ESMS_BRAND_NAME } = process.env;
    const brandname = ESMS_BRAND_NAME || 'Popcorn';
    const content = `${otp} la ma OTP cua ban tai Popcorn Cinema. Co hieu luc 5 phut. Khong chia se ma nay.`;
    // Normalize phone: 0912... → 84912...
    const phone84 = phone.replace(/^0/, '84');
    return new Promise((resolve) => {
        const body = JSON.stringify({
            ApiKey: ESMS_API_KEY,
            Content: content,
            Phone: phone84,
            SecretKey: ESMS_SECRET,
            SmsType: '2', // OTP type
            Brandname: brandname,
            IsUnicode: '0',
        });
        const req = https_1.default.request({
            hostname: 'rest.esms.vn',
            path: '/MainService.svc/json/SendMultipleMessage_V4_post_json/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.CodeResult === '100') {
                        console.log(`✅ SMS sent via ESMS → ${phone} | OTP: ${otp}`);
                        resolve(true);
                    }
                    else {
                        console.error(`ESMS error: ${data}`);
                        resolve(false);
                    }
                }
                catch {
                    resolve(false);
                }
            });
        });
        req.on('error', (e) => { console.error('ESMS request error:', e); resolve(false); });
        req.write(body);
        req.end();
    });
}
// ── Twilio ───────────────────────────────────────────────
async function sendViaTwilio(phone, otp) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
    // Normalize phone: 0912... → +84912...
    const phoneE164 = phone.startsWith('+') ? phone : `+84${phone.replace(/^0/, '')}`;
    const body = `[Popcorn Cinema] Ma OTP cua ban: ${otp}. Het han sau 5 phut.`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const postData = new URLSearchParams({ Body: body, From: TWILIO_PHONE_NUMBER, To: phoneE164 }).toString();
    return new Promise((resolve) => {
        const req = https_1.default.request({
            hostname: 'api.twilio.com',
            path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
            },
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                if (res.statusCode === 201) {
                    console.log(`✅ SMS sent via Twilio → ${phoneE164} | OTP: ${otp}`);
                    resolve(true);
                }
                else {
                    console.error(`Twilio error ${res.statusCode}: ${data}`);
                    resolve(false);
                }
            });
        });
        req.on('error', (e) => { console.error('Twilio request error:', e); resolve(false); });
        req.write(postData);
        req.end();
    });
}
// ── Main export ──────────────────────────────────────────
async function sendOtpSms(phone, otp) {
    // 1. ESMS.vn
    if (process.env.ESMS_API_KEY && process.env.ESMS_SECRET) {
        const ok = await sendViaESMS(phone, otp);
        if (ok)
            return { success: true, provider: 'esms' };
    }
    // 2. Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER) {
        const ok = await sendViaTwilio(phone, otp);
        if (ok)
            return { success: true, provider: 'twilio' };
    }
    // 3. Dev console fallback
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`📱 SMS OTP (dev mode — chưa cấu hình SMS provider)`);
    console.log(`   Số điện thoại: ${phone}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Hết hạn: 5 phút`);
    console.log(`\n   ⚡ Để gửi SMS thật:`);
    console.log(`   ESMS.vn: thêm ESMS_API_KEY + ESMS_SECRET vào .env`);
    console.log(`   Twilio:  thêm TWILIO_* keys vào .env`);
    console.log(`${'═'.repeat(55)}\n`);
    return { success: true, provider: 'console' };
}
//# sourceMappingURL=smsService.js.map