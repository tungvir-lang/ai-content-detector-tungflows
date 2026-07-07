import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {Bot, Send, User} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {api} from '../lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Tôi hay mất ngủ, lo lắng nhiều, nên khám gì?',
  'Trẻ 3 tuổi chậm nói, ít giao tiếp mắt có sao không?',
  'Dấu hiệu trầm cảm sau sinh là gì?',
  'Bố tôi hay quên, nên khám bác sỹ nào?',
];

export default function Consult() {
  const [messages, setMessages] = useState<Msg[]>([
    {role: 'assistant', content: 'Xin chào! Tôi là **Trợ lý MeHeal**. Bạn có thể mô tả triệu chứng hoặc thắc mắc về sức khỏe tâm thần, tôi sẽ tư vấn sơ bộ và gợi ý bác sỹ phù hợp. 💬\n\n*Lưu ý: đây là tư vấn tham khảo, không thay thế khám trực tiếp.*'},
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/ai/status').then((s) => setAiReady(s.configured)).catch(() => setAiReady(false));
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next = [...messages, {role: 'user' as const, content: text}];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', {messages: next});
      setMessages([...next, {role: 'assistant', content: res.reply}]);
    } catch (e: any) {
      setMessages([...next, {role: 'assistant', content: `⚠️ ${e.message || 'Không kết nối được AI.'}\n\nBạn vẫn có thể **[đặt lịch khám](/dat-lich)** hoặc gọi hotline để được hỗ trợ trực tiếp.`}]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-6">
        <div className="inline-flex w-14 h-14 rounded-2xl brand-gradient text-white items-center justify-center mb-3">
          <Bot size={28} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800">Tư vấn cùng Trợ lý AI</h1>
        <p className="text-gray-500 mt-1">Hỏi đáp về sức khỏe tâm thần, gợi ý bác sỹ & dịch vụ phù hợp.</p>
        {aiReady === false && (
          <p className="mt-3 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 inline-block">
            Trợ lý AI chưa được cấu hình. Quản trị viên có thể bật trong trang Admin → Cài đặt AI.
          </p>
        )}
      </div>

      <div className="card p-4 h-[52vh] overflow-y-auto flex flex-col gap-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'brand-gradient text-white'}`}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-brand-50 text-gray-800'}`}>
              <div className="prose prose-sm max-w-none [&_a]:text-brand-600 [&_a]:underline [&_ul]:my-1 [&_p]:my-1">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400 pl-11">Trợ lý đang soạn trả lời…</div>}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs bg-white border border-brand-100 rounded-full px-3 py-1.5 text-gray-600 hover:border-brand-400">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2">
        <input className="input" placeholder="Nhập câu hỏi của bạn…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-4">
        Cần khám trực tiếp? <Link to="/dat-lich" className="text-brand-600 font-semibold">Đặt lịch ngay</Link>
      </p>
    </div>
  );
}
