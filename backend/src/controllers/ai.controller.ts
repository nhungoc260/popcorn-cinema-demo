import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function aiChat(req: Request, res: Response) {
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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();

    return res.json({ success: true, data: { text } });
  } catch (err: any) {
    console.error('AI Chat Error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
}