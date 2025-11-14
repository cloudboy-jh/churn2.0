import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ollama } from "ollama";
import { getApiKey } from "./config.js";
import * as https from "https";
import * as http from "http";

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

export interface PromptOptions {
  onStream?: (chunk: StreamChunk) => void;
  abortSignal?: AbortSignal;
  timeout?: number; // milliseconds
}

// Default timeout configurations
export const DEFAULT_TIMEOUTS = {
  connection: 30000, // 30 seconds to establish connection
  request: 120000, // 2 minutes for API response
  ollama: 30000, // 30 seconds for local Ollama
} as const;

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
      return new Anthropic({
        apiKey: key,
        timeout: DEFAULT_TIMEOUTS.request,
        maxRetries: 3,
        httpAgent: new https.Agent({
          keepAlive: true,
          timeout: DEFAULT_TIMEOUTS.connection,
        }),
      });
    }

    case "openai": {
      const key = apiKey || (await getApiKey("openai"));
      if (!key) throw new Error("OpenAI API key not found");
      return new OpenAI({
        apiKey: key,
        timeout: DEFAULT_TIMEOUTS.request,
        maxRetries: 3,
      });
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
  options?: PromptOptions,
): Promise<string> {
  const client = await createModelClient(config);
  const { provider, model } = config;

  // Setup timeout with AbortController
  const timeout =
    options?.timeout ||
    (provider === "ollama"
      ? DEFAULT_TIMEOUTS.ollama
      : DEFAULT_TIMEOUTS.request);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  // Combine external abort signal with timeout
  const combinedSignal = options?.abortSignal
    ? combineAbortSignals([options.abortSignal, abortController.signal])
    : abortController.signal;

  try {
    let result: string;

    switch (provider) {
      case "anthropic":
        result = await sendAnthropicPrompt(
          client as Anthropic,
          model,
          messages,
          options?.onStream,
          combinedSignal,
        );
        break;

      case "openai":
        result = await sendOpenAIPrompt(
          client as OpenAI,
          model,
          messages,
          options?.onStream,
          combinedSignal,
        );
        break;

      case "google":
        result = await sendGooglePrompt(
          client as GoogleGenerativeAI,
          model,
          messages,
          options?.onStream,
          combinedSignal,
        );
        break;

      case "ollama":
        result = await sendOllamaPrompt(
          client as Ollama,
          model,
          messages,
          options?.onStream,
          combinedSignal,
        );
        break;

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError" || combinedSignal.aborted) {
      throw new Error(
        `Request timeout after ${timeout / 1000}s. The API is taking too long to respond.`,
      );
    }
    throw error;
  }
}

// Helper to combine multiple AbortSignals
function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

// Anthropic implementation
async function sendAnthropicPrompt(
  client: Anthropic,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  const systemMessage = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");

  try {
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

      return response.content[0].type === "text"
        ? response.content[0].text
        : "";
    }
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error(
        "Invalid Anthropic API key. Please run 'churn model' to update your API key.",
      );
    } else if (error.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    } else if (error.message?.includes("authentication")) {
      throw new Error(
        "Authentication error with Anthropic API. Please check your API key with 'churn model'.",
      );
    }
    throw error;
  }
}

// OpenAI implementation
async function sendOpenAIPrompt(
  client: OpenAI,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  try {
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
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error(
        "Invalid OpenAI API key. Please run 'churn model' to update your API key.",
      );
    } else if (error.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    }
    throw error;
  }
}

// Google implementation
async function sendGooglePrompt(
  client: GoogleGenerativeAI,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  const genModel = client.getGenerativeModel({ model });

  // Convert messages to Google format
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  try {
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
  } catch (error: any) {
    if (
      error.message?.includes("API_KEY") ||
      error.message?.includes("API key")
    ) {
      throw new Error(
        "Invalid Google API key. Please run 'churn model' to update your API key.",
      );
    } else if (error.message?.includes("quota")) {
      throw new Error("Google API quota exceeded. Please wait and try again.");
    }
    throw error;
  }
}

// Ollama implementation
async function sendOllamaPrompt(
  client: Ollama,
  model: string,
  messages: Message[],
  onStream?: (chunk: StreamChunk) => void,
  abortSignal?: AbortSignal,
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
