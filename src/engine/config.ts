import fs from "fs-extra";
import path from "path";
import os from "os";

export interface ChurnConfig {
  version: string;
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  defaultModel?: {
    provider: "anthropic" | "openai" | "google" | "ollama";
    model: string;
  };
  preferences?: {
    autoApply?: boolean;
    verbose?: boolean;
  };
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

// Set API key for a provider
export async function setApiKey(
  provider: "anthropic" | "openai" | "google",
  key: string,
): Promise<void> {
  const config = await loadConfig();

  if (!config.apiKeys) {
    config.apiKeys = {};
  }

  config.apiKeys[provider] = key;
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
