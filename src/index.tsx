#!/usr/bin/env node
import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput } from "ink";
import { withFullScreen, useScreenSize, FullScreenBox } from "fullscreen-ink";
import TextInput from "ink-text-input";
import { Command } from "commander";
import path from "path";
import { Logo } from "./components/Logo.js";
import { ModelSelect } from "./components/ModelSelect.js";
import { RunConsole } from "./components/RunConsole.js";
import { ReviewPanel } from "./components/ReviewPanel.js";
import { ExportPanel, ExportMode } from "./components/ExportPanel.js";
import { AskConsole } from "./components/AskConsole.js";
import { CommandsList } from "./components/CommandsList.js";
import { ConfirmRun } from "./components/ConfirmRun.js";
import { StartMenu } from "./components/StartMenu.js";
import { HandoffSettings } from "./components/HandoffSettings.js";
import { AgentOnboarding } from "./components/AgentOnboarding.js";
import { AnalysisSummary } from "./components/AnalysisSummary.js";
import { ReviewBrowser } from "./components/ReviewBrowser.js";
import { getRepoInfo, detectProjectType, isGitRepo } from "./engine/git.js";
import {
  ensureProjectDir,
  isSetupComplete,
  getDefaultModel,
  getHandoffConfig,
  hasCompletedOnboarding,
  type AgentType,
} from "./engine/config.js";
import { ModelConfig } from "./engine/models.js";
import {
  AnalysisContext,
  AnalysisResult,
  FileSuggestion,
} from "./engine/analysis.js";
import { theme, symbols } from "./theme.js";

// Helper to render in fullscreen mode
function renderFullscreen(element: React.ReactElement) {
  const { instance, start } = withFullScreen(element);
  start();
  return instance;
}

type AppPhase =
  | "init"
  | "onboarding"
  | "start"
  | "model"
  | "confirm"
  | "run"
  | "summary"
  | "review"
  | "export"
  | "handoff-settings"
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
  const [currentModelDisplay, setCurrentModelDisplay] =
    useState<string>("No model selected");
  const [exportedFiles, setExportedFiles] = useState<string[]>([]);
  const [pendingHandoffAgent, setPendingHandoffAgent] =
    useState<AgentType | null>(null);
  const [previousPhase, setPreviousPhase] = useState<AppPhase | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>("handoff");
  const [configuredAgent, setConfiguredAgent] = useState<AgentType>("none");

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

  // Global keyboard shortcuts
  useInput((input, key) => {
    // z = exit application
    if (input === "z") {
      process.exit(0);
    }

    // o = restart (go to start menu)
    if (input === "o" && phase !== "start" && phase !== "complete") {
      setPhase("start");
    }

    // ESC = go back one step
    if (key.escape && phase !== "complete") {
      handleGoBack();
    }
  });

  function handleGoBack() {
    // For handoff-settings, use tracked previous phase
    if (phase === "handoff-settings" && previousPhase) {
      setPhase(previousPhase);
      setPreviousPhase(null);
      return;
    }

    // Define phase navigation - go back to previous phase
    const phaseFlow: Record<AppPhase, AppPhase | null> = {
      init: null,
      onboarding: "model",
      start: null,
      model: setupComplete ? "start" : null,
      confirm: "start",
      run: "confirm",
      summary: "run",
      review: "summary",
      export: "summary",
      "handoff-settings": "start", // Default fallback
      ask: "start",
      "ask-input": "start",
      complete: null,
    };

    const prevPhase = phaseFlow[phase];
    if (prevPhase) {
      setPhase(prevPhase);
    } else {
      // If no previous phase, exit
      process.exit(0);
    }
  }

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

    // Load handoff config for display
    const handoffConfig = await getHandoffConfig();
    setConfiguredAgent(handoffConfig.targetAgent);

    // Check onboarding status
    const onboardingDone = await hasCompletedOnboarding();

    // Load current model for display
    if (complete) {
      const defaultModel = await getDefaultModel();
      if (defaultModel) {
        setCurrentModelDisplay(
          `Current model: ${defaultModel.provider}/${defaultModel.model}`,
        );
      }
    }

    // Show commands list only on first run
    if (!complete) {
      setShowCommandsList(true);
    }

    // Route to appropriate phase based on command
    if (command === "start") {
      // Start command shows interactive menu
      // But first check if onboarding/model setup is needed
      if (!complete) {
        // Need model first
        setPhase("model");
      } else if (!onboardingDone) {
        // Model configured but need agent onboarding
        setPhase("onboarding");
      } else {
        setPhase("start");
      }
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

  async function handleModelComplete(config: ModelConfig) {
    setModelConfig(config);
    setCurrentModelDisplay(`Current model: ${config.provider}/${config.model}`);
    
    // Check if onboarding is needed
    const onboardingDone = await hasCompletedOnboarding();
    
    if (command === "model") {
      // Stay on model phase to show success, don't exit
      // User can manually exit with Ctrl+C
    } else if (command === "start") {
      // Check if we need to do agent onboarding first
      if (!onboardingDone) {
        setPhase("onboarding");
      } else {
        // Return to start menu after model selection
        setPhase("start");
      }
    } else if (command === "run") {
      // After model setup, check onboarding then continue
      if (!onboardingDone) {
        setPhase("onboarding");
      } else if (context) {
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
    setPhase("summary"); // Go to new summary screen instead of review
  }

  // Handler for onboarding completion
  function handleOnboardingComplete(agent: AgentType) {
    setConfiguredAgent(agent);
    
    // Continue to appropriate phase based on command
    if (command === "run" && context) {
      setPhase("confirm");
    } else {
      setPhase("start");
    }
  }

  // Handler for passing findings from AnalysisSummary
  function handlePassFindings(findings: FileSuggestion[], severity: "high" | "medium" | "all") {
    setAcceptedSuggestions(findings);
    setExportMode("handoff");
    setPhase("export");
  }

  // Handler for review request from AnalysisSummary
  function handleReviewRequest() {
    setPhase("review");
  }

  // Handler for export-only from AnalysisSummary
  function handleExportOnly(findings: FileSuggestion[]) {
    setAcceptedSuggestions(findings);
    setExportMode("export-only");
    setPhase("export");
  }

  // Handler for passing findings from ReviewBrowser
  function handlePassFromReview(findings: FileSuggestion[]) {
    setAcceptedSuggestions(findings);
    setExportMode("handoff");
    setPhase("export");
  }

  // Handler to go back to summary from export
  function handleBackToSummary() {
    setPhase("summary");
  }

  // Legacy handler (for old ReviewPanel - keeping for backwards compatibility)
  function handleReviewComplete(accepted: FileSuggestion[]) {
    setAcceptedSuggestions(accepted);
    setExportMode("handoff");
    setPhase("export");
  }

  function handleExportComplete() {
    setPhase("complete");
  }

  async function handleHandoff(agentType: AgentType, files: string[]) {
    // Import handoff engine
    const { createHandoffPackage, executeHandoff, isAgentAvailable } =
      await import("./engine/handoff.js");
    const { loadLastReport } = await import("./engine/reports.js");
    const { getHandoffConfig } = await import("./engine/config.js");

    // Load report and config
    const report = await loadLastReport();
    const handoffConfig = await getHandoffConfig();

    if (!report) {
      console.error("No report found for handoff");
      setPhase("complete");
      return;
    }

    // Check if agent is available
    const available = await isAgentAvailable(agentType);
    if (!available) {
      console.error(
        `\nWARNING: ${agentType} not found in PATH. Please install the ${agentType} CLI.`,
      );
      setPhase("complete");
      return;
    }

    // Create handoff package
    const handoffPackage = await createHandoffPackage(
      report,
      acceptedSuggestions,
      handoffConfig.contextFormat,
    );

    // Execute handoff - this will transfer control to the agent
    try {
      await executeHandoff(agentType, handoffPackage);
      // If agent exits, we continue to complete
      setPhase("complete");
    } catch (error) {
      console.error(`Failed to launch ${agentType}:`, error);
      setPhase("complete");
    }
  }

  function handleConfigureHandoff() {
    setPreviousPhase(phase);
    setPhase("handoff-settings");
  }

  function handleHandoffSettingsComplete() {
    // Return to where we came from (export or start)
    setPhase(previousPhase || "start");
    setPreviousPhase(null);
  }

  // Get subtitle based on phase
  const getSubtitle = () => {
    switch (phase) {
      case "start":
        return currentModelDisplay;
      case "onboarding":
        return "Initial Setup";
      case "ask":
      case "ask-input":
        return "Ask a Question";
      case "summary":
        return "Analysis Summary";
      case "review":
        return "Review Findings";
      case "export":
        return "Exporting Results";
      default:
        return "Context intelligence for code";
    }
  };

  return (
    <FullScreenBox
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      paddingX={2}
      paddingY={1}
    >
      <Box flexDirection="column" width="80%">
        {/* Single logo at App level */}
        <Logo subtitle={getSubtitle()} message={repoSummary} />

        {/* Phase-specific content */}
        {phase === "onboarding" && (
          <AgentOnboarding onComplete={handleOnboardingComplete} />
        )}

        {phase === "start" && (
          <StartMenu
            onRunScan={async () => {
              // Set default context for full scan if not already set
              if (!context) {
                setContext({ mode: "full" });
              }

              // Check if model is configured and load it
              const complete = await isSetupComplete();
              if (complete) {
                const defaultModel = await getDefaultModel();
                if (defaultModel) {
                  setModelConfig({
                    provider: defaultModel.provider,
                    model: defaultModel.model,
                  });
                  // Skip directly to run phase (ConfirmRun component shows confirmation)
                  setPhase("confirm");
                  return;
                }
              }

              // No model configured, go to model setup
              setPhase("model");
            }}
            onChooseModel={() => setPhase("model")}
            onSettings={() => {
              setPreviousPhase("start");
              setPhase("handoff-settings");
            }}
            onExit={() => setPhase("complete")}
            configuredAgent={configuredAgent}
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

        {phase === "summary" && analysisResult && (
          <AnalysisSummary
            result={analysisResult}
            onPassFindings={handlePassFindings}
            onReview={handleReviewRequest}
            onExportOnly={handleExportOnly}
            onBack={() => setPhase("start")}
          />
        )}

        {phase === "review" && analysisResult && (
          <ReviewBrowser
            result={analysisResult}
            onPassFindings={handlePassFromReview}
            onBack={() => setPhase("summary")}
          />
        )}

        {phase === "export" && (
          <ExportPanel
            suggestions={acceptedSuggestions}
            mode={exportMode}
            onComplete={handleExportComplete}
            onHandoff={handleHandoff}
            onConfigureHandoff={handleConfigureHandoff}
            onBackToSummary={handleBackToSummary}
            onReview={handleReviewRequest}
          />
        )}

        {phase === "handoff-settings" && (
          <HandoffSettings
            onComplete={handleHandoffSettingsComplete}
            onCancel={() => {
              // Cancel returns to where we came from
              setPhase(previousPhase || "start");
              setPreviousPhase(null);
            }}
          />
        )}

        {phase === "complete" && (
          <Box marginTop={1}>
            <Text color="#a6e3a1">{symbols.tick} Complete</Text>
          </Box>
        )}

        {/* Keyboard shortcuts footer (show on most phases, but not review/summary which have their own) */}
        {phase !== "complete" && phase !== "init" && phase !== "review" && phase !== "summary" && (
          <Box marginTop={1}>
            <Text color="#a6adc8" dimColor>
              {phase !== "start" && phase !== "onboarding" && "esc (back) · "}
              {phase !== "start" && phase !== "onboarding" && "o (start over) · "}z (exit)
            </Text>
          </Box>
        )}
      </Box>
    </FullScreenBox>
  );
}

// CLI Program
const program = new Command();

program
  .name("churn")
  .description("Context intelligence layer for AI agents and code workflows")
  .version("2.2.3");

program
  .command("model")
  .description("Select or switch AI model provider and model")
  .action(() => {
    renderFullscreen(<App command="model" />);
  });

program
  .command("ask [question]")
  .description("Ask a one-off question about your code")
  .action((question) => {
    renderFullscreen(<App command="ask" askQuestion={question} />);
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

    renderFullscreen(
      <App command="run" context={context} concurrency={options.concurrency} />,
    );
  });

program
  .command("start")
  .description(
    "Start interactive menu (choose: run scan, choose model, or exit)",
  )
  .action(() => {
    renderFullscreen(<App command="start" />);
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

    renderFullscreen(
      <Box flexDirection="column">
        <Logo subtitle="Review Previous Results" />
        <ReviewBrowser
          result={report.analysis}
          onPassFindings={(accepted) => {
            console.log(`Passing ${accepted.length} findings`);
            process.exit(0);
          }}
          onBack={() => process.exit(0)}
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

    renderFullscreen(
      <Box flexDirection="column">
        <Logo subtitle="Exporting Results" />
        <ExportPanel
          suggestions={report.analysis.suggestions}
          mode="export-only"
          onComplete={() => process.exit(0)}
        />
      </Box>,
    );
  });

program
  .command("pass")
  .description("Pass report to another AI coding agent")
  .requiredOption(
    "--to <agent>",
    'Target agent: "claude", "cursor", "gemini", "codex"',
  )
  .option(
    "--format <format>",
    'Context format: "minimal" (MD+JSON) or "comprehensive" (MD+JSON+patch+metadata)',
    "minimal",
  )
  .option("--launch", "Launch the agent immediately (default: output only)")
  .action(async (options) => {
    const { loadLastReport } = await import("./engine/reports.js");
    const { createHandoffPackage, executeHandoff, isAgentAvailable } =
      await import("./engine/handoff.js");

    const report = await loadLastReport();

    if (!report) {
      console.error('No previous analysis found. Run "churn run" first.');
      process.exit(1);
    }

    const agent = options.to as
      | "claude"
      | "cursor"
      | "gemini"
      | "codex"
      | "none";
    const format = options.format as "minimal" | "comprehensive";

    // Validate agent
    const validAgents = ["claude", "cursor", "gemini", "codex"];
    if (!validAgents.includes(agent)) {
      console.error(
        `Invalid agent: ${agent}. Must be one of: ${validAgents.join(", ")}`,
      );
      process.exit(1);
    }

    // Create handoff package
    console.log(`\nCreating handoff package for ${agent}...`);
    const handoffPackage = await createHandoffPackage(
      report,
      report.analysis.suggestions,
      format,
    );

    console.log(`Package created with ${handoffPackage.files.length} files`);
    console.log(`  Format: ${format}`);
    console.log(`  Files:`);
    handoffPackage.files.forEach((file) => {
      console.log(`    - ${path.relative(process.cwd(), file)}`);
    });

    // If --launch flag is set, execute handoff
    if (options.launch) {
      console.log(`\nLaunching ${agent}...`);

      // Check if agent is available
      const available = await isAgentAvailable(agent);
      if (!available) {
        console.error(
          `\nWARNING: ${agent} not found in PATH. Please install or configure the ${agent} CLI.`,
        );
        process.exit(1);
      }

      // Execute handoff
      try {
        await executeHandoff(agent, handoffPackage);
        // Agent takes over - if we reach here, agent has exited
        process.exit(0);
      } catch (error) {
        console.error(`\nERROR: Failed to launch ${agent}:`, error);
        process.exit(1);
      }
    } else {
      // Just output the package info
      console.log(`\nHandoff Package:`);
      console.log(JSON.stringify(handoffPackage, null, 2));
      console.log(
        `\nTip: Add --launch to automatically start ${agent} with these files`,
      );
      process.exit(0);
    }
  });

// Default command
if (process.argv.length === 2) {
  program.parse(["node", "churn", "start"]);
} else {
  program.parse();
}
