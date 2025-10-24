#!/usr/bin/env node
import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import TextInput from "ink-text-input";
import { Command } from "commander";
import { Logo } from "./components/Logo.js";
import { ModelSelect } from "./components/ModelSelect.js";
import { RunConsole } from "./components/RunConsole.js";
import { ReviewPanel } from "./components/ReviewPanel.js";
import { ExportPanel } from "./components/ExportPanel.js";
import { AskConsole } from "./components/AskConsole.js";
import { CommandsList } from "./components/CommandsList.js";
import { ConfirmRun } from "./components/ConfirmRun.js";
import { getRepoInfo, detectProjectType, isGitRepo } from "./engine/git.js";
import {
  ensureProjectDir,
  isSetupComplete,
  getDefaultModel,
} from "./engine/config.js";
import { ModelConfig } from "./engine/models.js";
import {
  AnalysisContext,
  AnalysisResult,
  FileSuggestion,
} from "./engine/analysis.js";
import { theme, symbols } from "./theme.js";

type AppPhase =
  | "init"
  | "model"
  | "confirm"
  | "run"
  | "review"
  | "export"
  | "ask"
  | "ask-input"
  | "complete";

interface AppProps {
  command: "run" | "model" | "switch-model" | "ask";
  context?: AnalysisContext;
  askQuestion?: string;
}

function App({ command, context, askQuestion }: AppProps) {
  const [phase, setPhase] = useState<AppPhase>("init");
  const [repoSummary, setRepoSummary] = useState<string>("");
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<
    FileSuggestion[]
  >([]);
  const [question, setQuestion] = useState<string>(askQuestion || "");
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const [showCommandsList, setShowCommandsList] = useState<boolean>(false);
  const [fileCount, setFileCount] = useState<number>(0);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    // Check if in a git repository
    const inGitRepo = await isGitRepo();
    if (!inGitRepo) {
      console.error(
        "Error: Not in a git repository. Please run churn from inside a git repository.",
      );
      process.exit(1);
    }

    // Get repository info
    const repoInfo = await getRepoInfo();
    if (!repoInfo) {
      console.error("Error: Could not read repository information.");
      process.exit(1);
    }

    const projectType = await detectProjectType();
    const summary = `${projectType} project on ${repoInfo.branch} branch`;
    setRepoSummary(summary);
    setFileCount(repoInfo.fileCount);

    // Ensure .churn directory exists
    await ensureProjectDir();

    // Check setup status
    const complete = await isSetupComplete();
    setSetupComplete(complete);

    // Show commands list only on first run
    if (!complete) {
      setShowCommandsList(true);
    }

    // Route to appropriate phase based on command
    if (command === "model" || command === "switch-model") {
      setPhase("model");
    } else if (command === "ask") {
      // For ask command, check if we have model config
      if (complete) {
        const defaultModel = await getDefaultModel();
        setModelConfig({
          provider: defaultModel.provider,
          model: defaultModel.model,
        });

        if (askQuestion) {
          // Direct question provided as argument
          setPhase("ask");
        } else {
          // Need to prompt for question
          setPhase("ask-input");
        }
      } else {
        // Need to setup model first
        setPhase("model");
      }
    } else if (command === "run") {
      // For run, load model if available, otherwise setup
      if (complete) {
        const defaultModel = await getDefaultModel();
        setModelConfig({
          provider: defaultModel.provider,
          model: defaultModel.model,
        });
        setPhase("confirm");
      } else {
        setPhase("model");
      }
    }
  }

  function handleModelComplete(config: ModelConfig) {
    setModelConfig(config);
    if (command === "model" || command === "switch-model") {
      setPhase("complete");
    } else if (command === "run") {
      // First time setup - show success and exit cleanly
      setPhase("complete");
    } else if (command === "ask") {
      // After model setup, go to ask input or direct ask
      if (askQuestion) {
        setPhase("ask");
      } else {
        setPhase("ask-input");
      }
    }
  }

  function handleRunComplete(result: AnalysisResult) {
    setAnalysisResult(result);
    setPhase("review");
  }

  function handleReviewComplete(accepted: FileSuggestion[]) {
    setAcceptedSuggestions(accepted);
    setPhase("export");
  }

  function handleExportComplete() {
    setPhase("complete");
  }

  if (phase === "init") {
    return (
      <Box flexDirection="column">
        <Logo subtitle="AI-assisted code maintenance" />
        <Box>
          <Text color="#8ab4f8">Initializing...</Text>
        </Box>
      </Box>
    );
  }

  if (phase === "model") {
    return (
      <Box flexDirection="column">
        <Logo subtitle="AI-assisted code maintenance" message={repoSummary} />

        {/* Show commands list on first run */}
        {showCommandsList && <CommandsList />}

        <ModelSelect onComplete={handleModelComplete} />
      </Box>
    );
  }

  if (phase === "confirm" && modelConfig && context) {
    return (
      <Box flexDirection="column">
        <Logo subtitle="AI-assisted code maintenance" message={repoSummary} />
        <ConfirmRun
          modelConfig={modelConfig}
          context={context}
          repoSummary={repoSummary}
          fileCount={fileCount}
          onConfirm={() => setPhase("run")}
          onCancel={() => setPhase("complete")}
        />
      </Box>
    );
  }

  if (phase === "ask-input") {
    return (
      <Box flexDirection="column">
        <Logo subtitle="Ask a Question" message={repoSummary} />
        <Box flexDirection="column" paddingY={1}>
          <Box marginBottom={1}>
            <Text color="#f2e9e4">Enter your question:</Text>
          </Box>
          <Box>
            <Text color="#ff6f54">{symbols.pointer} </Text>
            <TextInput
              value={question}
              onChange={setQuestion}
              onSubmit={() => {
                if (question.trim()) {
                  setPhase("ask");
                }
              }}
              placeholder="e.g., How does authentication work?"
            />
          </Box>
        </Box>
      </Box>
    );
  }

  if (phase === "ask" && modelConfig && question) {
    return (
      <Box flexDirection="column">
        <Logo subtitle="Ask a Question" message={repoSummary} />
        <AskConsole
          question={question}
          modelConfig={modelConfig}
          onComplete={() => setPhase("complete")}
        />
      </Box>
    );
  }

  if (phase === "run" && modelConfig && context) {
    return (
      <Box flexDirection="column">
        <Logo subtitle="AI-assisted code maintenance" message={repoSummary} />
        <RunConsole
          modelConfig={modelConfig}
          context={context}
          onComplete={handleRunComplete}
        />
      </Box>
    );
  }

  if (phase === "review" && analysisResult) {
    return (
      <Box flexDirection="column">
        <Logo subtitle="Review Analysis Results" message={repoSummary} />
        <ReviewPanel
          result={analysisResult}
          onComplete={handleReviewComplete}
        />
      </Box>
    );
  }

  if (phase === "export") {
    return (
      <Box flexDirection="column">
        <Logo subtitle="Exporting Results" message={repoSummary} />
        <ExportPanel
          suggestions={acceptedSuggestions}
          onComplete={handleExportComplete}
        />
      </Box>
    );
  }

  if (phase === "complete") {
    // Exit cleanly after a short delay to show completion message
    useEffect(() => {
      const timer = setTimeout(() => {
        process.exit(0);
      }, 1500);
      return () => clearTimeout(timer);
    }, []);

    return (
      <Box flexDirection="column">
        <Logo subtitle="AI-assisted code maintenance" />
        <Box marginTop={1}>
          <Text color="#a6e3a1">{symbols.tick} Complete</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

// CLI Program
const program = new Command();

program
  .name("churn")
  .description(
    "AI-assisted developer tool for maintaining and refactoring codebases",
  )
  .version("2.0.0");

program
  .command("model")
  .description("Select AI model provider and model")
  .action(() => {
    render(<App command="model" />);
  });

program
  .command("switch-model")
  .description("Switch AI model provider or model")
  .action(() => {
    render(<App command="switch-model" />);
  });

program
  .command("ask [question]")
  .description("Ask a one-off question about your code")
  .action((question) => {
    render(<App command="ask" askQuestion={question} />);
  });

program
  .command("run")
  .description("Run code analysis")
  .option("-s, --staged", "Analyze only staged files")
  .option("-f, --files <files...>", "Analyze specific files")
  .action((options) => {
    const context: AnalysisContext = {
      mode: options.staged ? "staged" : options.files ? "files" : "full",
      files: options.files,
    };

    render(<App command="run" context={context} />);
  });

program
  .command("start")
  .description("Start interactive code analysis (alias for 'run')")
  .option("-s, --staged", "Analyze only staged files")
  .option("-f, --files <files...>", "Analyze specific files")
  .action((options) => {
    const context: AnalysisContext = {
      mode: options.staged ? "staged" : options.files ? "files" : "full",
      files: options.files,
    };

    render(<App command="run" context={context} />);
  });

program
  .command("review")
  .description("Review last analysis results")
  .action(async () => {
    const { loadLastReport } = await import("./engine/reports.js");
    const report = await loadLastReport();

    if (!report) {
      console.error('No previous analysis found. Run "churn run" first.');
      process.exit(1);
    }

    render(
      <Box flexDirection="column">
        <Logo subtitle="Review Previous Results" />
        <ReviewPanel
          result={report.analysis}
          onComplete={(accepted) => {
            console.log(`Accepted ${accepted.length} suggestions`);
            process.exit(0);
          }}
        />
      </Box>,
    );
  });

program
  .command("export")
  .description("Export last analysis results")
  .action(async () => {
    const { loadLastReport } = await import("./engine/reports.js");
    const report = await loadLastReport();

    if (!report) {
      console.error('No previous analysis found. Run "churn run" first.');
      process.exit(1);
    }

    render(
      <Box flexDirection="column">
        <Logo subtitle="Exporting Results" />
        <ExportPanel
          suggestions={report.analysis.suggestions}
          onComplete={() => process.exit(0)}
        />
      </Box>,
    );
  });

program
  .command("pass")
  .description("Pass report to another LLM")
  .requiredOption("--to <llm>", 'Target LLM (e.g., "claude", "gpt4")')
  .action(async (options) => {
    const { loadLastReport } = await import("./engine/reports.js");
    const report = await loadLastReport();

    if (!report) {
      console.error('No previous analysis found. Run "churn run" first.');
      process.exit(1);
    }

    console.log(`Passing report to ${options.to}...`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  });

// Default command
if (process.argv.length === 2) {
  program.parse(["node", "churn", "run"]);
} else {
  program.parse();
}
