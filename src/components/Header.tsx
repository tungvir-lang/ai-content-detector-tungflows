import { Bot, FileText } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">AI Content Detector</h1>
            <p className="text-xs text-zinc-400">Powered by Gemini 2.5</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">About</a>
          <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">API</a>
        </div>
      </div>
    </header>
  );
}
