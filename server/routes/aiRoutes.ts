import {Router} from 'express';
import {chat, triage, aiStatus, type ChatMessage} from '../ai.ts';

export const aiRouter = Router();

aiRouter.get('/status', (_req, res) => {
  res.json(aiStatus());
});

aiRouter.post('/chat', async (req, res) => {
  const messages = (req.body?.messages || []) as ChatMessage[];
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({error: 'Thiếu nội dung hội thoại.'});
  }
  try {
    const reply = await chat(messages.slice(-12));
    res.json({reply});
  } catch (e: any) {
    res.status(500).json({error: e?.message || 'Lỗi gọi AI.'});
  }
});

aiRouter.post('/triage', async (req, res) => {
  const symptoms = String(req.body?.symptoms || '').trim();
  if (!symptoms) return res.status(400).json({error: 'Vui lòng mô tả triệu chứng.'});
  try {
    res.json({result: await triage(symptoms)});
  } catch (e: any) {
    res.status(500).json({error: e?.message || 'Lỗi gọi AI.'});
  }
});
