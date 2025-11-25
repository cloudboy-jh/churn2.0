import fs from "fs-extra";
import path from "path";
import os from "os";

export type AgentType = "claude" | "cursor" | "gemini" | "codex" | "none";
export type ContextFormat = "minimal" | "comprehensive";

export interface InsightsConfig {
  enableDependencyAnalysis: boolean;
  enableCodeAgeMetrics: boolean;
  checkOutdatedDeps: boolean;
  codeAgeThresholds: {
    hotZoneMaxDays: number;
    coldZoneMinDays: number;
    orphanedFileMinDays: number;
  };
  excludeFromAgeAnalysis: string[];
}

export interface HandoffConfig {
  enabled: boolean;
  targetAgent: AgentType;
  contextFormat: ContextFormat;
  autoLaunch: boolean;
  agentCommands: Record<AgentType, string>;
}

export interface ChurnConfig {
  version: string;
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  apiKeyTimestamps?: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  defaultModel?: {
    provider: "anthropic" | "openai" | "google" | "ollama";
    model: string;
  };
  // Remember last selected model per provider
  lastModelByProvider?: {
    anthropic?: string;
    openai?: string;
    google?: string;
    ollama?: string;
  };
  preferences?: {
    autoApply?: boolean;
    verbose?: boolean;
    concurrency?: number;
  };
  handoff?: HandoffConfig;
  insights?: InsightsConfig;
}

export interface ProjectConfig {
  lastRun?: string;
  lastModel?: string;
  ignorePatterns?: string[];
}

const CONFIG_DIR = path.join(os.homedir(), ".churn");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const PROJECT_CONFIG_DIR = ".churn";
const PROJECT_CONFIG_FILE = path.join(PROJECT_CONFIG_DIR, "config.json");

// Ensure config directory exists
export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

// Ensure project-local .churn directory exists
export async function ensureProjectDir(
  cwd: string = process.cwd(),
): Promise<void> {
  const projectChurnDir = path.join(cwd, PROJECT_CONFIG_DIR);
  await fs.ensureDir(projectChurnDir);
  await fs.ensureDir(path.join(projectChurnDir, "reports"));
  await fs.ensureDir(path.join(projectChurnDir, "patches"));
}

// Load global config
export async function loadConfig(): Promise<ChurnConfig> {
  await ensureConfigDir();

  if (await fs.pathExists(CONFIG_FILE)) {
    return await fs.readJSON(CONFIG_FILE);
  }

  // Default config
  return {
    version: "2.0.0",
  };
}

// Save global config
export async function saveConfig(config: ChurnConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeJSON(CONFIG_FILE, config, { spaces: 2 });
}

// Update specific config fields
export async function updateConfig(
  updates: Partial<ChurnConfig>,
): Promise<void> {
  const config = await loadConfig();
  const updated = { ...config, ...updates };
  await saveConfig(updated);
}

// Load project-local config
export async function loadProjectConfig(
  cwd: string = process.cwd(),
): Promise<ProjectConfig> {
  const projectConfigPath = path.join(cwd, PROJECT_CONFIG_FILE);

  if (await fs.pathExists(projectConfigPath)) {
    return await fs.readJSON(projectConfigPath);
  }

  return {};
}

// Save project-local config
export async function saveProjectConfig(
  config: ProjectConfig,
  cwd: string = process.cwd(),
): Promise<void> {
  await ensureProjectDir(cwd);
  const projectConfigPath = path.join(cwd, PROJECT_CONFIG_FILE);
  await fs.writeJSON(projectConfigPath, config, { spaces: 2 });
}

// Get API key for a provider
export async function getApiKey(
  provider: "anthropic" | "openai" | "google",
): Promise<string | undefined> {
  const config = await loadConfig();
  return (
    config.apiKeys?.[provider] ||
    process.env[`${provider.toUpperCase()}_API_KEY`]
  );
}

// Get API key timestamp for a provider
export async function getApiKeyTimestamp(
  provider: "anthropic" | "openai" | "google",
): Promise<string | undefined> {
  const config = await loadConfig();
  return config.apiKeyTimestamps?.[provider];
}

// Format API key age in human-readable format
export function formatKeyAge(timestamp: string | undefined): string {
  if (!timestamp) {
    return "unknown";
  }

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 365) {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  } else if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "just now";
  }
}

// Set API key for a provider
export async function setApiKey(
  provider: "anthropic" | "openai" | "google",
  key: string,
): Promise<void> {
  const config = await loadConfig();

  if (!config.apiKeys) {
    config.apiKeys = {};
  }

  if (!config.apiKeyTimestamps) {
    config.apiKeyTimestamps = {};
  }

  config.apiKeys[provider] = key;
  config.apiKeyTimestamps[provider] = new Date().toISOString();
  await saveConfig(config);
}

// Get default model (returns undefined if not configured)
export async function getDefaultModel(): Promise<
  ChurnConfig["defaultModel"] | undefined
> {
  const config = await loadConfig();
  return config.defaultModel;
}

// Set default model
export async function setDefaultModel(
  provider: "anthropic" | "openai" | "google" | "ollama",
  model: string,
): Promise<void> {
  const config = await loadConfig();
  config.defaultModel = { provider, model };

  // Also remember this as the last model for this provider
  if (!config.lastModelByProvider) {
    config.lastModelByProvider = {};
  }
  config.lastModelByProvider[provider] = model;

  await saveConfig(config);
}

// Get last selected model for a specific provider
export async function getLastModelForProvider(
  provider: "anthropic" | "openai" | "google" | "ollama",
): Promise<string | undefined> {
  const config = await loadConfig();
  return config.lastModelByProvider?.[provider];
}

// Set last selected model for a provider (without changing default)
export async function setLastModelForProvider(
  provider: "anthropic" | "openai" | "google" | "ollama",
  model: string,
): Promise<void> {
  const config = await loadConfig();

  if (!config.lastModelByProvider) {
    config.lastModelByProvider = {};
  }
  config.lastModelByProvider[provider] = model;

  await saveConfig(config);
}

// Get config directory paths
export function getConfigPaths() {
  return {
    configDir: CONFIG_DIR,
    configFile: CONFIG_FILE,
    projectConfigDir: PROJECT_CONFIG_DIR,
  };
}

// Check if user has at least one API key configured
export async function hasApiKey(): Promise<boolean> {
  const config = await loadConfig();
  return !!(
    config.apiKeys?.anthropic ||
    config.apiKeys?.openai ||
    config.apiKeys?.google
  );
}

// Check if model is configured
export async function isModelConfigured(): Promise<boolean> {
  const config = await loadConfig();
  return !!config.defaultModel;
}

// Check if setup is complete (model configured)
export async function isSetupComplete(): Promise<boolean> {
  return await isModelConfigured();
}

// Get concurrency limit with smart defaults by provider
export async function getConcurrency(
  provider?: "anthropic" | "openai" | "google" | "ollama",
): Promise<number> {
  const config = await loadConfig();
  const userSetting = config.preferences?.concurrency;

  // If user has set a preference, use it
  if (userSetting !== undefined) {
    return Math.max(1, Math.min(50, userSetting)); // Clamp to 1-50
  }

  // Smart defaults based on provider (increased for better performance)
  if (provider) {
    const providerDefaults: Record<string, number> = {
      ollama: 20, // Local, can handle more
      openai: 15, // Generous rate limits (increased from 10)
      anthropic: 15, // Improved from 8 for faster analysis
      google: 15, // Good limits (increased from 10)
    };
    return providerDefaults[provider] || 10;
  }

  // Default fallback
  return 10;
}

// Set concurrency limit
export async function setConcurrency(value: number): Promise<void> {
  if (value < 1 || value > 50) {
    throw new Error("Concurrency must be between 1 and 50");
  }

  const config = await loadConfig();
  if (!config.preferences) {
    config.preferences = {};
  }
  config.preferences.concurrency = value;
  await saveConfig(config);
}

// Get default handoff configuration
function getDefaultHandoffConfig(): HandoffConfig {
  return {
    enabled: true,
    targetAgent: "none",
    contextFormat: "minimal",
    autoLaunch: true,
    agentCommands: {
      claude: "claude",
      cursor: "cursor",
      gemini: "gemini",
      codex: "codex",
      none: "",
    },
  };
}

// Get handoff configuration
export async function getHandoffConfig(): Promise<HandoffConfig> {
  const config = await loadConfig();
  return config.handoff || getDefaultHandoffConfig();
}

// Save handoff configuration
export async function saveHandoffConfig(
  handoffConfig: Partial<HandoffConfig>,
): Promise<void> {
  const config = await loadConfig();
  const currentHandoff = config.handoff || getDefaultHandoffConfig();
  config.handoff = { ...currentHandoff, ...handoffConfig };
  await saveConfig(config);
}

// Update specific handoff fields
export async function updateHandoffConfig(
  updates: Partial<HandoffConfig>,
): Promise<void> {
  await saveHandoffConfig(updates);
}

// Get default insights configuration
export function getDefaultInsightsConfig(): InsightsConfig {
  return {
    enableDependencyAnalysis: true,
    enableCodeAgeMetrics: true,
    checkOutdatedDeps: false,
    codeAgeThresholds: {
      hotZoneMaxDays: 30,
      coldZoneMinDays: 90,
      orphanedFileMinDays: 180,
    },
    excludeFromAgeAnalysis: ["node_modules", ".git", "dist", "build", ".churn"],
  };
}

// Get insights configuration
export async function getInsightsConfig(): Promise<InsightsConfig> {
  const config = await loadConfig();
  return config.insights || getDefaultInsightsConfig();
}

// Update insights configuration
export async function updateInsightsConfig(
  updates: Partial<InsightsConfig>,
): Promise<void> {
  const config = await loadConfig();
  const currentInsights = config.insights || getDefaultInsightsConfig();
  config.insights = { ...currentInsights, ...updates };
  await saveConfig(config);
}
