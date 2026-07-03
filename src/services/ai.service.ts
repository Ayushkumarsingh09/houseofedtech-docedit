import { generateText } from "ai";

import { getEnv } from "@/config/env";
import { stripHtml } from "@/lib/sanitize";

/**
 * AI add-on features, as encouraged by the assignment ("Use AI for add-on
 * features"). The app must be fully usable — and demo-able — without any
 * paid API key, so every capability here has a deterministic local fallback
 * that activates automatically when no provider key is configured.
 */

type AiCapability = "summarize" | "continue" | "improve";

function resolveModel() {
  const env = getEnv();
  if (env.OPENAI_API_KEY) {
    // Lazily imported so the package is never pulled in when unused.
    return import("@ai-sdk/openai").then((m) => m.openai("gpt-4o-mini"));
  }
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return import("@ai-sdk/google").then((m) => m.google("gemini-1.5-flash"));
  }
  return null;
}

function fallbackSummarize(plainText: string): string {
  const sentences = plainText.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return plainText.slice(0, 240);
  const topSentences = sentences
    .map((sentence, index) => ({ sentence, score: sentence.length * (1 / (index + 1)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.sentence);
  return topSentences.join(" ");
}

function fallbackContinue(plainText: string): string {
  const trimmed = plainText.trim();
  if (!trimmed) return "Start by outlining your main idea in one sentence.";
  const lastSentence = trimmed.split(/(?<=[.!?])\s+/).pop() ?? trimmed;
  return `Building on "${lastSentence.slice(0, 60)}", consider expanding with a concrete example or supporting detail.`;
}

function fallbackImprove(plainText: string): string {
  return plainText
    .replace(/\bvery\s+/gi, "")
    .replace(/\breally\s+/gi, "")
    .replace(/\bin order to\b/gi, "to")
    .trim();
}

async function withFallback(
  capability: AiCapability,
  html: string,
  run: (model: unknown, text: string) => Promise<string>,
) {
  const plainText = stripHtml(html).slice(0, 6000);
  if (!plainText.trim()) {
    return { text: "", usedProvider: false as const };
  }

  try {
    const model = await resolveModel();
    if (!model) throw new Error("no-provider-configured");
    const text = await run(model, plainText);
    return { text, usedProvider: true as const };
  } catch {
    const fallback =
      capability === "summarize"
        ? fallbackSummarize(plainText)
        : capability === "continue"
          ? fallbackContinue(plainText)
          : fallbackImprove(plainText);
    return { text: fallback, usedProvider: false as const };
  }
}

export const aiService = {
  summarize(html: string) {
    return withFallback("summarize", html, async (model, text) => {
      const { text: result } = await generateText({
        model: model as Parameters<typeof generateText>[0]["model"],
        system: "You summarize documents in at most 3 concise sentences, no preamble.",
        prompt: text,
      });
      return result;
    });
  },

  continueWriting(html: string) {
    return withFallback("continue", html, async (model, text) => {
      const { text: result } = await generateText({
        model: model as Parameters<typeof generateText>[0]["model"],
        system:
          "Continue the user's document for one short paragraph, matching their tone. Return only the continuation.",
        prompt: text,
      });
      return result;
    });
  },

  improveWriting(html: string) {
    return withFallback("improve", html, async (model, text) => {
      const { text: result } = await generateText({
        model: model as Parameters<typeof generateText>[0]["model"],
        system:
          "Rewrite the given text to be clearer and more concise while preserving meaning. Return only the rewritten text.",
        prompt: text,
      });
      return result;
    });
  },
};
