const https = require('https');

const OPENAI_API_HOST = 'api.openai.com';
const OPENAI_RESPONSES_PATH = '/v1/responses';
const DEFAULT_MODEL = 'gpt-5.5';

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
Bạn là trợ lý AI hỗ trợ tâm lý cho sinh viên trong ứng dụng MindConnect.
Mục tiêu: lắng nghe, phản hồi ấm áp, ngắn gọn, thực tế và hướng sinh viên đến nguồn hỗ trợ phù hợp.

Quy tắc an toàn:
- Không chẩn đoán bệnh, không kê thuốc, không thay thế chuyên gia tâm lý/bác sĩ.
- Nếu người dùng có dấu hiệu tự hại, tự tử, hoặc nguy hiểm tức thời: phản hồi ưu tiên an toàn ngay lập tức, khuyến nghị gọi hotline 1900.1267, liên hệ người tin cậy, hoặc dịch vụ khẩn cấp tại địa phương.
- Không hứa giữ bí mật tuyệt đối khi có nguy cơ an toàn.
- Không đưa hướng dẫn tự hại hoặc mô tả phương pháp gây hại.
- Khi phù hợp, gợi ý 1-2 tài nguyên từ danh sách MindConnect bên dưới. Không bịa tài nguyên ngoài danh sách.
- Khi gợi ý link, ghi URL dạng plain text để giao diện tự biến thành link.
- Luôn trả lời bằng tiếng Việt, thân thiện, tối đa 5 câu, có thể gợi ý một bước nhỏ cụ thể.
`.trim();

function postJson(path, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: OPENAI_API_HOST,
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
            error.message = 'OpenAI returned a non-JSON response';
            return reject(error);
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(parsed.error?.message || 'OpenAI API request failed');
            error.statusCode = res.statusCode || 502;
            error.details = parsed;
            return reject(error);
          }

          resolve(parsed);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('OpenAI API request timed out'));
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

function buildConversationInput(message, history = []) {
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const formattedHistory = recentHistory
    .map(item => {
      const role = item.role === 'assistant' ? 'AI' : 'Sinh viên';
      return `${role}: ${sanitizeText(item.content, 500)}`;
    })
    .filter(line => line.length > 12)
    .join('\n');
  const resourceCatalog = SUPPORT_RESOURCES
    .map(resource => `- ${resource.type}: ${resource.title} | phù hợp: ${resource.best_for} | link: ${resource.url}`)
    .join('\n');

  return [
    `Tài nguyên MindConnect có thể gợi ý:\n${resourceCatalog}`,
    formattedHistory ? `Lịch sử hội thoại gần nhất:\n${formattedHistory}` : 'Chưa có lịch sử hội thoại.',
    `Tin nhắn mới của sinh viên:\n${sanitizeText(message)}`
  ].join('\n\n');
}

function extractOutputText(response) {
  if (response.output_text) return response.output_text.trim();

  if (!Array.isArray(response.output)) return '';

  return response.output
    .flatMap(item => item.content || [])
    .map(part => part.text || '')
    .join('\n')
    .trim();
}

async function generateSupportReply({ message, history }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.statusCode = 500;
    throw error;
  }

  const payload = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions: SUPPORT_INSTRUCTIONS,
    input: buildConversationInput(message, history),
    max_output_tokens: 450
  };

  const response = await postJson(OPENAI_RESPONSES_PATH, payload, apiKey);
  const reply = extractOutputText(response);

  if (!reply) {
    const error = new Error('OpenAI returned an empty response');
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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { tags: fallbackDiaryTags(text), model: 'fallback' };
  }

  const payload = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions: [
      'Bạn phân loại nhật ký sinh viên cho app MindConnect.',
      'Trả về JSON hợp lệ dạng {"tags":["..."]}.',
      'Chỉ chọn tối đa 4 tag ngắn bằng tiếng Việt.',
      'Ưu tiên các tag: Học tập, Lo âu, Mối quan hệ, Sức khỏe, Cô đơn, Mất ngủ, Tài chính, Hướng nghiệp, Tâm sự.'
    ].join(' '),
    input: sanitizeText(text, 3000),
    max_output_tokens: 180
  };

  try {
    const response = await postJson(OPENAI_RESPONSES_PATH, payload, apiKey);
    const output = extractOutputText(response);
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
  suggestDiaryTags
};
