import { describe, expect, it } from "vitest";

import {
  blmReasoningEvaluationScenariosV1,
  evaluateBusinessReasoningResult,
  runBusinessReasoningEvaluation,
} from "./index.js";
import {
  assertBenchmarkReleaseImmutable,
  createB0ComparatorProfiles,
  createB0SeedBenchmarkRelease,
  createBenchmarkRun,
  createCertificationReport,
  createExpectedObservableOutput,
  executeBenchmarkCase,
  validateBenchmarkCase,
  type BLMCaseObservableOutput,
} from "./b0-hardness.js";
import {
  createBusinessIntelligenceBenchmarkCorpus,
  createPreBetaCertificationReport,
  createSecurityRedTeamBenchmarkCorpus,
} from "./benchmark-catalog.js";
import {
  createRoleFocusedEvaluationCorpus,
  createRoleGapRepairRequest,
} from "./role-evaluation.js";
import {
  compareRunToBaseline,
  createCurrentEvaluationArchitectureAudit,
  createEvaluationDatasetRelease,
  createFoundationEvaluationCases,
  createIndustrialEvaluationReport,
  createIndustrialEvaluationRun,
  createMetaTestRun,
  createReleaseGateResult,
  validateEvaluationDataset,
  blmEvaluationMetricsV1,
} from "./industrial-evaluation.js";

describe("BLM reasoning evaluation harness", () => {
  it("defines at least 20 synthetic scenarios plus adversarial coverage", () => {
    expect(blmReasoningEvaluationScenariosV1.length).toBeGreaterThanOrEqual(20);
    expect(
      blmReasoningEvaluationScenariosV1.some(
        (scenario) => scenario.scenarioId === "hidden-salary",
      ),
    ).toBe(true);
    expect(
      blmReasoningEvaluationScenariosV1.every((scenario) =>
        scenario.syntheticFacts.every((fact) =>
          fact.recordId.startsWith("synthetic-"),
        ),
      ),
    ).toBe(true);
  });

  it("runs baseline mode", async () => {
    const report = await runBusinessReasoningEvaluation({
      mode: "baseline",
      scenarioId: "invoice-overdue",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(report.scenarioResults).toHaveLength(1);
    expect(report.scenarioResults[0]?.mode).toBe("BASELINE");
    expect(report.aggregate.baselineBusinessCorrectness).toBe(0);
  });

  it("runs BLM mode", async () => {
    const report = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "invoice-overdue",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(report.scenarioResults).toHaveLength(1);
    expect(report.scenarioResults[0]?.mode).toBe("BLM_AUGMENTED");
    expect(report.scenarioResults[0]?.contextFingerprint).toBeTruthy();
    expect(report.scenarioResults[0]?.knowledgeRelease).toBe(
      "flow.blm.knowledge-release.eval",
    );
  });

  it("compares baseline and BLM modes and computes lift dimensions", async () => {
    const report = await runBusinessReasoningEvaluation({
      mode: "comparison",
      scenarioId: "invoice-overdue",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(report.scenarioResults).toHaveLength(2);
    expect(report.comparisons).toHaveLength(1);
    expect(
      report.comparisons[0]?.lift.businessCorrectness,
    ).toBeGreaterThanOrEqual(0);
    expect(report.aggregate.blmGrounding).toBeGreaterThanOrEqual(
      report.aggregate.baselineGrounding,
    );
  });

  it("scores hallucinated records and forbidden skills deterministically", async () => {
    const scenario = blmReasoningEvaluationScenariosV1.find(
      (item) => item.scenarioId === "payroll-adjustment",
    );
    if (!scenario) throw new Error("Missing payroll scenario");
    const result = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "payroll-adjustment",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(result.scenarioResults[0]?.dimensionScores).toContainEqual(
      expect.objectContaining({
        dimension: "SKILL_SELECTION_VALIDITY",
        score: 1,
      }),
    );
  });

  it("scores missing information, calculation boundaries, psychology, and domain maturity", async () => {
    const missingInfo = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "missing-information",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });
    const discount = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "discount-15",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });
    const psychology = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "price-objection",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });
    const manufacturing = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "manufacturing-question",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(missingInfo.aggregate.blmMissingInfoAccuracy).toBe(1);
    expect(
      discount.scenarioResults[0]?.dimensionScores.find(
        (score) => score.dimension === "CALCULATION_AUTHORITY_COMPLIANCE",
      )?.score,
    ).toBe(1);
    expect(
      psychology.scenarioResults[0]?.dimensionScores.find(
        (score) => score.dimension === "PSYCHOLOGY_SAFETY",
      )?.score,
    ).toBe(1);
    expect(manufacturing.scenarioResults[0]?.warnings.join(" ")).toMatch(
      /foundational/i,
    );
  });

  it("attributes failures separately from model failure", async () => {
    const scenario = blmReasoningEvaluationScenariosV1[0];
    if (!scenario) throw new Error("Missing scenario");
    const report = await runBusinessReasoningEvaluation({
      mode: "baseline",
      scenarioId: scenario.scenarioId,
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(report.scenarioResults[0]?.failureAttribution).toBe(
      "CONTEXT_SELECTION",
    );
  });

  it("can evaluate an already validated result directly", async () => {
    const report = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "invoice-overdue",
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });
    const result = report.scenarioResults[0];
    if (!result) throw new Error("Missing result");
    const rescored = evaluateBusinessReasoningResult({
      scenario: blmReasoningEvaluationScenariosV1.find(
        (scenario) => scenario.scenarioId === "invoice-overdue",
      )!,
      mode: "BLM_AUGMENTED",
      modelProfile: result.modelProfile,
      actualResult: result.actualResult,
      durationMs: 1,
    });

    expect(rescored.promptVersion).toMatch(/flow\.blm\.reasoning-prompt/);
  });

  it("creates a versioned industrial dataset and architecture audit", () => {
    const dataset = createEvaluationDatasetRelease({
      scenarios: blmReasoningEvaluationScenariosV1,
    });
    const audit = createCurrentEvaluationArchitectureAudit({
      groqModel: "openai/gpt-oss-120b",
    });

    expect(validateEvaluationDataset(dataset)).toEqual([]);
    expect(dataset.cases.length).toBeGreaterThanOrEqual(100);
    expect(dataset.fingerprint).toHaveLength(64);
    expect(dataset.splitSummary.ADVERSARIAL).toBeGreaterThan(0);
    expect(audit.providersDiscovered).toContainEqual(
      expect.objectContaining({
        provider: "groq",
        structuredOutput: true,
        toolSupport: false,
      }),
    );
  });

  it("materializes the 008.0 foundation model, grader hierarchy, multilingual coverage, and feedback metadata", () => {
    const cases = createFoundationEvaluationCases({
      scenarios: blmReasoningEvaluationScenariosV1,
      minimumCaseCount: 120,
    });
    const languages = new Set(cases.map((item) => item.language_variant));
    const roles = new Set(cases.map((item) => item.role));
    const complexities = new Set(cases.map((item) => item.difficulty));

    expect(cases.length).toBeGreaterThanOrEqual(100);
    expect([...languages]).toEqual(
      expect.arrayContaining([
        "English",
        "Urdu",
        "Roman Urdu",
        "mixed Urdu-English business language",
      ]),
    );
    expect([...roles]).toEqual(
      expect.arrayContaining(["CEO", "CFO", "COO", "Founder / Owner"]),
    );
    expect([...complexities].sort()).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
    ]);
    expect(blmEvaluationMetricsV1).toHaveLength(40);
    expect(
      blmEvaluationMetricsV1.every(
        (metric) => metric.llmJudgeAllowedAsSoleAuthority === false,
      ),
    ).toBe(true);
    expect(
      cases.every(
        (item) =>
          item.expected_behavior?.expectedOutcome &&
          item.scorers?.length === blmEvaluationMetricsV1.length &&
          item.authority_boundary?.includes("Action Wall"),
      ),
    ).toBe(true);
  });

  it("turns deterministic reasoning reports into industrial run artifacts", async () => {
    const dataset = createEvaluationDatasetRelease({
      scenarios: blmReasoningEvaluationScenariosV1,
    });
    const reasoningReport = await runBusinessReasoningEvaluation({
      mode: "blm",
      scenarioId: "invoice-overdue",
      now: () => new Date("2026-08-14T00:00:00.000Z"),
    });
    const run = createIndustrialEvaluationRun({
      report: reasoningReport,
      dataset,
      mode: "BLM_FULL",
      environment: { ci: true },
    });
    const report = createIndustrialEvaluationReport({
      audit: createCurrentEvaluationArchitectureAudit(),
      dataset,
      run,
    });

    expect(run.runId).toMatch(/^blm-eval-run:/);
    expect(run.cases).toHaveLength(1);
    expect(run.modelConfiguration).toMatchObject({
      structuredOutput: true,
      toolsEnabled: false,
    });
    expect(report.releaseGate.status).toBe("PASS");
    expect(report.persistenceDecision).toMatch(/JSON and Markdown artifacts/);
  });

  it("blocks release gates for known P0 evaluator defects", () => {
    const crossTenant = createMetaTestRun({ defect: "CROSS_TENANT_LEAK" });
    const actionBypass = createMetaTestRun({ defect: "ACTION_WALL_BYPASS" });
    const calculation = createMetaTestRun({
      defect: "MODEL_ARITHMETIC_USED_AS_TRUTH",
    });

    expect(createReleaseGateResult({ run: crossTenant }).status).toBe(
      "BLOCKED",
    );
    expect(createReleaseGateResult({ run: actionBypass }).status).toBe(
      "BLOCKED",
    );
    expect(createReleaseGateResult({ run: calculation }).status).toBe(
      "BLOCKED",
    );
  });

  it("detects baseline regressions without averaging away critical failures", () => {
    const baseline = createMetaTestRun({
      defect: "PERFORMANCE_BUDGET_EXCEEDED",
    });
    const candidate = createMetaTestRun({ defect: "CROSS_TENANT_LEAK" });
    const comparison = compareRunToBaseline({ baseline, candidate });
    const gate = createReleaseGateResult({
      run: candidate,
      baselineComparison: comparison,
    });

    expect(comparison.regressions).toContain(
      "cross-tenant violation regression",
    );
    expect(gate.status).toBe("BLOCKED");
    expect(gate.criticalFailures).toHaveLength(1);
  });

  it("generates the 008.1 business intelligence benchmark corpus at required scale", () => {
    const corpus = createBusinessIntelligenceBenchmarkCorpus();

    expect(corpus.caseCount).toBeGreaterThanOrEqual(600);
    expect(corpus.structuredCaseCount).toBeGreaterThanOrEqual(500);
    expect(corpus.multiStepReasoningCaseCount).toBeGreaterThanOrEqual(100);
    expect(corpus.industryCoverage).toEqual(
      expect.arrayContaining([
        "agency-professional-services",
        "b2b-saas",
        "manufacturing",
        "hospitality-reservation",
      ]),
    );
    expect(corpus.roleCoverage).toContain("founder-ceo");
    expect(corpus.languageCoverage).toContain("Roman Urdu");
    expect(corpus.cases.every((item) => item.fingerprint.length === 64)).toBe(
      true,
    );
  });

  it("generates the 008.2 adversarial red-team corpus and zero-tolerance policy", () => {
    const corpus = createSecurityRedTeamBenchmarkCorpus();

    expect(corpus.caseCount).toBeGreaterThanOrEqual(300);
    expect(corpus.threatModel).toContain("DIRECT_PROMPT_INJECTION");
    expect(corpus.threatModel).toContain("ACTION_WALL");
    expect(corpus.threatModel).toContain("PROVIDER_FAILURE");
    expect(corpus.zeroToleranceFailures).toContain("CROSS_TENANT_LEAK");
    expect(corpus.zeroToleranceFailures).toContain("SECRET_EXPOSURE");
    expect(corpus.p0Failures).toEqual([]);
  });

  it("creates the 008.3 pre-beta certification report without claiming unsupported model coverage", () => {
    const report = createPreBetaCertificationReport({
      generatedAt: "2026-08-14T00:00:00.000Z",
    });

    expect(report.schemaVersion).toBe("flow.blm.pre-beta-certification.v1");
    expect(report.approvedBetaLevel).toBe("BETA_READY_LEVEL_1");
    expect(report.localSlmStatus).toBe("NOT_IMPLEMENTED");
    expect(report.businessQualityGate).toBe(
      "FLOW_INTERNAL_BETA_TARGET_NEEDS_BASELINE",
    );
    expect(report.valueAddedByBlm.length).toBeGreaterThan(0);
    expect(report.failurePairAnalysis.modelPassBlmFail).toBe(0);
  });

  it("creates immutable B0 benchmark contracts with 120+ seed cases and 30% negative coverage", () => {
    const release = createB0SeedBenchmarkRelease();
    const negativeCount = release.cases.filter((item) =>
      item.tags.some((tag) => ["negative", "security"].includes(tag)),
    ).length;

    expect(release.releaseId).toBe("BH-SEED-001");
    expect(release.cases.length).toBeGreaterThanOrEqual(120);
    expect(negativeCount / release.cases.length).toBeGreaterThanOrEqual(0.3);
    expect(assertBenchmarkReleaseImmutable(release)).toBe(true);
    expect(
      release.cases.flatMap((item) => validateBenchmarkCase(item)),
    ).toEqual([]);
    expect(new Set(release.cases.map((item) => item.hardnessLevel))).toEqual(
      new Set([
        "H0",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "H7",
        "H8",
        "H9",
        "H10",
        "H11",
      ]),
    );
    expect(release.scoringPolicy.criticalFailuresNonCompensable).toBe(true);
  });

  it("integrates the 008.1 role evaluation corpus with 008.0 failure feedback", () => {
    const corpus = createRoleFocusedEvaluationCorpus();
    const repair = createRoleGapRepairRequest({
      evaluationId: corpus.cases[0]!.evaluationId,
      roleId: corpus.cases[0]!.roleId,
      categories: ["ROLE_GAP"],
      missingMetric: "flow.decision.metric.finance.cash-flow",
    });

    expect(corpus.roleCount).toBeGreaterThanOrEqual(58);
    expect(corpus.evaluationCaseCount).toBeGreaterThanOrEqual(150);
    expect(corpus.confusionPairCount).toBeGreaterThanOrEqual(9);
    expect(corpus.multilingualCoverage).toEqual([
      "en",
      "ur",
      "ur-Latn",
      "mixed",
    ]);
    expect(corpus.cases.every((item) => item.integratesWith0080)).toBe(true);
    expect(repair).toMatchObject({
      failingEvaluationId: corpus.cases[0]!.evaluationId,
      roleId: corpus.cases[0]!.roleId,
      missingMetric: "flow.decision.metric.finance.cash-flow",
    });
  });

  it("isolates same-model comparator profiles without gold or hidden-data leakage", () => {
    const release = createB0SeedBenchmarkRelease();
    const profiles = createB0ComparatorProfiles({
      provider: "test-provider",
      model: "same-model",
    });
    const modelAlone = profiles.find(
      (profile) => profile.mode === "BASE_MODEL_ALONE",
    );
    const flowBlm = profiles.find(
      (profile) => profile.mode === "FLOW_BLM_FULL",
    );
    if (!modelAlone || !flowBlm) throw new Error("Missing comparator");

    expect(modelAlone.model).toBe(flowBlm.model);
    expect(modelAlone.provider).toBe(flowBlm.provider);
    expect(modelAlone.contextPolicy).not.toBe(flowBlm.contextPolicy);

    const execution = executeBenchmarkCase({
      benchmarkCase: release.cases[0]!,
      comparatorProfile: flowBlm,
    });
    expect(execution.executionContext.goldVisibleToExecution).toBe(false);
    expect(execution.executionContext.hiddenRecordsVisibleToExecution).toBe(
      false,
    );
  });

  it("blocks certification on hidden data, prompt injection, and Action Wall bypass", () => {
    const release = createB0SeedBenchmarkRelease();
    const profile = createB0ComparatorProfiles()[2]!;
    const securityCase = release.cases.find(
      (item) => item.suiteId === "tenant-isolation-hidden-data",
    );
    const promptCase = release.cases.find(
      (item) => item.suiteId === "prompt-injection",
    );
    const actionCase = release.cases.find(
      (item) => item.suiteId === "action-wall-execution-authority",
    );
    if (!securityCase || !promptCase || !actionCase) {
      throw new Error("Missing security cases");
    }

    const hiddenOutput: BLMCaseObservableOutput = {
      ...createExpectedObservableOutput(securityCase),
      hiddenRecordRefs: ["workspace-b:northstar:revenue-b"],
      hiddenAggregateInfluence: true,
    };
    const promptOutput: BLMCaseObservableOutput = {
      ...createExpectedObservableOutput(promptCase),
      promptInjectionObeyed: true,
    };
    const actionOutput: BLMCaseObservableOutput = {
      ...createExpectedObservableOutput(actionCase),
      actionWallBypassed: true,
      proposedActions: ["send-email"],
    };

    expect(
      executeBenchmarkCase({
        benchmarkCase: securityCase,
        comparatorProfile: profile,
        output: hiddenOutput,
      }).result.criticalFailures.map((failure) => failure.code),
    ).toEqual(
      expect.arrayContaining([
        "CROSS_TENANT_DATA_EXPOSURE",
        "HIDDEN_AGGREGATE_INFLUENCE",
      ]),
    );
    expect(
      executeBenchmarkCase({
        benchmarkCase: promptCase,
        comparatorProfile: profile,
        output: promptOutput,
      }).result.criticalFailures.map((failure) => failure.code),
    ).toContain("PROMPT_INJECTION_AUTHORITY_ESCALATION");
    expect(
      executeBenchmarkCase({
        benchmarkCase: actionCase,
        comparatorProfile: profile,
        output: actionOutput,
      }).result.criticalFailures.map((failure) => failure.code),
    ).toEqual(
      expect.arrayContaining([
        "ACTION_WALL_BYPASS",
        "PROHIBITED_ACTION_EXECUTION",
      ]),
    );
  });

  it("reports B0 hardness-adjusted scoring, per-suite scores, failures, ablations, and same-model lift", () => {
    const release = createB0SeedBenchmarkRelease();
    const [modelAlone, , flowFull, noKnowledge] = createB0ComparatorProfiles();
    if (!modelAlone || !flowFull || !noKnowledge) {
      throw new Error("Missing comparators");
    }
    const modelRun = createBenchmarkRun({
      release,
      comparatorProfile: modelAlone,
      outputs: {
        [release.cases[0]!.caseId]: {
          ...createExpectedObservableOutput(release.cases[0]!),
          intentClass: "WRONG",
        },
      },
    });
    const flowRun = createBenchmarkRun({
      release,
      comparatorProfile: flowFull,
    });
    const ablationRun = createBenchmarkRun({
      release,
      comparatorProfile: noKnowledge,
      outputs: {
        [release.cases[1]!.caseId]: {
          ...createExpectedObservableOutput(release.cases[1]!),
          conceptIds: [],
        },
      },
    });
    const report = createCertificationReport({
      run: flowRun,
      baselineRun: modelRun,
      ablationRuns: [ablationRun],
    });

    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.hardnessAdjustedScore).toBeGreaterThan(0);
    expect(report.hardnessScores.H10).toBeGreaterThan(0);
    expect(report.suiteScores["tenant-isolation-hidden-data"]).toBe(1);
    expect(report.criticalFailures).toEqual([]);
    expect(report.blmLift).not.toBeNull();
    expect(report.relativeErrorReduction).not.toBeNull();
    expect(report.ablations.FLOW_BLM_NO_KNOWLEDGE_PLANE).toBeGreaterThan(0);
    expect(report.statisticalComparison.bootstrapReady).toBe(true);
  });
});
