const https = require('https');

const GROQ_API_HOST = 'api.groq.com';
const GROQ_CHAT_COMPLETIONS_PATH = '/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const SUPPORT_RESOURCES = [
  {
    type: 'Video',
    title: 'Thiền 5 phút giảm lo âu',
    url: 'https://www.youtube.com/watch?v=inpok4MKVLM',
    best_for: 'lo âu, căng thẳng, cần bình tĩnh nhanh'
  },
  {
    type: 'Blog',
    title: 'Cách vượt qua Burnout mùa thi',
    url: '#',
    best_for: 'kiệt sức, áp lực học tập, mùa thi'
  },
  {
    type: 'Book',
    title: 'Hiểu về trái tim - Minh Niệm',
    url: 'https://thuvienhoasen.org/images/file/y5sBQGYE1QgQAHou/hieu-ve-trai-tim.pdf',
    best_for: 'tự hiểu cảm xúc, chữa lành, suy ngẫm sâu'
  },
  {
    type: 'Podcast',
    title: 'Radio Cảm Xúc #12 - Chữa lành',
    url: 'https://open.spotify.com/episode/63VvDWyELyutySrZSRU1Hq',
    best_for: 'muốn nghe chia sẻ nhẹ nhàng, cô đơn, buồn'
  },
  {
    type: 'Công cụ',
    title: 'Bài tập thở giảm Stress',
    url: 'Mở trong mục Resources của MindConnect',
    best_for: 'stress tức thời, khó ngủ, cần điều hòa nhịp thở'
  }
];

const SUPPORT_INSTRUCTIONS = `
Bạn là MindConnect AI, trợ lý trò chuyện hỗ trợ sức khỏe tinh thần cho sinh viên.
Mục tiêu: trò chuyện tự nhiên, lắng nghe thật, phản hồi theo đúng điều người dùng vừa nói, và đưa ra một bước nhỏ có thể làm ngay.

Phong cách trả lời:
- Luôn trả lời bằng tiếng Việt, ấm áp, cụ thể, không sáo rỗng.
- Không dùng một câu mở đầu cố định cho mọi lượt. Không lặp lại mẫu "Cảm ơn bạn đã chia sẻ..." nếu nội dung không cần.
- Bám sát chi tiết trong tin nhắn mới và lịch sử gần nhất; nếu người dùng nói về deadline, cô đơn, mất ngủ, cần người nói chuyện, hoặc gửi nội dung không rõ nghĩa thì phản hồi khác nhau.
- Nếu tin nhắn quá ngắn hoặc khó hiểu như một dãy số, hãy nói nhẹ nhàng rằng bạn chưa hiểu và hỏi lại một câu cụ thể.
- Trả lời 4-7 câu ngắn. Có thể dùng 2-3 gạch đầu dòng khi đưa bài tập hoặc kế hoạch nhỏ.
- Chỉ gợi ý tài nguyên MindConnect khi thật sự liên quan; không ép người dùng xem Resources ở mọi câu.

Quy tắc an toàn:
- Không chẩn đoán bệnh, không kê thuốc, không thay thế chuyên gia tâm lý/bác sĩ.
- Nếu người dùng có dấu hiệu tự hại, tự tử, hoặc nguy hiểm tức thời: ưu tiên an toàn ngay lập tức, khuyến nghị gọi hotline 1900.1267, liên hệ người tin cậy, hoặc dịch vụ khẩn cấp tại địa phương.
- Không hứa giữ bí mật tuyệt đối khi có nguy cơ an toàn.
- Không đưa hướng dẫn tự hại hoặc mô tả phương pháp gây hại.
- Khi gợi ý link, ghi URL dạng plain text để giao diện tự biến thành link.
`.trim();

function postJson(path, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: GROQ_API_HOST,
        path,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 30000
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch (error) {
            error.statusCode = 502;
            error.message = 'Groq returned a non-JSON response';
            return reject(error);
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(parsed.error?.message || 'Groq API request failed');
            error.statusCode = res.statusCode || 502;
            error.details = parsed;
            return reject(error);
          }

          resolve(parsed);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Groq API request timed out'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sanitizeText(value, maxLength = 1200) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getGroqApiKey({ required = true } = {}) {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  const isPlaceholder = apiKey === 'gsk-your-groq-api-key' || apiKey.includes('your-groq-api-key');

  if (!apiKey || isPlaceholder) {
    if (!required) return '';

    const error = new Error('GROQ_API_KEY is not configured. Add a real Groq API key in backend/.env and restart the backend.');
    error.statusCode = 500;
    throw error;
  }

  return apiKey;
}

function buildResourceCatalog() {
  return SUPPORT_RESOURCES
    .map(resource => `- ${resource.type}: ${resource.title} | phù hợp: ${resource.best_for} | link: ${resource.url}`)
    .join('\n');
}

function buildSupportInstructions() {
  return `${SUPPORT_INSTRUCTIONS}\n\nTài nguyên MindConnect có thể gợi ý khi phù hợp:\n${buildResourceCatalog()}`;
}

function buildConversationInput(message, history = []) {
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const historyMessages = recentHistory
    .map(item => {
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      const content = sanitizeText(item.content, 900);
      return content ? { role, content } : null;
    })
    .filter(Boolean);

  return [
    { role: 'system', content: buildSupportInstructions() },
    ...historyMessages,
    { role: 'user', content: sanitizeText(message, 1600) }
  ];
}

function extractChatCompletionText(response) {
  return String(response.choices?.[0]?.message?.content || '').trim();
}

async function generateSupportReply({ message, history }) {
  const apiKey = getGroqApiKey();

  const payload = {
    model: process.env.GROQ_MODEL || DEFAULT_MODEL,
    messages: buildConversationInput(message, history),
    temperature: 0.7,
    max_completion_tokens: 650
  };

  const response = await postJson(GROQ_CHAT_COMPLETIONS_PATH, payload, apiKey);
  const reply = extractChatCompletionText(response);

  if (!reply) {
    const error = new Error('Groq returned an empty response');
    error.statusCode = 502;
    throw error;
  }

  return {
    reply,
    model: payload.model,
    response_id: response.id
  };
}

function fallbackDiaryTags(text) {
  const normalized = sanitizeText(text).toLowerCase();
  const tags = [];

  if (normalized.includes('thi') || normalized.includes('học') || normalized.includes('điểm') || normalized.includes('deadline')) {
    tags.push('Học tập');
  }
  if (normalized.includes('buồn') || normalized.includes('khóc') || normalized.includes('lo') || normalized.includes('stress')) {
    tags.push('Lo âu');
  }
  if (normalized.includes('bạn') || normalized.includes('gia đình') || normalized.includes('cãi')) {
    tags.push('Mối quan hệ');
  }
  if (normalized.includes('ngủ') || normalized.includes('mệt')) {
    tags.push('Sức khỏe');
  }

  return tags.length ? tags : ['Tâm sự'];
}

async function suggestDiaryTags({ title, content }) {
  const text = `${title || ''}\n${content || ''}`.trim();
  const apiKey = getGroqApiKey({ required: false });

  if (!apiKey) {
    return { tags: fallbackDiaryTags(text), model: 'fallback' };
  }

  const payload = {
    model: process.env.GROQ_MODEL || DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: [
          'Bạn phân loại nhật ký sinh viên cho app MindConnect.',
          'Trả về JSON hợp lệ dạng {"tags":["..."]}.',
          'Chỉ chọn tối đa 4 tag ngắn bằng tiếng Việt.',
          'Ưu tiên các tag: Học tập, Lo âu, Mối quan hệ, Sức khỏe, Cô đơn, Mất ngủ, Tài chính, Hướng nghiệp, Tâm sự.'
        ].join(' ')
      },
      { role: 'user', content: sanitizeText(text, 3000) }
    ],
    temperature: 0.2,
    max_completion_tokens: 180
  };

  try {
    const response = await postJson(GROQ_CHAT_COMPLETIONS_PATH, payload, apiKey);
    const output = extractChatCompletionText(response);
    const parsed = JSON.parse(output);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map(tag => sanitizeText(tag, 40)).filter(Boolean).slice(0, 4)
      : [];

    return {
      tags: tags.length ? tags : fallbackDiaryTags(text),
      model: payload.model,
      response_id: response.id
    };
  } catch (error) {
    return { tags: fallbackDiaryTags(text), model: 'fallback' };
  }
}

module.exports = {
  generateSupportReply,
  suggestDiaryTags,
  isGroqConfigured: () => Boolean(getGroqApiKey({ required: false }))
};
