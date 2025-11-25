import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Text, Box, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useScreenSize } from "fullscreen-ink";
import { theme, symbols } from "../theme.js";
import { getProviderLabel } from "../brand-icons.js";
import {
  ModelProvider,
  AVAILABLE_MODELS,
  ModelConfig,
  getInstalledOllamaModels,
} from "../engine/models.js";
import {
  getDefaultModel,
  setDefaultModel,
  getApiKey,
  setApiKey,
  getLastModelForProvider,
  setLastModelForProvider,
  getApiKeyTimestamp,
  formatKeyAge,
} from "../engine/config.js";

interface ModelSelectProps {
  onComplete: (config: ModelConfig) => void;
}

type SelectPhase = "provider" | "model" | "apiKey" | "complete";

export function ModelSelect({ onComplete }: ModelSelectProps) {
  const { height: terminalHeight } = useScreenSize();
  const [phase, setPhase] = useState<SelectPhase>("provider");
  const [selectedProvider, setSelectedProvider] =
    useState<ModelProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [apiKey, setApiKeyInput] = useState("");
  const [existingKey, setExistingKey] = useState<string | null>(null);
  const [keyTimestamp, setKeyTimestamp] = useState<string | undefined>(
    undefined,
  );
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingOllama, setLoadingOllama] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadDefaults() {
      try {
        const defaultModel = await getDefaultModel();
        if (isMounted && defaultModel) {
          setSelectedProvider(defaultModel.provider);
          setSelectedModel(defaultModel.model);
        }
      } catch (error) {
        if (isMounted && !abortController.signal.aborted) {
          console.error("Failed to load default model:", error);
        }
      }
    }

    loadDefaults();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Global keyboard shortcuts (z = exit, r = replace key when applicable)
  const handleInput = useCallback(
    (input: string, key: any) => {
      if (input === "z") {
        process.exit(0);
      }

      // Handle 'r' to replace API key (only in model phase with existing key)
      if (
        input === "r" &&
        phase === "model" &&
        existingKey &&
        selectedProvider !== "ollama"
      ) {
        setExistingKey(null);
        setKeyTimestamp(undefined);
        setApiKeyInput("");
        setPhase("apiKey");
      }
    },
    [phase, existingKey, selectedProvider],
  );

  useInput(handleInput);

  const providerItems = useMemo(
    () => [
      {
        label: getProviderLabel("anthropic"),
        value: "anthropic" as ModelProvider,
      },
      { label: getProviderLabel("openai"), value: "openai" as ModelProvider },
      { label: getProviderLabel("google"), value: "google" as ModelProvider },
      { label: getProviderLabel("ollama"), value: "ollama" as ModelProvider },
    ],
    [],
  );

  const handleProviderSelect = useCallback(
    async (item: { value: ModelProvider }) => {
      try {
        setSelectedProvider(item.value);

        // Load last selected model for this provider
        const lastModel = await getLastModelForProvider(item.value);
        if (lastModel) {
          setSelectedModel(lastModel);
        }

        // Check for existing API key (except Ollama)
        if (item.value !== "ollama") {
          const key = await getApiKey(item.value);
          const timestamp = await getApiKeyTimestamp(item.value);
          setExistingKey(key || null);
          setKeyTimestamp(timestamp);
        } else {
          // For Ollama, fetch installed models
          setLoadingOllama(true);
          try {
            const installed = await getInstalledOllamaModels();
            setOllamaModels(installed);
          } catch (error) {
            console.error("Failed to fetch Ollama models:", error);
            setOllamaModels([]);
          } finally {
            setLoadingOllama(false);
          }
        }

        setPhase("model");
      } catch (error) {
        console.error("Failed to select provider:", error);
      }
    },
    [],
  );

  const completeSelection = useCallback(
    async (model: string, key: string) => {
      if (!selectedProvider) return;

      try {
        // Save as default
        await setDefaultModel(selectedProvider, model);

        // Also save as last model for this provider
        await setLastModelForProvider(selectedProvider, model);

        const config: ModelConfig = {
          provider: selectedProvider,
          model,
          apiKey: key || undefined,
        };

        setPhase("complete");

        // Use timeout ID to clean up on unmount
        const timeoutId = setTimeout(() => onComplete(config), 500);
        return () => clearTimeout(timeoutId);
      } catch (error) {
        console.error("Failed to complete selection:", error);
      }
    },
    [selectedProvider, onComplete],
  );

  const handleModelSelect = useCallback(
    async (item: { value: string }) => {
      try {
        setSelectedModel(item.value);

        // If Ollama, complete immediately (no API key needed)
        if (selectedProvider === "ollama") {
          await completeSelection(item.value, "");
        } else if (existingKey) {
          // Has existing key - complete with it
          await completeSelection(item.value, existingKey);
        } else {
          // No existing key - prompt for new one
          setPhase("apiKey");
        }
      } catch (error) {
        console.error("Failed to select model:", error);
      }
    },
    [selectedProvider, existingKey, completeSelection],
  );

  const handleApiKeySubmit = useCallback(async () => {
    if (!selectedProvider || !selectedModel) return;

    try {
      // Save API key
      if (selectedProvider !== "ollama" && apiKey) {
        await setApiKey(selectedProvider, apiKey);
      }

      await completeSelection(selectedModel, apiKey);
    } catch (error) {
      console.error("Failed to submit API key:", error);
    }
  }, [selectedProvider, selectedModel, apiKey, completeSelection]);

  // Calculate limit based on terminal height
  const listLimit = Math.max(5, terminalHeight - 12);

  if (phase === "provider") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Select AI Model Provider</Text>
        </Box>

        <SelectInput
          items={providerItems}
          onSelect={handleProviderSelect}
          limit={listLimit}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? "#ff6f54" : "#a6adc8"}>
              {isSelected ? symbols.pointer : " "}{" "}
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
    // For Ollama, use installed models; for others, use static list
    const models =
      selectedProvider === "ollama" && ollamaModels.length > 0
        ? ollamaModels
        : AVAILABLE_MODELS[selectedProvider];
    const modelItems = models.map((m) => ({ label: m, value: m }));

    // Find index of last selected model to pre-select it
    const initialIndex = selectedModel
      ? modelItems.findIndex((item) => item.value === selectedModel)
      : -1;

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Select Model</Text>
        </Box>

        {loadingOllama && (
          <Box marginBottom={1}>
            <Text color="#a6adc8">Loading installed Ollama models...</Text>
          </Box>
        )}

        {selectedProvider === "ollama" &&
          ollamaModels.length === 0 &&
          !loadingOllama && (
            <Box marginBottom={1} flexDirection="column">
              <Text color="#f38ba8">No Ollama models found.</Text>
              <Text color="#a6adc8">
                Install a model first: ollama pull deepseek-r1:latest
              </Text>
            </Box>
          )}

        {existingKey && (
          <Box marginBottom={1} flexDirection="column">
            <Text color="#a6e3a1">
              {symbols.tick} Using saved API key (last 4 chars: ...
              {existingKey.slice(-4)})
            </Text>
            <Text color="#a6adc8" dimColor>
              Last updated: {formatKeyAge(keyTimestamp)}
            </Text>
            <Text color="#a6adc8" dimColor>
              Press 'r' to replace API key
            </Text>
          </Box>
        )}

        {selectedModel && (
          <Box marginBottom={1}>
            <Text color="#a6adc8">Last used: {selectedModel}</Text>
          </Box>
        )}

        {modelItems.length > 0 && (
          <SelectInput
            items={modelItems}
            initialIndex={initialIndex >= 0 ? initialIndex : 0}
            onSelect={handleModelSelect}
            limit={listLimit}
            indicatorComponent={({ isSelected }) => (
              <Text color={isSelected ? "#ff6f54" : "#a6adc8"}>
                {isSelected ? symbols.pointer : " "}{" "}
              </Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? "#ff6f54" : "#f2e9e4"}>{label}</Text>
            )}
          />
        )}
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
