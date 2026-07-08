/**
 * Robustly extracts and parses JSON from LLM content outputs.
 * Handles Markdown wraps (```json ... ```) and minor structural malformations.
 */
export const parseLLMJSON = (text) => {
  if (!text) return {};
  let cleaned = text.trim();

  // 1. Remove markdown formatting wrapper if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  // 2. Extract JSON boundaries (first '{' or '[' to last '}' or ']')
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf("]");
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[parseLLMJSON] Direct JSON parse failed, attempting sanitization...", err.message);

    // 3. Fallback: Clean up trailing commas and invisible control characters
    try {
      const sanitized = cleaned
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // remove control characters
        .replace(/,\s*([\]}])/g, "$1"); // remove trailing commas
      return JSON.parse(sanitized);
    } catch (innerErr) {
      console.error("[parseLLMJSON] Sanitization failed. Raw text:", text);
      throw new Error(`Failed to parse LLM response into JSON: ${innerErr.message}`);
    }
  }
};
