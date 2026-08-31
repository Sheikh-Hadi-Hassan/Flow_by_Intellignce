import {
  createOpenAIAdapterFromEnv,
  blmReasoningEvaluationScenariosV1,
  runBusinessReasoningEvaluation,
} from "./index.js";
import { mkdir, writeFile } from "node:fs/promises";

import {
  createB0ComparatorProfiles,
  createB0SeedBenchmarkRelease,
  createBenchmarkRun,
  createCertificationReport,
} from "./b0-hardness.js";
import {
  createBusinessIntelligenceBenchmarkCorpus,
  createPreBetaCertificationReport,
  createSecurityRedTeamBenchmarkCorpus,
  renderBlmSystemCardMarkdown,
  renderPreBetaCertificationMarkdown,
} from "./benchmark-catalog.js";
import {
  compareRunToBaseline,
  createCurrentEvaluationArchitectureAudit,
  createEvaluationDatasetRelease,
  createIndustrialEvaluationReport,
  createIndustrialEvaluationRun,
  createReleaseGateResult,
  readIndustrialEvaluationRun,
  validateEvaluationDataset,
  writeIndustrialEvaluationArtifacts,
  type BLMEvaluationMode,
} from "./industrial-evaluation.js";

const command = process.argv[2] ?? "run";

if (command === "list") {
  const dataset = createEvaluationDatasetRelease({
    scenarios: blmReasoningEvaluationScenariosV1,
  });
  console.log(
    JSON.stringify(
      {
        evaluationReleaseId: dataset.evaluationReleaseId,
        suiteId: dataset.suiteId,
        version: dataset.version,
        cases: dataset.cases.map((item) => ({
          caseId: item.caseId,
          split: item.split,
          domain: item.domain,
          riskLevel: item.riskLevel,
        })),
      },
      null,
      2,
    ),
  );
} else if (command === "validate") {
  const dataset = createEvaluationDatasetRelease({
    scenarios: blmReasoningEvaluationScenariosV1,
  });
  const errors = validateEvaluationDataset(dataset);
  console.log(
    JSON.stringify(
      {
        valid: errors.length === 0,
        evaluationReleaseId: dataset.evaluationReleaseId,
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length > 0) process.exitCode = 1;
} else if (command === "run" || command === "report") {
  await runIndustrialCommand();
} else if (command === "gate") {
  await gateCommand();
} else if (command === "compare") {
  await compareCommand();
} else if (command === "model") {
  await legacyModelCommand();
} else if (command === "business-benchmark") {
  businessBenchmarkCommand();
} else if (command === "redteam-benchmark") {
  redTeamBenchmarkCommand();
} else if (command === "certify") {
  await certifyCommand();
} else if (command === "b0") {
  await b0Command();
} else {
  throw new Error(
    "Command must be list, validate, run, compare, report, gate, model, business-benchmark, redteam-benchmark, certify, or b0.",
  );
}

async function runIndustrialCommand(): Promise<void> {
  const mode = industrialModeFromArg(argValue("--mode") ?? "BLM_FULL");
  const scenarioId = argValue("--scenario");
  const outputDir = argValue("--output") ?? "artifacts/blm-evals";
  const dataset = createEvaluationDatasetRelease({
    scenarios: blmReasoningEvaluationScenariosV1,
  });
  const validationErrors = validateEvaluationDataset(dataset);
  if (validationErrors.length > 0) {
    throw new Error(
      `Invalid evaluation dataset: ${validationErrors.join("; ")}`,
    );
  }
  const adapter = createOpenAIAdapterFromEnv();
  const report = await runBusinessReasoningEvaluation({
    mode:
      mode === "MODEL_ONLY"
        ? "baseline"
        : mode === "BLM_FULL"
          ? "blm"
          : "comparison",
    ...(scenarioId ? { scenarioId } : {}),
    ...(adapter ? { adapter } : {}),
  });
  const run = createIndustrialEvaluationRun({
    report,
    dataset,
    mode,
    inferenceSettings: {
      repeatedTrials: Number(argValue("--trials") ?? 1),
      rubricScoringIsolated: true,
      securityCriticalScoring: "deterministic",
    },
  });
  const auditInput = {
    ...(process.env.BLM_OPENAI_MODEL
      ? { openAiModel: process.env.BLM_OPENAI_MODEL }
      : {}),
    ...(process.env.BLM_GROQ_MODEL
      ? { groqModel: process.env.BLM_GROQ_MODEL }
      : {}),
  };
  const industrialReport = createIndustrialEvaluationReport({
    audit: createCurrentEvaluationArchitectureAudit(auditInput),
    dataset,
    run,
  });
  const artifacts = await writeIndustrialEvaluationArtifacts({
    outputDir,
    report: industrialReport,
  });
  console.log(
    JSON.stringify(
      {
        runId: run.runId,
        evaluationReleaseId: dataset.evaluationReleaseId,
        mode,
        caseCount: run.cases.length,
        provider: run.modelProvider,
        model: run.modelId,
        gateStatus: industrialReport.releaseGate.status,
        jsonPath: artifacts.jsonPath,
        markdownPath: artifacts.markdownPath,
      },
      null,
      2,
    ),
  );
}

async function compareCommand(): Promise<void> {
  const baselinePath = requiredArg("--baseline");
  const candidatePath = requiredArg("--candidate");
  const comparison = compareRunToBaseline({
    baseline: await readIndustrialEvaluationRun(baselinePath),
    candidate: await readIndustrialEvaluationRun(candidatePath),
  });
  console.log(JSON.stringify(comparison, null, 2));
  if (comparison.regressions.length > 0) process.exitCode = 1;
}

async function gateCommand(): Promise<void> {
  const runPath = argValue("--run");
  const run = runPath
    ? await readIndustrialEvaluationRun(runPath)
    : createIndustrialEvaluationRun({
        report: await runBusinessReasoningEvaluation({ mode: "blm" }),
        dataset: createEvaluationDatasetRelease({
          scenarios: blmReasoningEvaluationScenariosV1,
        }),
        mode: "BLM_FULL",
      });
  const releaseCandidate = argValue("--release-candidate");
  const gate = createReleaseGateResult({
    run,
    ...(releaseCandidate ? { releaseCandidate } : {}),
  });
  console.log(JSON.stringify(gate, null, 2));
  if (gate.status === "BLOCKED") process.exitCode = 1;
}

async function legacyModelCommand(): Promise<void> {
  const modeArg = argValue("--mode");
  const scenarioArg = argValue("--scenario");
  const mode = modeArg ?? "comparison";
  if (!["baseline", "blm", "comparison"].includes(mode)) {
    throw new Error("--mode must be baseline, blm, or comparison.");
  }
  const adapter = createOpenAIAdapterFromEnv();
  const report = await runBusinessReasoningEvaluation({
    mode: mode as "baseline" | "blm" | "comparison",
    ...(scenarioArg ? { scenarioId: scenarioArg } : {}),
    ...(adapter ? { adapter } : {}),
    outputDir: "artifacts/blm-evals",
  });
  console.log(
    JSON.stringify(
      {
        evaluationVersion: report.evaluationVersion,
        scenarioCount: report.scenarioResults.length,
        provider: report.modelConfiguration.provider,
        aggregate: report.aggregate,
        output: "artifacts/blm-evals",
      },
      null,
      2,
    ),
  );
}

function businessBenchmarkCommand(): void {
  const corpus = createBusinessIntelligenceBenchmarkCorpus({
    materializedCaseTarget: Number(argValue("--cases") ?? 600),
  });
  console.log(
    JSON.stringify(
      {
        releaseId: corpus.releaseId,
        caseCount: corpus.caseCount,
        structuredCaseCount: corpus.structuredCaseCount,
        multiStepReasoningCaseCount: corpus.multiStepReasoningCaseCount,
        industryCoverage: corpus.industryCoverage,
        roleCoverage: corpus.roleCoverage,
        languageCoverage: corpus.languageCoverage,
        weakestCategories: corpus.scorecard.weakestCategories,
        baselineFingerprint: corpus.baselineFingerprint,
      },
      null,
      2,
    ),
  );
}

function redTeamBenchmarkCommand(): void {
  const corpus = createSecurityRedTeamBenchmarkCorpus({
    materializedCaseTarget: Number(argValue("--cases") ?? 300),
  });
  console.log(
    JSON.stringify(
      {
        releaseId: corpus.releaseId,
        caseCount: corpus.caseCount,
        threatModel: corpus.threatModel,
        languageCoverage: corpus.languageCoverage,
        zeroToleranceFailures: corpus.zeroToleranceFailures,
        p0Failures: corpus.p0Failures,
        fingerprint: corpus.fingerprint,
      },
      null,
      2,
    ),
  );
}

async function certifyCommand(): Promise<void> {
  const outputDir =
    argValue("--output") ??
    `${process.env.INIT_CWD ?? process.cwd()}/docs/evaluation`;
  await mkdir(outputDir, { recursive: true });
  const report = createPreBetaCertificationReport();
  const jsonPath = `${outputDir}/BLM_PRE_BETA_CERTIFICATION_flow-blm-008.3.json`;
  const markdownPath = `${outputDir}/BLM_PRE_BETA_CERTIFICATION_flow-blm-008.3.md`;
  const systemCardPath = `${outputDir}/BLM_SYSTEM_CARD_flow-blm-008.3.md`;
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(markdownPath, renderPreBetaCertificationMarkdown(report));
  await writeFile(systemCardPath, renderBlmSystemCardMarkdown(report));
  console.log(
    JSON.stringify(
      {
        releaseCandidate: report.releaseCandidate,
        betaStatus: report.approvedBetaLevel,
        securityGate: report.securityGate,
        businessQualityGate: report.businessQualityGate,
        multilingualGate: report.multilingualGate,
        jsonPath,
        markdownPath,
        systemCardPath,
        fingerprint: report.fingerprint,
      },
      null,
      2,
    ),
  );
}

async function b0Command(): Promise<void> {
  const outputDir =
    argValue("--output") ??
    `${process.env.INIT_CWD ?? process.cwd()}/docs/evaluation`;
  await mkdir(outputDir, { recursive: true });
  const release = createB0SeedBenchmarkRelease();
  const profiles = createB0ComparatorProfiles({
    provider: process.env.BLM_GROQ_MODEL ? "groq" : "deterministic-fake",
    model: process.env.BLM_GROQ_MODEL ?? "deterministic-fake-model",
  });
  const flowProfile = profiles.find(
    (profile) => profile.mode === "FLOW_BLM_FULL",
  );
  const modelProfile = profiles.find(
    (profile) => profile.mode === "BASE_MODEL_ALONE",
  );
  if (!flowProfile || !modelProfile) {
    throw new Error("B0 comparator profiles missing required modes.");
  }
  const modelRun = createBenchmarkRun({
    release,
    comparatorProfile: modelProfile,
  });
  const flowRun = createBenchmarkRun({
    release,
    comparatorProfile: flowProfile,
  });
  const report = createCertificationReport({
    run: flowRun,
    baselineRun: modelRun,
  });
  const jsonPath = `${outputDir}/BLM_B0_HARDNESS_REPORT_BH-SEED-001.json`;
  const releasePath = `${outputDir}/BLM_B0_RELEASE_BH-SEED-001.json`;
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(releasePath, JSON.stringify(release, null, 2));
  console.log(
    JSON.stringify(
      {
        benchmarkRelease: release.releaseId,
        caseCount: release.cases.length,
        suites: release.suites.length,
        adversarialPercentage:
          release.cases.filter((item) =>
            item.tags.some((tag) => ["negative", "security"].includes(tag)),
          ).length / release.cases.length,
        comparator: report.comparator,
        overallScore: report.overallScore,
        hardnessAdjustedScore: report.hardnessAdjustedScore,
        criticalFailureCount: report.criticalFailures.length,
        blmLift: report.blmLift,
        jsonPath,
        releasePath,
        fingerprint: report.fingerprint,
      },
      null,
      2,
    ),
  );
}

function industrialModeFromArg(value: string): BLMEvaluationMode {
  const modes: readonly BLMEvaluationMode[] = [
    "BLM_FULL",
    "MODEL_ONLY",
    "DETERMINISTIC_ONLY",
    "BLM_NO_EXPERTISE_PACK",
    "BLM_NO_WORKSPACE_CONTEXT",
    "BLM_NO_KNOWLEDGE",
  ];
  if (modes.includes(value as BLMEvaluationMode)) {
    return value as BLMEvaluationMode;
  }
  throw new Error(`Unsupported BLM evaluation mode: ${value}`);
}

function argValue(name: string): string | undefined {
  return process.argv
    .find((arg) => arg.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function requiredArg(name: string): string {
  const value = argValue(name);
  if (!value) throw new Error(`Missing required ${name}=... argument.`);
  return value;
}
