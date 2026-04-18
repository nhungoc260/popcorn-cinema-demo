"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiChat = aiChat;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY || '' });
async function aiChat(req, res) {
    try {
        const { messages, movies } = req.body;
        const movieListText = movies.map((m) => `- Tên: ${m.title} | ID: ${m.id} | Thể loại: ${m.genres?.join(', ')} | Rating: ${m.rating} | Thời lượng: ${m.duration} phút | Trạng thái: ${m.status}`).join('\n');
        const systemPrompt = `Bạn là trợ lý AI thân thiện của Popcorn Cinema - rạp chiếu phim tại Việt Nam.
Nhiệm vụ: tư vấn phim dựa trên tâm trạng và sở thích khách hàng.

DANH SÁCH PHIM HIỆN CÓ:
${movieListText}

QUY TẮC BẮT BUỘC:
1. Trả lời tiếng Việt, thân thiện, ngắn gọn dưới 150 từ
2. Gợi ý 1-3 phim từ danh sách trên
3. Dùng số thứ tự: 1. 2. 3. (KHÔNG dùng * hoặc **)
4. Sau mỗi tên phim PHẢI đặt tag ID ngay liền, ví dụ:
   1. Tên Phim [PHIM_ID:69cb138b945925c03bdc08ec] - lý do gợi ý
5. Tag PHẢI đúng format [PHIM_ID:id] - KHÔNG có dấu cách, KHÔNG có nháy kép
6. Chỉ dùng ID từ danh sách phim ở trên, KHÔNG tự bịa ID`;
        const history = messages.slice(0, -1).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
        const lastMessage = messages[messages.length - 1].content;
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: lastMessage },
            ],
            max_tokens: 500,
            temperature: 0.5,
        });
        const text = completion.choices[0].message.content || '';
        return res.json({ success: true, data: { text } });
    }
    catch (err) {
        console.error('AI Chat Error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=ai.controller.js.map