import { AnalysisResult, Source } from "../types";
import { ScoreGauge } from "./ScoreGauge";
import { ExternalLink, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { Feedback } from "./Feedback";

interface AnalysisReportProps {
  result: AnalysisResult;
  sources: Source[];
  originalText: string;
}

export function AnalysisReport({ result, sources, originalText }: AnalysisReportProps) {
  // Simple highlighting logic
  // We split the text by segments found in the result to highlight them
  // This is a naive implementation and might fail if segments are not exact matches
  // But for this demo it's sufficient.
  
  const getHighlightedText = () => {
    if (!result.segments || result.segments.length === 0) return originalText;

    // We will just render the text as is, and list the AI segments below.
    // OR we can try to split the text.
    
    return (
      <div className="whitespace-pre-wrap leading-relaxed text-zinc-300">
        {originalText.split('\n').map((paragraph, i) => (
          <p key={i} className="mb-4">
            {paragraph.split('. ').map((sentence, j) => {
              const cleanSentence = sentence.trim();
              const isAi = result.segments.some(s => s.text.includes(cleanSentence) || cleanSentence.includes(s.text));
              
              return (
                <span key={j} className={cn(
                  isAi ? "bg-red-500/20 text-red-200 px-1 rounded transition-colors duration-300" : ""
                )}>
                  {sentence}{j < paragraph.split('. ').length - 1 ? '. ' : ''}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Left Column: Score & Summary */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-6">Kết quả phân tích</h3>
          <div className="flex justify-center mb-8">
            <ScoreGauge score={result.aiScore} />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-sm text-zinc-400">Trạng thái</span>
              <span className={cn("text-sm font-medium flex items-center gap-2", 
                result.isAi ? "text-red-400" : "text-emerald-400"
              )}>
                {result.isAi ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {result.isAi ? "Nghi vấn AI" : "Con người"}
              </span>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg border border-white/5">
              <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" /> Lý do
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {result.reasoning}
              </p>
            </div>
          </div>
        </div>

        {/* Sources Section */}
        {sources.length > 0 && (
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Nguồn tham khảo</h3>
            <div className="space-y-3">
              {sources.map((source, idx) => (
                <a 
                  key={idx} 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-indigo-400 group-hover:text-indigo-300 truncate pr-4">
                      {source.title}
                    </h4>
                    <ExternalLink className="w-3 h-3 text-zinc-500 flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 truncate">{source.url}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <Feedback />
      </div>

      {/* Right Column: Detailed Text Analysis */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm min-h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Chi tiết văn bản</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                <span className="text-zinc-500">Khả năng cao là AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                <span className="text-zinc-500">Bình thường</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
             {getHighlightedText()}
          </div>
        </div>

        {/* AI Segments List */}
        {result.segments && result.segments.length > 0 && (
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Các đoạn văn đáng ngờ</h3>
            <div className="grid gap-4">
              {result.segments.map((segment, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="text-sm text-zinc-300 italic mb-2">"{segment.text}"</p>
                  <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {segment.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
