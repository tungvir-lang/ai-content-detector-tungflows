import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    // In a real app, this would generate a unique link.
    // For now, we just copy the current URL.
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        copied
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5"
      )}
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Đã sao chép link" : "Chia sẻ kết quả"}
    </button>
  );
}
