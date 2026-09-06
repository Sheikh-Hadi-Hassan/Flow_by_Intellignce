import { describe, expect, it } from "vitest";

import {
  compileBuilderDocument,
  createEmptyBuilderDocument,
  duplicateQuestion,
  parseBuilderDocument,
  reorderQuestions,
  slugifyQuestionId,
  validateBuilderDocument,
  answersToDraftFactStatements,
  isWhitespaceOnly,
  unansweredQuestionnaireFields,
} from "./questionnaire-builder.js";
import { brandStrategyQuestionnaireV1, validateQuestionnaireResponse } from "./questionnaire.js";

describe("questionnaire-builder", () => {
  it("parses legacy enum fields into single-choice options", () => {
    const parsed = parseBuilderDocument(brandStrategyQuestionnaireV1);
    const maturity = parsed.questions.find((question) => question.id === "brandMaturity");
    expect(maturity?.kind).toBe("single_choice");
    expect(maturity?.choices?.map((choice) => choice.id)).toEqual([
      "emerging",
      "established",
      "refresh",
    ]);
    expect(validateBuilderDocument(parsed)).toEqual([]);
  });

  it("compiles short text and single choice to JSON Schema", () => {
    const doc = {
      version: 1,
      questions: [
        {
          id: "audience",
          kind: "short_text" as const,
          label: "Primary audience",
          required: true,
          minLength: 3,
        },
        {
          id: "maturity",
          kind: "single_choice" as const,
          label: "Brand maturity",
          required: true,
          choices: [
            { id: "emerging", label: "Emerging" },
            { id: "established", label: "Established" },
          ],
        },
      ],
    };
    const compiled = compileBuilderDocument(doc);
    expect(compiled.jsonSchema.required).toEqual(["audience", "maturity"]);
    expect(compiled.jsonSchema.properties).toMatchObject({
      audience: { type: "string", minLength: 3 },
      maturity: { type: "string", enum: ["emerging", "established"] },
    });
  });

  it("round-trips through question meta", () => {
    const doc = createEmptyBuilderDocument();
    const withQuestion = {
      ...doc,
      questions: [
        {
          id: "goal",
          kind: "long_text" as const,
          label: "Project goal",
          required: false,
        },
      ],
    };
    const compiled = compileBuilderDocument(withQuestion);
    const parsed = parseBuilderDocument(compiled);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0]?.label).toBe("Project goal");
  });

  it("reorders and duplicates questions", () => {
    const doc = {
      version: 1,
      questions: [
        { id: "a", kind: "short_text" as const, label: "A", required: false },
        { id: "b", kind: "short_text" as const, label: "B", required: false },
      ],
    };
    const reordered = reorderQuestions(doc, 0, 1);
    expect(reordered.questions.map((q) => q.id)).toEqual(["b", "a"]);
    const duplicated = duplicateQuestion(doc, "a");
    expect(duplicated.questions).toHaveLength(3);
  });

  it("slugifies unique ids", () => {
    const ids = new Set<string>();
    expect(slugifyQuestionId("Primary Audience", ids)).toBe("primary_audience");
    expect(slugifyQuestionId("Primary Audience", ids)).toBe("primary_audience_2");
  });

  it("validates builder document errors", () => {
    const errors = validateBuilderDocument({
      version: 1,
      questions: [
        {
          id: "choice_q",
          kind: "single_choice",
          label: "Pick one",
          required: true,
          choices: [],
        },
      ],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("validates compiled responses including email and whitespace", () => {
    const compiled = compileBuilderDocument({
      version: 1,
      questions: [
        {
          id: "email",
          kind: "email",
          label: "Contact email",
          required: true,
        },
      ],
    });
    const document = {
      version: 1,
      jsonSchema: compiled.jsonSchema,
      uiSchema: compiled.uiSchema,
      questionMeta: compiled.questionMeta as never,
    };
    expect(
      validateQuestionnaireResponse(document, { email: "not-an-email" }).valid,
    ).toBe(false);
    expect(isWhitespaceOnly("   ")).toBe(true);
    expect(
      validateQuestionnaireResponse(document, { email: "user@example.com" })
        .valid,
    ).toBe(true);
  });

  it("creates draft fact statements without auto-verifying", () => {
    const doc = {
      version: 1,
      questions: [
        {
          id: "metric",
          kind: "short_text" as const,
          label: "Success metric",
          required: true,
          businessCategory: "outcome",
        },
      ],
    };
    const facts = answersToDraftFactStatements(doc, { metric: "Increase leads" });
    expect(facts[0]?.statement).toContain("Success metric");
    expect(facts[0]?.category).toBe("outcome");
  });

  it("lists unanswered required questionnaire fields", () => {
    const doc = {
      version: 1,
      questions: [
        {
          id: "audience",
          kind: "short_text" as const,
          label: "Primary audience",
          required: true,
        },
        {
          id: "metric",
          kind: "short_text" as const,
          label: "Success metric",
          required: true,
        },
      ],
    };
    expect(unansweredQuestionnaireFields(doc, { audience: "Ops leaders" })).toEqual([
      { id: "metric", label: "Success metric" },
    ]);
  });
});
