export interface AnalysisResult {
  aiScore: number;
  isAi: boolean;
  reasoning: string;
  segments: {
    text: string;
    isAi: boolean;
    reason: string;
  }[];
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  result: AnalysisResult | null;
  sources: Source[];
  error?: string;
}
