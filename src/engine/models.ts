import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ollama } from "ollama";
import { getApiKey } from "./config.js";

export type ModelProvider = "anthropic" | "openai" | "google" | "ollama";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseURL?: string; // For Ollama
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export const AVAILABLE_MODELS = {
  anthropic: [
    "claude-sonnet-4-5",
    "claude-opus-4-1",
    "claude-haiku-4-5",
    "claude-sonnet-4",
  ],
  openai: ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-pro"],
  google: [
    "gemini-2-5-pro",
    "gemini-2-5-flash",
    "gemini-2-5-flash-lite",
    "gemini-2-0-flash",
  ],
  ollama: [
    "deepseek-r1:latest",
    "qwen2.5-coder:14b",
    "llama3.3:70b",
    "phi-3-mini",
    "codellama:13b",
    "mistral:7b",
  ],
} as const;

// Get installed Ollama models from local instance
export async function getInstalledOllamaModels(): Promise<string[]> {
  try {
    const ollama = new Ollama({ host: "http://localhost:11434" });
    const response = await ollama.list();

    // Extract model names from the response
    if (response && response.models && Array.isArray(response.models)) {
      return response.models.map((model: any) => model.name);
    }

    return [];
  } catch (error) {
    // Ollama not running or not installed
    return [];
  }
}

// Create a model client
export async function createModelClient(config: ModelConfig) {
  const { provider, apiKey, baseURL } = config;

  switch (provider) {
    case "anthropic": {
      const key = apiKey || (await getApiKey("anthropic"));
      if (!key) throw new Error("Anthropic API key not found");
      return new Anthropic({ apiKey: key });
    }

    case "openai": {
      const key = apiKey || (await getApiKey("openai"));
      if (!key) throw new Error("OpenAI API key not found");
      return new OpenAI({ apiKey: key });
    }

    case "google": {
      const key = apiKey || (await getApiKey("google"));
      if (!key) throw new Error("Google API key not found");
      return new GoogleGenerativeAI(key);
    }

    case "ollama": {
      return new Ollama({ host: baseURL || "http://localhost:11434" });
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Send a prompt and get a response
export async function sendPrompt(
  config: ModelConfig,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
): Promise<string> {
  const client = await createModelClient(config);
  const { provider, model } = config;

  switch (provider) {
    case "anthropic":
      return await sendAnthropicPrompt(
        client as Anthropic,
        model,
        messages,
        onStream,
      );

    case "openai":
      return await sendOpenAIPrompt(
        client as OpenAI,
        model,
        messages,
        onStream,
      );

    case "google":
      return await sendGooglePrompt(
        client as GoogleGenerativeAI,
        model,
        messages,
        onStream,
      );

    case "ollama":
      return await sendOllamaPrompt(
        client as Ollama,
        model,
        messages,
        onStream,
      );

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Anthropic implementation
async function sendAnthropicPrompt(
  client: Anthropic,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
): Promise<string> {
  const systemMessage = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");

  if (onStream) {
    let fullContent = "";
    const stream = await client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullContent += text;
        onStream({ content: text, done: false });
      }
    }

    onStream({ content: "", done: true });
    return fullContent;
  } else {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}

// OpenAI implementation
async function sendOpenAIPrompt(
  client: OpenAI,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
): Promise<string> {
  if (onStream) {
    let fullContent = "";
    const stream = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onStream({ content: delta, done: false });
      }
    }

    onStream({ content: "", done: true });
    return fullContent;
  } else {
    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return response.choices[0]?.message?.content || "";
  }
}

// Google implementation
async function sendGooglePrompt(
  client: GoogleGenerativeAI,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
): Promise<string> {
  const genModel = client.getGenerativeModel({ model });

  // Convert messages to Google format
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  if (onStream) {
    let fullContent = "";
    const result = await genModel.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullContent += text;
      onStream({ content: text, done: false });
    }

    onStream({ content: "", done: true });
    return fullContent;
  } else {
    const result = await genModel.generateContent(prompt);
    return result.response.text();
  }
}

// Ollama implementation
async function sendOllamaPrompt(
  client: Ollama,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
): Promise<string> {
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  try {
    if (onStream) {
      let fullContent = "";
      const stream = await client.generate({
        model,
        prompt,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.response) {
          fullContent += chunk.response;
          onStream({ content: chunk.response, done: chunk.done });
        }
      }

      return fullContent;
    } else {
      const response = await client.generate({
        model,
        prompt,
      });

      return response.response;
    }
  } catch (error: any) {
    if (error.status_code === 404 || error.message?.includes("not found")) {
      throw new Error(
        `Ollama model '${model}' not found. Please pull the model first:\n  ollama pull ${model}\n\nOr select a different model with: churn switch-model`,
      );
    }
    throw error;
  }
}

// Check if a model is available
export async function isModelAvailable(config: ModelConfig): Promise<boolean> {
  try {
    const client = await createModelClient(config);

    if (config.provider === "ollama") {
      // Check if Ollama is running
      const ollama = client as Ollama;
      await ollama.list();
      return true;
    }

    return true;
  } catch {
    return false;
  }
}

// Get available models for a provider
export function getAvailableModels(provider: ModelProvider): readonly string[] {
  return AVAILABLE_MODELS[provider];
}
