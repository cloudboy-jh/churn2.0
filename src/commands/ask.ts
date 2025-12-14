import fs from "fs-extra";
import path from "path";
import { ModelConfig, sendPrompt, Message } from "../engine/models.js";
import { getRepoInfo } from "../engine/git.js";

export interface AskContext {
  question: string;
  modelConfig: ModelConfig;
}

export interface AskResult {
  question: string;
  answer: string;
  model: string;
  timestamp: string;
}

// Process a single ask request
export async function processAsk(
  context: AskContext,
  onStream?: (chunk: string) => void,
): Promise<AskResult> {
  const { question, modelConfig } = context;

  try {
    // Get repository context - don't fail if repo info is unavailable
    let repoContext = "No repository information available";
    try {
      const repoInfo = await getRepoInfo();
      if (repoInfo) {
        repoContext = `Repository: ${repoInfo.name}\nBranch: ${repoInfo.branch}\nFiles: ${repoInfo.fileCount}`;
      }
    } catch (error) {
      // Log but don't fail - repo context is optional
      console.warn('Failed to get repository info:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Build messages
    const messages: Message[] = [
      {
        role: "system",
        content: `You are an AI assistant helping with code analysis and development questions.

Context:
${repoContext}

Provide concise, accurate answers. Focus on actionable insights.`,
      },
      {
        role: "user",
        content: question,
      },
    ];

    // Send prompt and get response
    const answer = await sendPrompt(modelConfig, messages, {
      onStream: onStream
        ? (chunk) => {
            if (!chunk.done && chunk.content) {
              onStream(chunk.content);
            }
          }
        : undefined,
    });

    return {
      question,
      answer,
      model: `${modelConfig.provider}/${modelConfig.model}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Failed to process ask request: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Save ask session to disk
export async function saveAskSession(
  result: AskResult,
  cwd: string = process.cwd(),
): Promise<string> {
  const reportsDir = path.join(cwd, ".churn", "reports");

  try {
    await fs.ensureDir(reportsDir);
  } catch (error) {
    throw new Error(
      `Failed to create reports directory at ${reportsDir}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `ask-session-${timestamp}.json`;
  const filepath = path.join(reportsDir, filename);

  const session = {
    mode: "ask" as const,
    ...result,
  };

  try {
    await fs.writeJSON(filepath, session, { spaces: 2 });
    return filepath;
  } catch (error) {
    throw new Error(
      `Failed to save ask session to ${filepath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
