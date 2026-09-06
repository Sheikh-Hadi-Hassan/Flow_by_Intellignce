"use client";

import type {
  BuilderQuestion,
  QuestionnaireBuilderDocument,
} from "@flow/commercial";
import {
  choiceLabel,
  isAnswerField,
  isWhitespaceOnly,
} from "@flow/commercial";

import { FormField, Select, TextArea, TextInput } from "../ui/FormField";
import { SectionHeader } from "../ui/Display";

function isVisible(
  question: BuilderQuestion,
  answers: Record<string, unknown>,
): boolean {
  if (!question.visibleWhen) return true;
  return answers[question.visibleWhen.questionId] === question.visibleWhen.equals;
}

export function QuestionnaireAnswerForm({
  document,
  answers,
  onChange,
  errors = [],
  disabled = false,
  preview = false,
}: {
  document: QuestionnaireBuilderDocument;
  answers: Record<string, unknown>;
  onChange: (answers: Record<string, unknown>) => void;
  errors?: readonly string[];
  disabled?: boolean;
  preview?: boolean;
}) {
  const setValue = (id: string, value: unknown) => {
    onChange({ ...answers, [id]: value });
  };

  return (
    <form
      className="flow-questionnaire-answer"
      onSubmit={(event) => event.preventDefault()}
      noValidate
    >
      {document.questions.map((question) => {
        if (!isVisible(question, answers)) return null;
        if (question.kind === "section_heading") {
          return (
            <SectionHeader
              key={question.id}
              title={question.label}
              {...(question.helpText ? { description: question.helpText } : {})}
            />
          );
        }
        if (question.kind === "explanatory_text") {
          return (
            <p key={question.id} className="flow-field__help">
              {question.label}
              {question.helpText ? ` — ${question.helpText}` : ""}
            </p>
          );
        }
        if (!isAnswerField(question.kind)) return null;
        const fieldErrors = errors.filter((error) => error.includes(question.id));
        return (
          <FormField
            key={question.id}
            label={`${question.label}${question.required ? " *" : ""}`}
            htmlFor={`answer-${question.id}`}
            {...(question.helpText ? { help: question.helpText } : {})}
            {...(fieldErrors[0] ? { error: fieldErrors[0] } : {})}
          >
            {renderField(question, answers[question.id], setValue, disabled || preview)}
          </FormField>
        );
      })}
    </form>
  );
}

function renderField(
  question: BuilderQuestion,
  value: unknown,
  setValue: (id: string, value: unknown) => void,
  disabled: boolean,
) {
  const id = `answer-${question.id}`;
  switch (question.kind) {
    case "long_text":
      return (
        <TextArea
          id={id}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          placeholder={question.placeholder}
          onChange={(event) => setValue(question.id, event.target.value)}
        />
      );
    case "single_choice":
      return (
        <Select
          id={id}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => setValue(question.id, event.target.value)}
        >
          <option value="">Select…</option>
          {(question.choices ?? []).map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </Select>
      );
    case "multiple_choice":
      return (
        <fieldset id={id}>
          <legend className="sr-only">{question.label}</legend>
          {(question.choices ?? []).map((choice) => {
            const selected = Array.isArray(value) && value.includes(choice.id);
            return (
              <label key={choice.id} className="flow-field">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={disabled}
                  onChange={(event) => {
                    const current: string[] = Array.isArray(value)
                      ? value.filter((entry): entry is string => typeof entry === "string")
                      : [];
                    if (event.target.checked) current.push(choice.id);
                    else {
                      const index = current.indexOf(choice.id);
                      if (index >= 0) current.splice(index, 1);
                    }
                    setValue(question.id, current);
                  }}
                />{" "}
                {choice.label}
              </label>
            );
          })}
        </fieldset>
      );
    case "yes_no":
      return (
        <label className="flow-field">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(event) => setValue(question.id, event.target.checked)}
          />{" "}
          Yes
        </label>
      );
    case "number":
    case "scale":
      return (
        <TextInput
          id={id}
          inputMode="numeric"
          value={
            value == null
              ? ""
              : typeof value === "string" || typeof value === "number"
                ? String(value)
                : ""
          }
          disabled={disabled}
          onChange={(event) =>
            setValue(
              question.id,
              event.target.value === "" ? undefined : Number(event.target.value),
            )
          }
        />
      );
    case "currency":
      return (
        <TextInput
          id={id}
          inputMode="numeric"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          placeholder="Amount in minor units"
          onChange={(event) => setValue(question.id, event.target.value)}
        />
      );
    case "date":
      return (
        <TextInput
          id={id}
          type="date"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => setValue(question.id, event.target.value)}
        />
      );
    case "email":
      return (
        <TextInput
          id={id}
          type="email"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => setValue(question.id, event.target.value)}
        />
      );
    case "url":
      return (
        <TextInput
          id={id}
          type="url"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => setValue(question.id, event.target.value)}
        />
      );
    default:
      return (
        <TextInput
          id={id}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          placeholder={question.placeholder}
          onChange={(event) => {
            const next = event.target.value;
            if (isWhitespaceOnly(next)) {
              setValue(question.id, "");
              return;
            }
            setValue(question.id, next);
          }}
        />
      );
  }
}

export function countAnswered(
  document: QuestionnaireBuilderDocument,
  answers: Record<string, unknown>,
): number {
  return document.questions.filter((question) => {
    if (!isAnswerField(question.kind)) return false;
    const value = answers[question.id];
    if (value == null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;
}

export function totalAnswerable(document: QuestionnaireBuilderDocument): number {
  return document.questions.filter((q) => isAnswerField(q.kind)).length;
}

export { choiceLabel };
