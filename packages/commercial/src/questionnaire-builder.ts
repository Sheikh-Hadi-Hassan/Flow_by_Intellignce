/**
 * Portable questionnaire builder model compiled to JSON Schema + uiSchema.
 * Customer-facing UI uses human labels; internal keys are slugified ids.
 */

export type QuestionKind =
  | "short_text"
  | "long_text"
  | "email"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "single_choice"
  | "multiple_choice"
  | "yes_no"
  | "scale"
  | "file_reference"
  | "section_heading"
  | "explanatory_text";

export interface BuilderChoice {
  readonly id: string;
  readonly label: string;
}

export interface BuilderVisibility {
  readonly questionId: string;
  readonly equals: string | boolean | number;
}

export interface BuilderQuestion {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly label: string;
  readonly helpText?: string;
  readonly placeholder?: string;
  readonly required: boolean;
  readonly choices?: readonly BuilderChoice[];
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minSelections?: number;
  readonly maxSelections?: number;
  readonly currencyCode?: string;
  readonly visibleWhen?: BuilderVisibility;
  readonly businessCategory?: string;
  readonly evidenceRequired?: boolean;
  readonly targetMapping?: string;
}

export interface QuestionnaireBuilderDocument {
  readonly version: number;
  readonly questions: readonly BuilderQuestion[];
}

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  url: "URL",
  number: "Number",
  currency: "Currency",
  date: "Date",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  yes_no: "Yes / No",
  scale: "Scale / rating",
  file_reference: "File reference",
  section_heading: "Section heading",
  explanatory_text: "Explanatory text",
};

const BUILDER_META_KEY = "_flowBuilder";

export function createEmptyBuilderDocument(): QuestionnaireBuilderDocument {
  return { version: 1, questions: [] };
}

export function slugifyQuestionId(label: string, existing: Set<string>): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "question";
  let candidate = base;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  existing.add(candidate);
  return candidate;
}

export function compileBuilderDocument(
  document: QuestionnaireBuilderDocument,
): {
  readonly jsonSchema: Record<string, unknown>;
  readonly uiSchema: Record<string, unknown>;
  readonly questionMeta: Record<string, unknown>;
} {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const uiSchema: Record<string, unknown> = {
    "ui:order": [] as string[],
  };
  const questionMeta: Record<string, unknown> = {
    [BUILDER_META_KEY]: document,
  };
  const conditionalRules: Record<string, unknown>[] = [];

  for (const question of document.questions) {
    if (question.kind === "section_heading" || question.kind === "explanatory_text") {
      continue;
    }

    const fieldSchema = schemaForQuestion(question);
    properties[question.id] = fieldSchema;
    (uiSchema["ui:order"] as string[]).push(question.id);

    if (question.required && !question.visibleWhen) {
      required.push(question.id);
    }

    const widget = widgetForKind(question.kind);
    if (widget) {
      uiSchema[question.id] = {
        "ui:widget": widget,
        ...(question.placeholder ? { "ui:placeholder": question.placeholder } : {}),
        ...(question.helpText ? { "ui:help": question.helpText } : {}),
      };
    } else if (question.helpText || question.placeholder) {
      uiSchema[question.id] = {
        ...(question.placeholder ? { "ui:placeholder": question.placeholder } : {}),
        ...(question.helpText ? { "ui:help": question.helpText } : {}),
      };
    }

    questionMeta[question.id] = {
      businessCategory: question.businessCategory ?? "general",
      evidenceRequired: question.evidenceRequired ?? false,
      targetMapping: question.targetMapping ?? `questionnaire.${question.id}`,
      labels: { en: question.label },
      kind: question.kind,
    };

    if (question.visibleWhen) {
      conditionalRules.push({
        if: {
          properties: {
            [question.visibleWhen.questionId]: { const: question.visibleWhen.equals },
          },
          required: [question.visibleWhen.questionId],
        },
        then: {
          required: question.required ? [question.id] : [],
        },
      });
    }
  }

  const jsonSchema: Record<string, unknown> = {
    $id: `flow://questionnaires/builder/v${document.version}`,
    type: "object",
    additionalProperties: false,
    required,
    properties,
    ...(conditionalRules.length > 0 ? { allOf: conditionalRules } : {}),
  };

  return { jsonSchema, uiSchema, questionMeta };
}

function schemaForQuestion(question: BuilderQuestion): Record<string, unknown> {
  const base = { title: question.label };
  switch (question.kind) {
    case "short_text":
      return {
        ...base,
        type: "string",
        ...(question.minLength != null ? { minLength: question.minLength } : {}),
        ...(question.maxLength != null ? { maxLength: question.maxLength } : {}),
      };
    case "long_text":
      return {
        ...base,
        type: "string",
        ...(question.minLength != null ? { minLength: question.minLength } : {}),
        ...(question.maxLength != null ? { maxLength: question.maxLength } : {}),
      };
    case "email":
      return { ...base, type: "string", format: "email" };
    case "url":
      return { ...base, type: "string", format: "uri" };
    case "number":
      return {
        ...base,
        type: "number",
        ...(question.min != null ? { minimum: question.min } : {}),
        ...(question.max != null ? { maximum: question.max } : {}),
      };
    case "currency":
      return {
        ...base,
        type: "string",
        pattern: "^-?[0-9]+$",
        description: `Amount in ${question.currencyCode ?? "USD"} minor units`,
      };
    case "date":
      return { ...base, type: "string", format: "date" };
    case "single_choice": {
      const values = (question.choices ?? []).map((c) => c.id);
      return { ...base, type: "string", enum: values };
    }
    case "multiple_choice": {
      const values = (question.choices ?? []).map((c) => c.id);
      return {
        ...base,
        type: "array",
        items: { type: "string", enum: values },
        uniqueItems: true,
        ...(question.minSelections != null ? { minItems: question.minSelections } : {}),
        ...(question.maxSelections != null ? { maxItems: question.maxSelections } : {}),
      };
    }
    case "yes_no":
      return { ...base, type: "boolean" };
    case "scale":
      return {
        ...base,
        type: "integer",
        minimum: question.min ?? 1,
        maximum: question.max ?? 5,
      };
    case "file_reference":
      return {
        ...base,
        type: "string",
        minLength: 1,
        description: "Reference to an uploaded document (URL or storage key)",
      };
    default:
      return { ...base, type: "string" };
  }
}

function widgetForKind(kind: QuestionKind): string | undefined {
  switch (kind) {
    case "long_text":
      return "textarea";
    case "yes_no":
      return "checkbox";
    default:
      return undefined;
  }
}

export function parseBuilderDocument(input: {
  readonly jsonSchema: Record<string, unknown>;
  readonly uiSchema: Record<string, unknown>;
  readonly questionMeta: Record<string, unknown>;
}): QuestionnaireBuilderDocument {
  const embedded = input.questionMeta[BUILDER_META_KEY];
  if (embedded && typeof embedded === "object" && "questions" in embedded) {
    return embedded as QuestionnaireBuilderDocument;
  }
  return legacySchemaToBuilder(input);
}

function legacySchemaToBuilder(input: {
  readonly jsonSchema: Record<string, unknown>;
  readonly questionMeta: Record<string, unknown>;
}): QuestionnaireBuilderDocument {
  const properties = input.jsonSchema.properties;
  if (!properties || typeof properties !== "object") {
    return createEmptyBuilderDocument();
  }
  const required = new Set(
    Array.isArray(input.jsonSchema.required)
      ? input.jsonSchema.required.filter((k): k is string => typeof k === "string")
      : [],
  );
  const questions: BuilderQuestion[] = [];
  for (const [id, schema] of Object.entries(properties)) {
    if (!schema || typeof schema !== "object") continue;
    const meta = input.questionMeta[id];
    const label =
      typeof (schema as { title?: string }).title === "string"
        ? (schema as { title: string }).title
        : typeof meta === "object" &&
            meta &&
            "labels" in meta &&
            typeof (meta as { labels?: { en?: string } }).labels?.en === "string"
          ? (meta as { labels: { en: string } }).labels.en
          : id;
    const schemaRecord = schema as Record<string, unknown>;
    const kind = inferKind(schemaRecord);
    const enumValues = Array.isArray(schemaRecord.enum)
      ? schemaRecord.enum.filter((value): value is string => typeof value === "string")
      : [];
    const metaKind =
      typeof meta === "object" && meta && "kind" in meta
        ? (meta as { kind: QuestionKind }).kind
        : undefined;
    const resolvedKind = metaKind ?? kind;
    questions.push({
      id,
      kind: resolvedKind,
      label,
      required: required.has(id),
      ...(enumValues.length > 0 &&
      (resolvedKind === "single_choice" || resolvedKind === "multiple_choice")
        ? {
            choices: enumValues.map((value) => ({
              id: value,
              label: value,
            })),
          }
        : {}),
    });
  }
  return { version: 1, questions };
}

function inferKind(schema: Record<string, unknown>): QuestionKind {
  if (schema.format === "email") return "email";
  if (schema.format === "uri") return "url";
  if (schema.format === "date") return "date";
  if (schema.type === "boolean") return "yes_no";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.type === "array") return "multiple_choice";
  if (Array.isArray(schema.enum)) return "single_choice";
  return "short_text";
}

export function validateBuilderDocument(
  document: QuestionnaireBuilderDocument,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const question of document.questions) {
    if (!question.id.trim()) errors.push("Every question needs an id.");
    if (ids.has(question.id)) errors.push(`Duplicate question id: ${question.id}`);
    ids.add(question.id);
    if (
      question.kind !== "section_heading" &&
      question.kind !== "explanatory_text" &&
      !question.label.trim()
    ) {
      errors.push(`Question ${question.id} needs a label.`);
    }
    if (
      (question.kind === "single_choice" || question.kind === "multiple_choice") &&
      (!question.choices || question.choices.length === 0)
    ) {
      errors.push(`${question.label || question.id} needs at least one choice.`);
    }
    if (question.visibleWhen && !ids.has(question.visibleWhen.questionId)) {
      errors.push(
        `${question.label} visibility references unknown question ${question.visibleWhen.questionId}.`,
      );
    }
  }
  return errors;
}

export function reorderQuestions(
  document: QuestionnaireBuilderDocument,
  fromIndex: number,
  toIndex: number,
): QuestionnaireBuilderDocument {
  const questions = [...document.questions];
  if (fromIndex < 0 || fromIndex >= questions.length) return document;
  if (toIndex < 0 || toIndex >= questions.length) return document;
  const [moved] = questions.splice(fromIndex, 1);
  if (!moved) return document;
  questions.splice(toIndex, 0, moved);
  return { ...document, questions };
}

export function duplicateQuestion(
  document: QuestionnaireBuilderDocument,
  questionId: string,
): QuestionnaireBuilderDocument {
  const index = document.questions.findIndex((q) => q.id === questionId);
  if (index < 0) return document;
  const source = document.questions[index];
  if (!source) return document;
  const ids = new Set(document.questions.map((q) => q.id));
  const copyId = slugifyQuestionId(`${source.label} copy`, ids);
  const copy: BuilderQuestion = {
    ...source,
    id: copyId,
    label: `${source.label} (copy)`,
    ...(source.choices
      ? { choices: source.choices.map((c) => ({ ...c, id: `${c.id}_copy` })) }
      : {}),
  };
  const questions = [...document.questions];
  questions.splice(index + 1, 0, copy);
  return { ...document, questions };
}

export function choiceLabel(
  question: BuilderQuestion,
  choiceId: string,
): string {
  return question.choices?.find((c) => c.id === choiceId)?.label ?? choiceId;
}

export function isAnswerField(kind: QuestionKind): boolean {
  return kind !== "section_heading" && kind !== "explanatory_text";
}

export function answersToDraftFactStatements(
  document: QuestionnaireBuilderDocument,
  answers: Record<string, unknown>,
): readonly { readonly category: string; readonly statement: string; readonly questionId: string }[] {
  const facts: { category: string; statement: string; questionId: string }[] = [];
  for (const question of document.questions) {
    if (!isAnswerField(question.kind)) continue;
    const value = answers[question.id];
    if (value == null || value === "") continue;
    const formatted = formatAnswerForFact(question, value);
    if (!formatted) continue;
    facts.push({
      questionId: question.id,
      category: question.businessCategory ?? "questionnaire",
      statement: `${question.label}: ${formatted}`,
    });
  }
  return facts;
}

function formatAnswerForFact(question: BuilderQuestion, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((id) => choiceLabel(question, String(id))).join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (question.kind === "currency" && typeof value === "string") {
    return value;
  }
  return String(value);
}

export function isWhitespaceOnly(value: unknown): boolean {
  return typeof value === "string" && value.trim().length === 0;
}

export function unansweredQuestionnaireFields(
  document: QuestionnaireBuilderDocument,
  answers: Record<string, unknown>,
): readonly { readonly id: string; readonly label: string }[] {
  const missing: { id: string; label: string }[] = [];
  for (const question of document.questions) {
    if (!isAnswerField(question.kind) || !question.required) continue;
    if (question.visibleWhen) {
      const trigger = answers[question.visibleWhen.questionId];
      if (trigger !== question.visibleWhen.equals) continue;
    }
    const value = answers[question.id];
    if (
      value == null ||
      value === "" ||
      isWhitespaceOnly(value) ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push({ id: question.id, label: question.label });
    }
  }
  return missing;
}
