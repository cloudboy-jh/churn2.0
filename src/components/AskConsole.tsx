import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { theme, symbols } from '../theme.js';
import { ModelConfig } from '../engine/models.js';
import { processAsk, saveAskSession, AskContext, AskResult } from '../commands/ask.js';

interface AskConsoleProps {
  question: string;
  modelConfig: ModelConfig;
  onComplete: () => void;
}

export function AskConsole({ question, modelConfig, onComplete }: AskConsoleProps) {
  const [status, setStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [streamedContent, setStreamedContent] = useState<string>('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [savedPath, setSavedPath] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    runAsk();
  }, []);

  async function runAsk() {
    try {
      const context: AskContext = {
        question,
        modelConfig,
      };

      const askResult = await processAsk(context, (chunk) => {
        setStreamedContent((prev) => prev + chunk);
      });

      setResult(askResult);

      // Save to disk
      const filepath = await saveAskSession(askResult);
      setSavedPath(filepath);

      setStatus('complete');

      // Auto-exit after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');

      setTimeout(() => {
        onComplete();
      }, 3000);
    }
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Question */}
      <Box marginBottom={1}>
        <Text color="#ff6f54" bold>
          Question:
        </Text>
        <Text color="#f2e9e4"> {question}</Text>
      </Box>

      {/* Model info */}
      <Box marginBottom={1}>
        <Text color="#a6adc8">
          Model: {modelConfig.provider}/{modelConfig.model}
        </Text>
      </Box>

      {/* Processing indicator */}
      {status === 'processing' && (
        <Box marginBottom={1}>
          <Text color="#ff6f54">
            <Spinner type="dots" />
          </Text>
          <Text color="#f2e9e4"> Thinking...</Text>
        </Box>
      )}

      {/* Streamed response */}
      {streamedContent && (
        <Box
          flexDirection="column"
          marginBottom={1}
          paddingX={2}
          paddingY={1}
          borderStyle="single"
          borderColor="#ff9b85"
        >
          <Box marginBottom={1}>
            <Text color="#ff6f54" bold>
              Answer:
            </Text>
          </Box>
          <Text color="#f2e9e4">{streamedContent}</Text>
        </Box>
      )}

      {/* Complete status */}
      {status === 'complete' && (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text color="#a6e3a1">
              {symbols.tick} Complete
            </Text>
          </Box>
          <Box>
            <Text color="#a6adc8">
              Saved to: {savedPath}
            </Text>
          </Box>
        </Box>
      )}

      {/* Error status */}
      {status === 'error' && (
        <Box marginTop={1}>
          <Text color="#f38ba8">
            {symbols.cross} Error: {error}
          </Text>
        </Box>
      )}
    </Box>
  );
}
