import type { AnalysisResult, Diagnostic, Severity } from "../types.js";

interface SarifRule {
  id: string;
  name: string;
  shortDescription: {
    text: string;
  };
  fullDescription: {
    text: string;
  };
  defaultConfiguration: {
    level: SarifLevel;
  };
  help?: {
    text: string;
  };
}

type SarifLevel = "error" | "warning" | "note" | "none";

export function toSarifReport(result: AnalysisResult): string {
  const rules = rulesForDiagnostics(result.diagnostics);

  return `${JSON.stringify({
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "EnvDoctor",
            semanticVersion: "0.1.0",
            informationUri: "https://github.com/Markussiin/envdoctor",
            rules
          }
        },
        automationDetails: {
          id: "envdoctor"
        },
        results: result.diagnostics.map(toSarifResult)
      }
    ]
  }, null, 2)}\n`;
}

function rulesForDiagnostics(diagnostics: Diagnostic[]): SarifRule[] {
  const rules = new Map<string, SarifRule>();

  for (const diagnostic of diagnostics) {
    if (rules.has(diagnostic.id)) {
      continue;
    }

    rules.set(diagnostic.id, {
      id: diagnostic.id,
      name: diagnostic.id,
      shortDescription: {
        text: diagnostic.title
      },
      fullDescription: {
        text: diagnostic.message
      },
      defaultConfiguration: {
        level: severityToSarifLevel(diagnostic.severity)
      },
      ...(diagnostic.fix ? { help: { text: diagnostic.fix } } : {})
    });
  }

  return [...rules.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function toSarifResult(diagnostic: Diagnostic): Record<string, unknown> {
  const message = diagnostic.fix
    ? `${diagnostic.message} Fix: ${diagnostic.fix}`
    : diagnostic.message;

  return {
    ruleId: diagnostic.id,
    level: severityToSarifLevel(diagnostic.severity),
    message: {
      text: message
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: diagnostic.relativePath
          },
          region: {
            startLine: diagnostic.line,
            startColumn: diagnostic.column
          }
        }
      }
    ],
    partialFingerprints: {
      envdoctor: [
        diagnostic.id,
        diagnostic.key ?? "",
        diagnostic.relativePath,
        String(diagnostic.line),
        String(diagnostic.column)
      ].join(":")
    },
    properties: {
      severity: diagnostic.severity,
      framework: diagnostic.framework,
      key: diagnostic.key,
      title: diagnostic.title
    }
  };
}

function severityToSarifLevel(severity: Severity): SarifLevel {
  if (severity === "critical" || severity === "high") {
    return "error";
  }

  if (severity === "medium") {
    return "warning";
  }

  if (severity === "low") {
    return "note";
  }

  return "none";
}
