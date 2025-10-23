// Brand names for terminal/CLI display
// Clean text labels without emojis or unicode symbols

export const brandNames = {
  anthropic: "Claude (Anthropic)",
  openai: "GPT (OpenAI)",
  google: "Gemini (Google)",
  ollama: "Ollama (Local)",
} as const;

// Get formatted provider label
export function getProviderLabel(provider: keyof typeof brandNames): string {
  return brandNames[provider];
}
