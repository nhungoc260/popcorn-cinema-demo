"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const models_1 = require("../models");
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/popcorn_cinema';
const MOVIES = [
    {
        title: 'Cú Nhảy Kỳ Diệu',
        titleEn: 'Hoppers',
        description: 'Mabel – cô gái yêu động vật vô tình tiếp cận công nghệ cho phép chuyển ý thức con người vào robot động vật. Dưới hình dạng một con hải ly, Mabel khám phá thế giới tự nhiên từ góc nhìn hoàn toàn mới.',
        poster: 'https://cinestar.com.vn/_next/image/?url=https%3A%2F%2Fapi-website.cinestar.com.vn%2Fmedia%2Fwysiwyg%2FPosters%2F03-2026%2Fhoppers.jpg&w=1920&q=75',
        duration: 105,
        genres: ['Hoạt Hình', 'Phiêu Lưu', 'Gia Đình'],
        rating: 8.5,
        director: 'Pixar Animation Studios',
        status: 'now_showing',
        ageRating: 'P',
        releaseDate: new Date('2026-03-13'),
    },
    {
        title: 'Quỷ Nhập Tràng 2',
        titleEn: 'Quy Nhap Trang 2',
        description: 'Tiếp nối phần đầu, bộ phim đưa khán giả trở lại với những hủ tục tâm linh bí ẩn và câu chuyện rùng rợn xoay quanh người chết tại các vùng quê hẻo lánh.',
        poster: 'https://cinestar.com.vn/_next/image/?url=https%3A%2F%2Fapi-website.cinestar.com.vn%2Fmedia%2Fwysiwyg%2FPosters%2F03-2026%2Fquy-nhap-trang.jpg&w=1920&q=75',
        duration: 126,
        genres: ['Kinh Dị', 'Tâm Linh'],
        rating: 7.5,
        director: 'Pom Nguyễn',
        status: 'now_showing',
        ageRating: 'T16',
        releaseDate: new Date('2026-03-13'),
    },
    {
        title: 'Tài',
        titleEn: 'Tai',
        description: 'Tài bất ngờ rơi vào vòng xoáy nguy hiểm vì một khoản nợ khổng lồ. Bị dồn vào đường cùng, anh phải đối mặt với câu hỏi lớn nhất: liệu lòng hiếu thảo có đủ để biện minh cho con đường đang đi.',
        poster: 'https://cinestar.com.vn/_next/image/?url=https%3A%2F%2Fapi-website.cinestar.com.vn%2Fmedia%2Fwysiwyg%2FPosters%2F03-2026%2Ftai.jpg&w=1920&q=75',
        duration: 100,
        genres: ['Hành Động', 'Gia Đình', 'Tâm Lý'],
        rating: 7.8,
        director: 'Mai Tài Phến',
        status: 'now_showing',
        ageRating: 'T16',
        releaseDate: new Date('2026-03-06'),
    },
    {
        title: 'Tiếng Thét 7',
        titleEn: 'Scream 7',
        description: 'Sidney Evans, nạn nhân sống sót của một vụ thảm sát, đang sống hạnh phúc thì tên sát nhân Ghostface mới lại xuất hiện và nhắm vào con gái cô.',
        poster: 'https://cinestar.com.vn/_next/image/?url=https%3A%2F%2Fapi-website.cinestar.com.vn%2Fmedia%2Fwysiwyg%2FPosters%2F03-2026%2Fscream-7.jpg&w=1920&q=75',
        duration: 112,
        genres: ['Kinh Dị', 'Hồi Hộp'],
        rating: 7.2,
        director: 'Kevin Williamson',
        status: 'now_showing',
        ageRating: 'T18',
        releaseDate: new Date('2026-03-20'),
    },
    {
        title: 'Đếm Ngày Xa Mẹ',
        titleEn: 'When The Phone Rings',
        description: 'Ha Min bất ngờ sở hữu khả năng nhìn thấy những con số bí ẩn xuất hiện mỗi khi thưởng thức món ăn do mẹ nấu. Khi con số chạm mức 0, cũng là lúc mẹ phải rời xa cõi đời.',
        poster: 'https://cinestar.com.vn/_next/image/?url=https%3A%2F%2Fapi-website.cinestar.com.vn%2Fmedia%2Fwysiwyg%2FPosters%2F03-2026%2Fdem-ngay-xa-me-poster.jpg&w=1920&q=75',
        duration: 118,
        genres: ['Tâm Lý', 'Tình Cảm', 'Gia Đình'],
        rating: 8.2,
        director: 'Kim Jung Sik',
        status: 'now_showing',
        ageRating: 'P',
        releaseDate: new Date('2026-03-13'),
    },
    {
        title: 'Tứ Hổ Đại Náo',
        titleEn: '4 Tigers',
        description: 'Trong Thế Chiến II, 9 tấn vàng của chính phủ Thái Lan đột ngột bị thất lạc. Bốn tên cướp khét tiếng với năng lực tà thuật riêng bị lôi kéo vào trò chơi tử thần.',
        poster: 'https://cinestar.com.vn/_next/image/?url=https%3A%2F%2Fapi-website.cinestar.com.vn%2Fmedia%2Fwysiwyg%2FPosters%2F03-2026%2F4-tigers.jpg&w=1920&q=75',
        duration: 120,
        genres: ['Hành Động', 'Thần Thoại', 'Phiêu Lưu'],
        rating: 7.0,
        director: 'Wisit Sasanatieng',
        status: 'now_showing',
        ageRating: 'T16',
        releaseDate: new Date('2026-03-27'),
    },
];
async function seed() {
    await mongoose_1.default.connect(MONGO_URI);
    console.log('🌱 Connected to MongoDB. Seeding...');
    // Clear
    await Promise.all([models_1.User.deleteMany({}), models_1.Movie.deleteMany({}), models_1.Theater.deleteMany({}), models_1.Room.deleteMany({}), models_1.Seat.deleteMany({}), models_1.Showtime.deleteMany({})]);
    console.log('🗑  Cleared existing data');
    // Users
    const admin = await models_1.User.create({ name: 'Ngọc Admin', email: 'ngocadmin@gmail.com', password: 'admin123', role: 'admin', isVerified: true });
    const staff = await models_1.User.create({ name: 'Ngọc Nhân Viên', email: 'ngocnhanvien@gmail.com', password: 'staff123', role: 'staff', isVerified: true });
    const customer = await models_1.User.create({ name: 'Ngọc User', email: 'ngocuser@gmail.com', password: 'user123', role: 'customer', isVerified: true });
    // Walk-in user — đại diện cho khách vãng lai mua tại quầy không có tài khoản
    await models_1.User.create({ name: 'Khách Vãng Lai', email: 'walkin@popcorn.local', password: 'walkin_not_login', role: 'customer', isVerified: false, isActive: true });
    console.log('👥 Users created: admin / staff / customer / walk-in');
    // Movies
    const movies = await models_1.Movie.insertMany(MOVIES);
    console.log(` ${movies.length} movies created`);
    // Theaters - multiple cities
    const theater = await models_1.Theater.create({ name: 'Popcorn Cinema - Quận 1', address: '123 Nguyễn Huệ, Quận 1', city: 'Hồ Chí Minh', phone: '028-1234-5678' });
    const theater2 = await models_1.Theater.create({ name: 'Popcorn Cinema - Gò Vấp', address: '456 Quang Trung, Gò Vấp', city: 'Hồ Chí Minh', phone: '028-2345-6789' });
    const theater3 = await models_1.Theater.create({ name: 'Popcorn Cinema - Hà Nội', address: '789 Hoàng Cầu, Đống Đa', city: 'Hà Nội', phone: '024-1234-5678' });
    const theater4 = await models_1.Theater.create({ name: 'Popcorn Cinema - Đà Nẵng', address: '321 Nguyễn Văn Linh, Thanh Khê', city: 'Đà Nẵng', phone: '0236-1234-5678' });
    // Rooms
    const room1 = await models_1.Room.create({ theater: theater._id, name: 'Phòng 01 - Standard', type: 'standard', rows: 8, cols: 10, totalSeats: 80 });
    const room2 = await models_1.Room.create({ theater: theater._id, name: 'Phòng 02 - VIP', type: 'vip', rows: 6, cols: 8, totalSeats: 48 });
    // Seats for room1 (8 rows A-H, 10 cols)
    const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatDocs1 = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 1; c <= 10; c++) {
            const type = r >= 6 ? 'vip' : 'standard';
            seatDocs1.push({ room: room1._id, row: ROWS[r], col: c, number: c, label: `${ROWS[r]}${c}`, type, price: type === 'vip' ? 130000 : 85000 });
        }
    }
    const inserted1 = await models_1.Seat.insertMany(seatDocs1);
    // Đồng bộ vào room.seats embedded để SeatGrid hoạt động
    await models_1.Room.findByIdAndUpdate(room1._id, {
        seats: inserted1.map((s) => ({ _id: s._id, row: s.row, number: s.col, type: s.type, isAisle: false })),
        rows: 8, cols: 10,
    });
    // Seats for room2 (VIP only)
    const ROWS2 = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatDocs2 = [];
    for (let r = 0; r < 6; r++) {
        for (let c = 1; c <= 8; c++) {
            const isCoupleRow = r >= 4;
            seatDocs2.push({ room: room2._id, row: ROWS2[r], col: c, label: `${ROWS2[r]}${c}`, type: isCoupleRow ? 'couple' : 'vip', price: isCoupleRow ? 200000 : 130000 });
        }
    }
    const inserted2 = await models_1.Seat.insertMany(seatDocs2);
    await models_1.Room.findByIdAndUpdate(room2._id, {
        seats: inserted2.map((s) => ({ _id: s._id, row: s.row, number: s.col, type: s.type, isAisle: false })),
        rows: 6, cols: 8,
    });
    console.log('🏛  Theater, rooms & seats created');
    // Showtimes (next 3 days)
    const showtimeDocs = [];
    const showingMovies = movies.filter(m => m.status === 'now_showing');
    for (let day = 0; day < 3; day++) {
        for (const movie of showingMovies.slice(0, 4)) {
            const base = new Date();
            base.setDate(base.getDate() + day);
            // Ngày hôm nay: bắt đầu từ giờ tiếp theo, ngày khác: từ 9h
            if (day === 0) {
                const nextHour = base.getHours() + 1;
                base.setHours(nextHour < 10 ? 10 : nextHour, 0, 0, 0);
            }
            else {
                base.setHours(9, 0, 0, 0);
            }
            for (let slot = 0; slot < 3; slot++) {
                const start = new Date(base.getTime() + slot * 3 * 60 * 60 * 1000);
                const end = new Date(start.getTime() + (movie.duration + 15) * 60 * 1000);
                showtimeDocs.push({
                    movie: movie._id, room: slot % 2 === 0 ? room1._id : room2._id,
                    theater: theater._id, startTime: start, endTime: end,
                    language: slot === 0 ? 'sub' : 'dub', format: slot === 2 ? '3D' : '2D',
                    basePrice: slot === 2 ? 110000 : 85000,
                });
            }
        }
    }
    await models_1.Showtime.insertMany(showtimeDocs);
    console.log(`🎟  ${showtimeDocs.length} showtimes created`);
    // Seed coupons
    await models_1.Coupon.deleteMany({});
    await models_1.Coupon.insertMany([
        { code: 'WELCOME20', type: 'percent', value: 20, minOrder: 100000, maxDiscount: 50000, usageLimit: 500, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
        { code: 'POPCORN50K', type: 'fixed', value: 50000, minOrder: 200000, maxDiscount: 50000, usageLimit: 200, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { code: 'VIP30', type: 'percent', value: 30, minOrder: 300000, maxDiscount: 100000, usageLimit: 100, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
    ]);
    console.log('🎫 Coupons seeded: WELCOME20 | POPCORN50K | VIP30');
    console.log('\n✅ Seed complete!');
    console.log('────────────────────────────────');
    console.log('👤 Admin:    ngocadmin@gmail.com / admin123');
    console.log('👤 Staff:    ngocnhanvien@gmail.com / staff123');
    console.log('👤 Customer: ngocuser@gmail.com  / user123');
    await mongoose_1.default.disconnect();
}
seed().catch(err => { console.error(err); process.exit(1); });
// Already handled in main seed function
//# sourceMappingURL=seed.js.map