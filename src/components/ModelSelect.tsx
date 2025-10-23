import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { theme, symbols } from "../theme.js";
import { getProviderLabel } from "../brand-icons.js";
import {
  ModelProvider,
  AVAILABLE_MODELS,
  ModelConfig,
} from "../engine/models.js";
import {
  getDefaultModel,
  setDefaultModel,
  getApiKey,
  setApiKey,
} from "../engine/config.js";

interface ModelSelectProps {
  onComplete: (config: ModelConfig) => void;
}

type SelectPhase = "provider" | "model" | "apiKey" | "complete";

export function ModelSelect({ onComplete }: ModelSelectProps) {
  const [phase, setPhase] = useState<SelectPhase>("provider");
  const [selectedProvider, setSelectedProvider] =
    useState<ModelProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [apiKey, setApiKeyInput] = useState("");
  const [existingKey, setExistingKey] = useState<string | null>(null);

  useEffect(() => {
    loadDefaults();
  }, []);

  async function loadDefaults() {
    const defaultModel = await getDefaultModel();
    if (defaultModel) {
      setSelectedProvider(defaultModel.provider);
      setSelectedModel(defaultModel.model);
    }
  }

  const providerItems = [
    {
      label: getProviderLabel("anthropic"),
      value: "anthropic" as ModelProvider,
    },
    { label: getProviderLabel("openai"), value: "openai" as ModelProvider },
    { label: getProviderLabel("google"), value: "google" as ModelProvider },
    { label: getProviderLabel("ollama"), value: "ollama" as ModelProvider },
  ];

  async function handleProviderSelect(item: { value: ModelProvider }) {
    setSelectedProvider(item.value);

    // Check for existing API key (except Ollama)
    if (item.value !== "ollama") {
      const key = await getApiKey(item.value);
      setExistingKey(key || null);
    }

    setPhase("model");
  }

  async function handleModelSelect(item: { value: string }) {
    setSelectedModel(item.value);

    // If Ollama or has existing key, complete immediately
    if (selectedProvider === "ollama" || existingKey) {
      await completeSelection(item.value, existingKey || "");
    } else {
      setPhase("apiKey");
    }
  }

  async function handleApiKeySubmit() {
    if (!selectedProvider || !selectedModel) return;

    // Save API key
    if (selectedProvider !== "ollama" && apiKey) {
      await setApiKey(selectedProvider, apiKey);
    }

    await completeSelection(selectedModel, apiKey);
  }

  async function completeSelection(model: string, key: string) {
    if (!selectedProvider) return;

    // Save as default
    await setDefaultModel(selectedProvider, model);

    const config: ModelConfig = {
      provider: selectedProvider,
      model,
      apiKey: key || undefined,
    };

    setPhase("complete");
    setTimeout(() => onComplete(config), 500);
  }

  if (phase === "provider") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Select AI Model Provider</Text>
        </Box>

        <SelectInput
          items={providerItems}
          onSelect={handleProviderSelect}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? "#ff6f54" : "#a6adc8"}>
              {isSelected ? symbols.pointer : " "}
            </Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? "#ff6f54" : "#f2e9e4"}>{label}</Text>
          )}
        />
      </Box>
    );
  }

  if (phase === "model" && selectedProvider) {
    const models = AVAILABLE_MODELS[selectedProvider];
    const modelItems = models.map((m) => ({ label: m, value: m }));

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Select Model</Text>
        </Box>

        {existingKey && (
          <Box marginBottom={1}>
            <Text color="#a6e3a1">{symbols.tick} Using saved API key</Text>
          </Box>
        )}

        <SelectInput
          items={modelItems}
          onSelect={handleModelSelect}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? "#ff6f54" : "#a6adc8"}>
              {isSelected ? symbols.pointer : " "}
            </Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? "#ff6f54" : "#f2e9e4"}>{label}</Text>
          )}
        />
      </Box>
    );
  }

  if (phase === "apiKey" && selectedProvider) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Enter API Key for {selectedProvider}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="#a6adc8">
            The key will be stored securely in ~/.churn/config.json
          </Text>
        </Box>

        <Box>
          <Text color="#ff6f54">{symbols.pointer} </Text>
          <TextInput
            value={apiKey}
            onChange={setApiKeyInput}
            onSubmit={handleApiKeySubmit}
            placeholder="sk-..."
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  if (phase === "complete") {
    return (
      <Box paddingY={1}>
        <Text color="#a6e3a1">
          {symbols.tick} Model configured: {selectedProvider}/{selectedModel}
        </Text>
      </Box>
    );
  }

  return null;
}
