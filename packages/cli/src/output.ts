import pc from "picocolors";
import type { AnalysisResult, Diagnostic, EnvUsage, Severity } from "@envdoctor/core";
import { severityRank } from "@envdoctor/core";

const severityLabel: Record<Severity, (value: string) => string> = {
  critical: pc.red,
  high: pc.magenta,
  medium: pc.yellow,
  low: pc.cyan,
  info: pc.gray
};

export function renderDoctor(result: AnalysisResult): string {
  const lines: string[] = [];
  const issueWord = result.diagnostics.length === 1 ? "issue" : "issues";

  lines.push(`${pc.bold("EnvDoctor")} found ${result.diagnostics.length} ${issueWord}.`);
  lines.push("");

  if (result.diagnostics.length === 0) {
    lines.push(pc.green("No env diagnostics found."));
    return lines.join("\n");
  }

  for (const diagnostic of result.diagnostics) {
    lines.push(renderDiagnostic(diagnostic));
  }

  lines.push("");
  lines.push(renderSummary(result));
  return lines.join("\n");
}

export function renderScan(result: AnalysisResult): string {
  const byKey = new Map<string, EnvUsage[]>();

  for (const usage of result.usages) {
    const list = byKey.get(usage.key) ?? [];
    list.push(usage);
    byKey.set(usage.key, list);
  }

  const lines = [
    `${pc.bold("EnvDoctor scan")}`,
    `Found ${result.usages.length} env references across ${byKey.size} keys.`,
    ""
  ];

  for (const [key, usages] of [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(pc.bold(key));
    for (const usage of usages.slice(0, 5)) {
      lines.push(`  ${pc.gray(usage.source.padEnd(16))} ${usage.relativePath}:${usage.line}:${usage.column}`);
    }

    if (usages.length > 5) {
      lines.push(`  ${pc.gray(`...and ${usages.length - 5} more`)}`);
    }
  }

  if (result.dynamicUsages.length > 0) {
    lines.push("");
    lines.push(pc.yellow(`Dynamic env accesses: ${result.dynamicUsages.length}`));
    for (const usage of result.dynamicUsages.slice(0, 5)) {
      lines.push(`  ${usage.relativePath}:${usage.line}:${usage.column} ${pc.gray(usage.reason)}`);
    }
  }

  return lines.join("\n");
}

export function renderCi(result: AnalysisResult, threshold: Severity): string {
  const failing = result.diagnostics.filter((diagnostic) => severityRank[diagnostic.severity] >= severityRank[threshold]);
  const lines = [renderDoctor(result)];

  lines.push("");

  if (failing.length > 0) {
    lines.push(pc.red(`CI failed: ${failing.length} diagnostic(s) are ${threshold} or above.`));
  } else {
    lines.push(pc.green(`CI passed: no diagnostics at ${threshold} or above.`));
  }

  return lines.join("\n");
}

function renderDiagnostic(diagnostic: Diagnostic): string {
  const color = severityLabel[diagnostic.severity] ?? ((value: string) => value);
  const label = color(diagnostic.severity.toUpperCase().padEnd(8));
  const lines = [
    `${label} ${pc.bold(diagnostic.title)}`,
    `         ${diagnostic.relativePath}:${diagnostic.line}:${diagnostic.column}`,
    `         ${diagnostic.message}`
  ];

  if (diagnostic.fix) {
    lines.push(`         ${pc.green("Fix:")} ${diagnostic.fix}`);
  }

  lines.push("");
  return lines.join("\n");
}

function renderSummary(result: AnalysisResult): string {
  const frameworks = [...result.context.frameworks].sort().join(", ");
  return [
    `Scanned ${result.usages.length} static references and ${result.dynamicUsages.length} dynamic references.`,
    `Detected ${frameworks || "node"} with ${result.context.packageManager}.`
  ].join("\n");
}
