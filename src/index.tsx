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
import { StartMenu } from "./components/StartMenu.js";
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
  | "start"
  | "model"
  | "confirm"
  | "run"
  | "review"
  | "export"
  | "ask"
  | "ask-input"
  | "complete";

interface AppProps {
  command: "start" | "run" | "model" | "ask";
  context?: AnalysisContext;
  askQuestion?: string;
  concurrency?: number;
}

function App({
  command,
  context: initialContext,
  askQuestion,
  concurrency,
}: AppProps) {
  const [phase, setPhase] = useState<AppPhase>("model");
  const [repoSummary, setRepoSummary] = useState<string>("");
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [context, setContext] = useState<AnalysisContext | undefined>(
    initialContext,
  );
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
  const [concurrencyLimit, setConcurrencyLimit] = useState<number | undefined>(
    concurrency,
  );

  useEffect(() => {
    initialize();
  }, []);

  // Handle auto-exit for complete phase
  useEffect(() => {
    if (phase === "complete") {
      const timer = setTimeout(() => {
        process.exit(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

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
    if (command === "start") {
      // Start command shows interactive menu
      setPhase("start");
    } else if (command === "model") {
      setPhase("model");
    } else if (command === "ask") {
      // For ask command, check if we have model config
      if (complete) {
        const defaultModel = await getDefaultModel();
        if (defaultModel) {
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
          // Model config missing, go to setup
          setPhase("model");
        }
      } else {
        // Need to setup model first
        setPhase("model");
      }
    } else if (command === "run") {
      // For run, load model if available, otherwise setup
      if (complete) {
        const defaultModel = await getDefaultModel();
        if (defaultModel) {
          setModelConfig({
            provider: defaultModel.provider,
            model: defaultModel.model,
          });
          setPhase("confirm");
        } else {
          // Model config missing, go to setup
          setPhase("model");
        }
      } else {
        setPhase("model");
      }
    }
  }

  function handleModelComplete(config: ModelConfig) {
    setModelConfig(config);
    if (command === "model") {
      // Stay on model phase to show success, don't exit
      // User can manually exit with Ctrl+C
    } else if (command === "run") {
      // After model setup, continue to confirm phase if context is available
      if (context) {
        setPhase("confirm");
      } else {
        // Stay on model phase, don't exit prematurely
      }
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

  // Get subtitle based on phase
  const getSubtitle = () => {
    switch (phase) {
      case "start":
        return "Interactive Menu";
      case "ask":
      case "ask-input":
        return "Ask a Question";
      case "review":
        return "Review Analysis Results";
      case "export":
        return "Exporting Results";
      default:
        return "AI-assisted code maintenance";
    }
  };

  return (
    <Box flexDirection="column">
      {/* Single logo at App level */}
      <Logo subtitle={getSubtitle()} message={repoSummary} />

      {/* Phase-specific content */}
      {phase === "start" && (
        <StartMenu
          onRunScan={async () => {
            // Set default context for full scan if not already set
            if (!context) {
              setContext({ mode: "full" });
            }

            // Check if model is configured
            const complete = await isSetupComplete();
            if (complete && !modelConfig) {
              const defaultModel = await getDefaultModel();
              if (defaultModel) {
                setModelConfig({
                  provider: defaultModel.provider,
                  model: defaultModel.model,
                });
              }
            }

            // Go to model setup if not configured, otherwise confirm
            if (!modelConfig) {
              setPhase("model");
            } else {
              setPhase("confirm");
            }
          }}
          onChooseModel={() => setPhase("model")}
          onExit={() => setPhase("complete")}
        />
      )}

      {phase === "model" && (
        <>
          {/* Show commands list on first run */}
          {showCommandsList && <CommandsList />}
          <ModelSelect onComplete={handleModelComplete} />
        </>
      )}

      {phase === "confirm" && modelConfig && context && (
        <ConfirmRun
          modelConfig={modelConfig}
          context={context}
          repoSummary={repoSummary}
          fileCount={fileCount}
          onConfirm={() => setPhase("run")}
          onCancel={() => setPhase("complete")}
        />
      )}

      {phase === "ask-input" && (
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
      )}

      {phase === "ask" && modelConfig && question && (
        <AskConsole
          question={question}
          modelConfig={modelConfig}
          onComplete={() => setPhase("complete")}
        />
      )}

      {phase === "run" && modelConfig && context && (
        <RunConsole
          modelConfig={modelConfig}
          context={context}
          onComplete={handleRunComplete}
          concurrency={concurrencyLimit}
        />
      )}

      {phase === "review" && analysisResult && (
        <ReviewPanel
          result={analysisResult}
          onComplete={handleReviewComplete}
        />
      )}

      {phase === "export" && (
        <ExportPanel
          suggestions={acceptedSuggestions}
          onComplete={handleExportComplete}
        />
      )}

      {phase === "complete" && (
        <Box marginTop={1}>
          <Text color="#a6e3a1">{symbols.tick} Complete</Text>
        </Box>
      )}
    </Box>
  );
}

// CLI Program
const program = new Command();

program
  .name("churn")
  .description(
    "AI-assisted developer tool for maintaining and refactoring codebases",
  )
  .version("2.0.8");

program
  .command("model")
  .description("Select or switch AI model provider and model")
  .action(() => {
    render(<App command="model" />);
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
  .option(
    "-c, --concurrency <number>",
    "Number of files to analyze in parallel (1-50)",
    parseInt,
  )
  .action((options) => {
    const context: AnalysisContext = {
      mode: options.staged ? "staged" : options.files ? "files" : "full",
      files: options.files,
    };

    // Validate concurrency if provided
    if (options.concurrency !== undefined) {
      const concurrency = options.concurrency;
      if (isNaN(concurrency) || concurrency < 1 || concurrency > 50) {
        console.error("Error: Concurrency must be a number between 1 and 50");
        process.exit(1);
      }
    }

    render(
      <App command="run" context={context} concurrency={options.concurrency} />,
    );
  });

program
  .command("start")
  .description(
    "Start interactive menu (choose: run scan, choose model, or exit)",
  )
  .action(() => {
    render(<App command="start" />);
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
