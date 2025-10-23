import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import Spinner from "ink-spinner";
import path from "path";
import { theme, symbols } from "../theme.js";
import { FileSuggestion } from "../engine/analysis.js";
import { exportSuggestions, generatePatch } from "../engine/reports.js";

interface ExportPanelProps {
  suggestions: FileSuggestion[];
  onComplete: () => void;
}

export function ExportPanel({ suggestions, onComplete }: ExportPanelProps) {
  const [status, setStatus] = useState<"exporting" | "complete">("exporting");
  const [exportedFiles, setExportedFiles] = useState<string[]>([]);

  useEffect(() => {
    performExport();
  }, []);

  async function performExport() {
    const cwd = process.cwd();
    const patchesDir = path.join(cwd, ".churn", "patches");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const files: string[] = [];

    // Export as JSON
    const jsonPath = path.join(patchesDir, `suggestions-${timestamp}.json`);
    await exportSuggestions(suggestions, "json", jsonPath);
    files.push(jsonPath);

    // Export as Markdown
    const mdPath = path.join(patchesDir, `report-${timestamp}.md`);
    await exportSuggestions(suggestions, "markdown", mdPath);
    files.push(mdPath);

    // Generate patch file (if there are code changes)
    const hasCodeChanges = suggestions.some((s) => s.code);
    if (hasCodeChanges) {
      const patchPath = path.join(patchesDir, `changes-${timestamp}.patch`);
      await generatePatch(suggestions, patchPath, cwd);
      files.push(patchPath);
    }

    setExportedFiles(files);
    setStatus("complete");

    setTimeout(() => onComplete(), 2000);
  }

  if (status === "exporting") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="#8ab4f8">
            <Spinner type="dots" /> Exporting results...
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="#a6e3a1" bold>
          {symbols.tick} Export Complete
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Exported files:</Text>
        </Box>

        {exportedFiles.map((file, i) => (
          <Box key={i} paddingLeft={2}>
            <Text color="#ff6f54">{symbols.bullet} </Text>
            <Text color="#a6adc8">{path.relative(process.cwd(), file)}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="#a6adc8">All files saved to .churn/patches/</Text>
      </Box>
    </Box>
  );
}
