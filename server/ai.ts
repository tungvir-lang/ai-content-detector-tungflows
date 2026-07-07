import {GoogleGenAI} from '@google/genai';
import {getJSON} from './db.ts';
import {buildAISystemPrompt} from './content.ts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIConfig {
  provider: 'gemini' | 'openai' | 'compatible';
  gemini: {model: string; apiKey: string};
  openai: {model: string; apiKey: string};
  compatible: {baseUrl: string; apiKey: string; model: string};
}

function currentConfig(): AIConfig {
  return getJSON<AIConfig>('ai_config', {
    provider: 'gemini',
    gemini: {model: 'gemini-2.0-flash', apiKey: ''},
    openai: {model: 'gpt-4o-mini', apiKey: ''},
    compatible: {baseUrl: '', apiKey: '', model: ''},
  });
}

export function aiStatus() {
  const c = currentConfig();
  return {
    provider: c.provider,
    configured:
      (c.provider === 'gemini' && !!c.gemini.apiKey) ||
      (c.provider === 'openai' && !!c.openai.apiKey) ||
      (c.provider === 'compatible' && !!c.compatible.baseUrl),
    models: {gemini: c.gemini.model, openai: c.openai.model, compatible: c.compatible.model},
    // Gợi ý các model phù hợp cho phòng khám (chi phí thấp, tiếng Việt tốt).
    suggestions: [
      {provider: 'gemini', model: 'gemini-2.0-flash', note: 'Nhanh, rẻ, tiếng Việt tốt (khuyến nghị)'},
      {provider: 'openai', model: 'gpt-4o-mini', note: 'Ổn định, chất lượng cao'},
      {provider: 'compatible', model: 'deepseek-chat', note: 'DeepSeek - chi phí rất thấp'},
      {provider: 'compatible', model: 'llama3.1 (Ollama)', note: 'Chạy nội bộ, bảo mật dữ liệu, miễn phí'},
    ],
  };
}

async function chatOpenAICompatible(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[], system: string): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
    body: JSON.stringify({
      model,
      messages: [{role: 'system', content: system}, ...messages.map((m) => ({role: m.role, content: m.content}))],
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`AI API lỗi ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content?.trim() || '(không có phản hồi)';
}

async function chatGemini(apiKey: string, model: string, messages: ChatMessage[], system: string): Promise<string> {
  const ai = new GoogleGenAI({apiKey});
  const contents = messages.map((m) => ({role: m.role === 'assistant' ? 'model' : 'user', parts: [{text: m.content}]}));
  const res = await ai.models.generateContent({
    model,
    contents,
    config: {systemInstruction: system, temperature: 0.6},
  });
  return res.text?.trim() || '(không có phản hồi)';
}

/** Điểm vào chung cho trợ lý tư vấn AI. */
export async function chat(messages: ChatMessage[]): Promise<string> {
  const c = currentConfig();
  const system = buildAISystemPrompt();
  if (c.provider === 'openai') {
    if (!c.openai.apiKey) throw new Error('Chưa cấu hình OpenAI API key.');
    return chatOpenAICompatible('https://api.openai.com/v1', c.openai.apiKey, c.openai.model, messages, system);
  }
  if (c.provider === 'compatible') {
    if (!c.compatible.baseUrl) throw new Error('Chưa cấu hình endpoint AI tương thích.');
    return chatOpenAICompatible(c.compatible.baseUrl, c.compatible.apiKey, c.compatible.model, messages, system);
  }
  if (!c.gemini.apiKey) throw new Error('Chưa cấu hình Gemini API key.');
  return chatGemini(c.gemini.apiKey, c.gemini.model, messages, system);
}

/** Gợi ý bác sỹ/dịch vụ phù hợp từ triệu chứng (fallback nếu chưa cấu hình AI). */
export async function triage(symptoms: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: `Người dùng mô tả: "${symptoms}". Hãy phân tích sơ bộ có thể liên quan đến nhóm rối loạn nào, gợi ý dịch vụ và bác sỹ phù hợp tại phòng khám, và nhắc họ đặt lịch. Trả lời ngắn gọn.`,
    },
  ];
  return chat(messages);
}
