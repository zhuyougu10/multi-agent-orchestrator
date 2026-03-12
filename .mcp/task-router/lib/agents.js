import { z } from "zod";

export const AGENT_NAMES = ["codex", "gemini"];
export const AGENT_SCHEMA = z.enum(AGENT_NAMES);
export const OPTIONAL_AGENT_SCHEMA = AGENT_SCHEMA.optional();
export const PREFERRED_AGENT_SCHEMA = z.enum(["auto", ...AGENT_NAMES]).default("auto");

export function chooseAgent(taskType, preferredAgent = "auto") {
  if (preferredAgent && preferredAgent !== "auto") {
    return AGENT_SCHEMA.parse(preferredAgent);
  }

  const codexTypes = ["implementation", "refactor", "tests", "bugfix", "script"];
  const geminiTypes = ["docs", "summarization", "comparison", "ux-copy"];
  if (codexTypes.includes(taskType)) return "codex";
  if (geminiTypes.includes(taskType)) return "gemini";
  return "codex";
}
