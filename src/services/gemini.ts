import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, Source } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeText(text: string): Promise<{ result: AnalysisResult; sources: Source[] }> {
  try {
    const prompt = `
      Analyze the following text to determine if it was written by an AI or a Human.
      
      Text to analyze:
      "${text}"

      You MUST return a valid JSON object. Do not include any markdown formatting, backticks, or explanations outside the JSON.
      The JSON object must have the following structure:
      {
        "aiScore": number (0-100, where 100 is definitely AI),
        "isAi": boolean (true if score > 50),
        "reasoning": string (explanation of why it seems like AI or Human, citing specific patterns like perplexity, burstiness, repetition, or lack of nuance),
        "segments": [
          {
            "text": string (the specific sentence or phrase),
            "isAi": boolean (true if this specific part sounds like AI),
            "reason": string (short reason for this segment)
          }
        ]
      }
      
      IMPORTANT: 
      1. Be critical. Look for "AI-ese" words (e.g., "delve", "tapestry", "landscape", "crucial", "testament").
      2. Look for perfect grammar but lack of soul/idiom.
      3. If the text is factual and neutral, it might be hard to tell, so be conservative.
      4. Return ONLY the JSON object.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from AI");
    }
    
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const analysisData = JSON.parse(cleanJson) as AnalysisResult;

    // Extract sources from grounding metadata
    const sources: Source[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || "Nguồn tham khảo",
            url: chunk.web.uri,
            snippet: chunk.web.snippet, // Note: snippet might not always be available in this structure depending on API version
          });
        }
      });
    }

    return { result: analysisData, sources };
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw error;
  }
}
