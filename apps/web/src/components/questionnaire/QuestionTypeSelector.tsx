"use client";

import type { QuestionKind } from "@flow/commercial";
import { QUESTION_KIND_LABELS } from "@flow/commercial";
import { FormField, Select, TextInput } from "../ui/FormField";

export function QuestionTypeSelector({
  value,
  onChange,
  id = "question-type",
}: {
  value: QuestionKind;
  onChange: (value: QuestionKind) => void;
  id?: string;
}) {
  const kinds = Object.keys(QUESTION_KIND_LABELS) as QuestionKind[];
  return (
    <FormField label="Question type" htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as QuestionKind)}
      >
        {kinds.map((kind) => (
          <option key={kind} value={kind}>
            {QUESTION_KIND_LABELS[kind]}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

export function ChoiceEditor({
  choices,
  onChange,
}: {
  choices: readonly { id: string; label: string }[];
  onChange: (choices: { id: string; label: string }[]) => void;
}) {
  return (
    <div className="flow-detail-group">
      <h4>Choices</h4>
      {choices.map((choice, index) => (
        <FormField
          key={choice.id}
          label={`Choice ${index + 1}`}
          htmlFor={`choice-${choice.id}`}
        >
          <TextInput
            id={`choice-${choice.id}`}
            value={choice.label}
            onChange={(event) => {
              const next = choices.map((row, rowIndex) =>
                rowIndex === index
                  ? { ...row, label: event.target.value }
                  : row,
              );
              onChange(next);
            }}
          />
        </FormField>
      ))}
      <button
        type="button"
        className="flow-btn flow-btn--secondary flow-btn--sm"
        onClick={() =>
          onChange([
            ...choices,
            {
              id: `choice_${choices.length + 1}`,
              label: `Option ${choices.length + 1}`,
            },
          ])
        }
      >
        Add choice
      </button>
    </div>
  );
}
