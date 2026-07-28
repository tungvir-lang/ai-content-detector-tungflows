import { detectAiContent } from "../core/detector";
import { AnalysisResult, Source } from "../types";

/**
 * Lớp mỏng cho web app. Toàn bộ logic nằm ở src/core/detector.ts để
 * MCP server (mcp/server.ts) dùng chung cùng một bộ prompt.
 */
export async function analyzeText(
  text: string
): Promise<{ result: AnalysisResult; sources: Source[] }> {
  return detectAiContent(text);
}

export { traceContentSource, analyzeWritingStyle, humanizeText } from "../core/detector";
