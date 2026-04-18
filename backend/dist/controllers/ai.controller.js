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
        const systemPrompt = `Bạn là trợ lý AI thân thiện của Popcorn Cinema - rạp chiếu phim tại Việt Nam.
Nhiệm vụ của bạn là tư vấn phim cho khách hàng dựa trên tâm trạng, hoàn cảnh và sở thích của họ.

Danh sách phim hiện có:
${JSON.stringify(movies, null, 2)}

Hướng dẫn:
- Trả lời bằng tiếng Việt, thân thiện và nhiệt tình
- Gợi ý 1-3 phim phù hợp nhất từ danh sách trên
- Giải thích tại sao phim đó phù hợp
- Cuối mỗi gợi ý phim, thêm ĐÚNG định dạng này: [PHIM_ID:abc123def456]
- Ngắn gọn dưới 200 từ

Ví dụ đúng: [PHIM_ID:69cb138b945925c03bdc08ec]
Ví dụ SAI: [PHIM_ID: "69cb138b945925c03bdc08ec"]`;
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