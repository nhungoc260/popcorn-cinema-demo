import { Request, Response } from 'express';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

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

    // Chuyển messages sang format Groq (giống OpenAI)
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const lastMessage = messages[messages.length - 1].content;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: lastMessage },
      ],
      max_tokens: 500,
    });

    const text = completion.choices[0].message.content || '';

    return res.json({ success: true, data: { text } });
  } catch (err: any) {
    console.error('AI Chat Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}