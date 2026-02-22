import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

export function Feedback() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  if (feedback) {
    return (
      <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 animate-in fade-in zoom-in duration-300">
        <p className="text-sm font-medium">Cảm ơn bạn đã đánh giá!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-6 bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-sm">
      <p className="text-sm text-zinc-400">Kết quả phân tích có hữu ích không?</p>
      <div className="flex gap-4">
        <button
          onClick={() => setFeedback('up')}
          className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <ThumbsUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => setFeedback('down')}
          className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <ThumbsDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
