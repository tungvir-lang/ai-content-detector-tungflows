import { useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { InputArea } from "./components/InputArea";
import { AnalysisReport } from "./components/AnalysisReport";
import { ShareButton } from "./components/ShareButton";
import { analyzeText } from "./services/gemini";
import { AnalysisResult, Source } from "./types";
import { AlertCircle } from "lucide-react";

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [originalText, setOriginalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setOriginalText(text);
    setResult(null);
    setSources([]);

    try {
      const { result: analysisResult, sources: foundSources } = await analyzeText(text);
      setResult(analysisResult);
      setSources(foundSources);
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi khi phân tích văn bản. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent pb-2">
            Kiểm tra nội dung AI
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Phát hiện văn bản do AI tạo ra, đánh giá độ tin cậy và truy nguyên nguồn gốc bài viết chỉ trong vài giây.
          </p>
        </div>

        <InputArea onAnalyze={handleAnalyze} isLoading={isLoading} />

        {error && (
          <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex justify-end max-w-6xl mx-auto">
              <ShareButton />
            </div>
            <AnalysisReport 
              result={result} 
              sources={sources} 
              originalText={originalText} 
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
