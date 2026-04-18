"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiChat = aiChat;
const generative_ai_1 = require("@google/generative-ai");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
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
- Cuối mỗi gợi ý phim, thêm: [PHIM_ID:{id}]
- Ngắn gọn dưới 200 từ`;
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });
        // Chỉ lấy các cặp user-model, bỏ tin chào đầu tiên
        const allPrev = messages.slice(0, -1);
        const history = [];
        for (const m of allPrev) {
            if (m.role === 'user') {
                history.push({ role: 'user', parts: [{ text: m.content }] });
            }
            else if (m.role === 'assistant' && history.length > 0) {
                history.push({ role: 'model', parts: [{ text: m.content }] });
            }
        }
        const chat = model.startChat({ history });
        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const text = result.response.text();
        return res.json({ success: true, data: { text } });
    }
    catch (err) {
        console.error('AI Chat Error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=ai.controller.js.map