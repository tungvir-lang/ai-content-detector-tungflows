import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "../lib/utils";

interface InputAreaProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
}

export function InputArea({ onAnalyze, isLoading }: InputAreaProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length > 10) {
      onAnalyze(text);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-1 shadow-xl backdrop-blur-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dán văn bản của bạn vào đây để kiểm tra (tối thiểu 10 ký tự)..."
          className="w-full h-64 bg-transparent text-zinc-100 placeholder-zinc-500 p-6 resize-none focus:outline-none text-lg leading-relaxed font-sans"
          disabled={isLoading}
        />
        <div className="px-6 pb-4 flex items-center justify-between border-t border-white/5 pt-4">
          <span className="text-xs font-mono text-zinc-500">
            {text.length} ký tự
          </span>
          <button
            onClick={handleSubmit}
            disabled={isLoading || text.length < 10}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200",
              isLoading || text.length < 10
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Kiểm tra văn bản
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex justify-center gap-8 text-xs text-zinc-500 font-mono uppercase tracking-wider">
        <span>Phát hiện AI</span>
        <span>Truy nguyên nguồn</span>
        <span>Phân tích ngữ nghĩa</span>
      </div>
    </div>
  );
}
