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

  // Get repository context
  const repoInfo = await getRepoInfo();
  const repoContext = repoInfo
    ? `Repository: ${repoInfo.name}\nBranch: ${repoInfo.branch}\nFiles: ${repoInfo.fileCount}`
    : "No repository information available";

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
}

// Save ask session to disk
export async function saveAskSession(
  result: AskResult,
  cwd: string = process.cwd(),
): Promise<string> {
  const reportsDir = path.join(cwd, ".churn", "reports");
  await fs.ensureDir(reportsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `ask-session-${timestamp}.json`;
  const filepath = path.join(reportsDir, filename);

  const session = {
    mode: "ask",
    ...result,
  };

  await fs.writeJSON(filepath, session, { spaces: 2 });
  return filepath;
}
