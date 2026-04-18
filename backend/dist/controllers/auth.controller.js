"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.getMe = getMe;
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.googleLogin = googleLogin;
exports.phoneSendOtp = phoneSendOtp;
exports.phoneVerifyOtp = phoneVerifyOtp;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const emailService_1 = require("../utils/emailService");
const smsService_1 = require("../utils/smsService");
const signAccess = (id, role, email) => jsonwebtoken_1.default.sign({ id, role, email }, process.env.JWT_ACCESS_SECRET, { expiresIn: (process.env.JWT_ACCESS_EXPIRES || '8h') });
const signRefresh = (id) => jsonwebtoken_1.default.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: (process.env.JWT_REFRESH_EXPIRES || '30d') });
// POST /auth/register
async function register(req, res) {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu ít nhất 6 ký tự' });
        }
        const exists = await models_1.User.findOne({ email: email.toLowerCase().trim() });
        if (exists) {
            return res.status(409).json({ success: false, message: 'Email này đã được đăng ký' });
        }
        const user = await models_1.User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            phone: phone || '',
            isVerified: true,
        });
        const access = signAccess(user.id, user.role, user.email);
        const refresh = signRefresh(user.id);
        user.refreshTokens.push(refresh);
        await user.save();
        return res.status(201).json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
                access,
                refresh,
            }
        });
    }
    catch (err) {
        console.error('Register error:', err);
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Email này đã được đăng ký' });
        }
        return res.status(500).json({ success: false, message: 'Đăng ký thất bại, vui lòng thử lại' });
    }
}
// POST /auth/login
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }
        const user = await models_1.User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }
        // ── Check khoá tài khoản ──
        if (user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ admin.' });
        }
        const access = signAccess(user.id, user.role, user.email);
        const refresh = signRefresh(user.id);
        user.refreshTokens.push(refresh);
        if (user.refreshTokens.length > 5)
            user.refreshTokens.shift();
        await user.save();
        return res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
                access,
                refresh,
            }
        });
    }
    catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Đăng nhập thất bại, vui lòng thử lại' });
    }
}
// POST /auth/refresh
async function refreshToken(req, res) {
    try {
        const { refresh } = req.body;
        if (!refresh)
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        const decoded = jsonwebtoken_1.default.verify(refresh, process.env.JWT_REFRESH_SECRET);
        const user = await models_1.User.findById(decoded.id);
        if (!user || !user.refreshTokens.includes(refresh)) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }
        // ── Check khoá tài khoản ──
        if (user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ admin.' });
        }
        const newAccess = signAccess(user.id, user.role, user.email);
        const newRefresh = signRefresh(user.id);
        user.refreshTokens = user.refreshTokens.filter((t) => t !== refresh);
        user.refreshTokens.push(newRefresh);
        await user.save();
        return res.json({ success: true, data: { access: newAccess, refresh: newRefresh } });
    }
    catch {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
}
// POST /auth/logout
async function logout(req, res) {
    try {
        const { refresh } = req.body;
        const user = await models_1.User.findById(req.user?.id);
        if (user && refresh) {
            user.refreshTokens = user.refreshTokens.filter((t) => t !== refresh);
            await user.save();
        }
        return res.json({ success: true, message: 'Logged out' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /auth/me
async function getMe(req, res) {
    try {
        const user = await models_1.User.findById(req.user?.id).select('-password -refreshTokens');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        return res.json({ success: true, data: user });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/send-otp
async function sendOtp(req, res) {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ success: false, message: 'Thiếu email' });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await models_1.OTP.deleteMany({ email: email.toLowerCase() });
        await models_1.OTP.create({ email: email.toLowerCase(), otp: code, expiresAt });
        const result = await (0, emailService_1.sendOtpEmail)(email, code, 'verify');
        return res.json({
            success: true,
            message: 'OTP đã gửi đến email của bạn',
            otp: code,
            previewUrl: result.previewUrl || undefined,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/verify-otp
async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body;
        const record = await models_1.OTP.findOne({ email, used: false, expiresAt: { $gt: new Date() } });
        if (!record)
            return res.status(400).json({ success: false, message: 'OTP hết hạn' });
        const bcryptV = require('bcryptjs');
        const isValidV = await bcryptV.compare(otp, record.otp);
        if (!isValidV)
            return res.status(400).json({ success: false, message: 'OTP không đúng' });
        record.used = true;
        await record.save();
        await models_1.User.findOneAndUpdate({ email }, { isVerified: true });
        return res.json({ success: true, message: 'OTP verified' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/forgot-password
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.json({ success: true, message: 'Nếu email tồn tại, OTP đã được gửi' });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const bcryptForgot = require('bcryptjs');
        const hashedOtp = await bcryptForgot.hash(code, 10);
        await models_1.OTP.deleteMany({ email: email.toLowerCase() });
        await models_1.OTP.create({ email: email.toLowerCase(), otp: hashedOtp, expiresAt });
        console.log(`\n${'='.repeat(50)}\n🔑 FORGOT PASSWORD OTP\n   Email: ${email}\n   OTP:   ${code}\n${'='.repeat(50)}\n`);
        const result = await (0, emailService_1.sendOtpEmail)(email, code, 'forgot').catch(() => ({ previewUrl: null }));
        return res.json({
            success: true,
            message: 'OTP đã được gửi đến email của bạn',
            otp: code,
            previewUrl: result.previewUrl || undefined,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/reset-password
async function resetPassword(req, res) {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải ít nhất 6 ký tự' });
        }
        const record = await models_1.OTP.findOne({
            email: email.toLowerCase(), used: false,
            expiresAt: { $gt: new Date() }
        });
        if (!record) {
            return res.status(400).json({ success: false, message: 'OTP đã hết hạn' });
        }
        const bcryptReset = require('bcryptjs');
        const isValidOtp = await bcryptReset.compare(otp, record.otp);
        if (!isValidOtp) {
            return res.status(400).json({ success: false, message: 'OTP không đúng' });
        }
        record.used = true;
        await record.save();
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(newPassword, 12);
        await models_1.User.findOneAndUpdate({ email: email.toLowerCase() }, { password: hashed, isVerified: true });
        return res.json({ success: true, message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/google
async function googleLogin(req, res) {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Thiếu Google credential' });
        }
        let payload;
        try {
            const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
            if (verifyRes.ok) {
                payload = await verifyRes.json();
            }
            else {
                const parts = credential.split('.');
                payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            }
        }
        catch {
            const parts = credential.split('.');
            payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
        const { email, name, picture, sub: googleId } = payload;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Không lấy được email từ Google' });
        }
        let user = await models_1.User.findOne({ email: email.toLowerCase() });
        // ── Check khoá tài khoản ──
        if (user && user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ admin.' });
        }
        if (!user) {
            user = await models_1.User.create({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                password: require('crypto').randomBytes(32).toString('hex'),
                avatar: picture,
                googleId,
                isVerified: true,
                role: 'customer',
            });
        }
        else if (!user.googleId) {
            user.googleId = googleId;
            if (picture && !user.avatar)
                user.avatar = picture;
            user.isVerified = true;
            await user.save();
        }
        const JWT_ACCESS = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
        const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || 'refresh_secret_dev';
        const access = require('jsonwebtoken').sign({ id: user._id, role: user.role }, JWT_ACCESS, { expiresIn: '8h' });
        const refresh = require('jsonwebtoken').sign({ id: user._id }, JWT_REFRESH, { expiresIn: '30d' });
        user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refresh];
        await user.save();
        return res.json({
            success: true,
            data: {
                user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
                access,
                refresh,
            }
        });
    }
    catch (err) {
        console.error('Google login error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/phone-send
async function phoneSendOtp(req, res) {
    try {
        const { phone } = req.body;
        if (!phone)
            return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại' });
        const normalized = phone.replace(/\s+/g, '').replace(/^\+84/, '0');
        if (!/^0[3-9]\d{8}$/.test(normalized)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (VD: 0912345678)' });
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const bcrypt = require('bcryptjs');
        const hashedOtp = await bcrypt.hash(code, 10);
        await models_1.OTP.deleteMany({ email: normalized });
        await models_1.OTP.create({ email: normalized, otp: hashedOtp, expiresAt });
        await (0, smsService_1.sendOtpSms)(normalized, code);
        return res.json({ success: true, message: `OTP đã gửi đến ${normalized}`, phone: normalized });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /auth/phone-verify
async function phoneVerifyOtp(req, res) {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }
        const normalized = phone.replace(/\s+/g, '').replace(/^\+84/, '0');
        const record = await models_1.OTP.findOne({
            email: normalized, used: false,
            expiresAt: { $gt: new Date() },
        });
        if (!record) {
            return res.status(400).json({ success: false, message: 'OTP đã hết hạn hoặc không tồn tại' });
        }
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(otp, record.otp);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'OTP không đúng' });
        }
        record.used = true;
        await record.save();
        let user = await models_1.User.findOne({ phone: normalized });
        // ── Check khoá tài khoản ──
        if (user && user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ admin.' });
        }
        const isNewUser = !user;
        if (!user) {
            const crypto = require('crypto');
            user = await models_1.User.create({
                name: `Khách ${normalized.slice(-4)}`,
                email: `${normalized}@phone.local`,
                password: crypto.randomBytes(32).toString('hex'),
                phone: normalized,
                isVerified: true,
                role: 'customer',
            });
        }
        else {
            if (!user.isVerified) {
                user.isVerified = true;
                await user.save();
            }
        }
        const access = signAccess(user.id, user.role, user.email);
        const refresh = signRefresh(user.id);
        user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refresh];
        await user.save();
        return res.json({
            success: true,
            data: {
                user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar },
                access,
                refresh,
                isNewUser,
            }
        });
    }
    catch (err) {
        console.error('Phone verify error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=auth.controller.js.map