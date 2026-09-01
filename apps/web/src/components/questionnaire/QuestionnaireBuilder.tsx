"use client";

import type { BuilderQuestion, QuestionKind } from "@flow/commercial";
import type { QuestionnaireBuilderDocument } from "@flow/commercial";
import {
  compileBuilderDocument,
  duplicateQuestion,
  parseBuilderDocument,
  reorderQuestions,
  slugifyQuestionId,
  validateBuilderDocument,
} from "@flow/commercial";
import { useMemo, useState } from "react";

import { Button } from "../ui/Button";
import { FormField, TextArea, TextInput } from "../ui/FormField";
import { InlineAlert, SectionHeader } from "../ui/Display";
import {
  AutosaveStatus,
  EmptyQuestionnaireState,
  ValidationMessage,
  VersionStatusBadge,
  type AutosaveState,
} from "./QuestionnaireChrome";
import { ChoiceEditor, QuestionTypeSelector } from "./QuestionTypeSelector";
import { QuestionnaireAnswerForm } from "./QuestionnaireAnswerForm";

function defaultQuestion(kind: QuestionKind, ids: Set<string>): BuilderQuestion {
  const label =
    kind === "section_heading"
      ? "New section"
      : kind === "explanatory_text"
        ? "Guidance for respondents"
        : "New question";
  const base: BuilderQuestion = {
    id: slugifyQuestionId(label, ids),
    kind,
    label,
    required: kind !== "section_heading" && kind !== "explanatory_text",
    ...(kind === "scale" ? { min: 1, max: 5 } : {}),
  };
  if (kind === "single_choice" || kind === "multiple_choice") {
    return {
      ...base,
      choices: [
        { id: "option_1", label: "Option 1" },
        { id: "option_2", label: "Option 2" },
      ],
    };
  }
  return base;
}

export function QuestionnaireBuilder({
  initialVersion,
  onSaveDraft,
  onPublish,
  onDuplicatePublished,
  publishedVersionNumber,
}: {
  initialVersion: {
    readonly id: string;
    readonly versionNumber: number;
    readonly status: string;
    readonly jsonSchema: Record<string, unknown>;
    readonly uiSchema: Record<string, unknown>;
    readonly questionMeta: Record<string, unknown>;
  };
  onSaveDraft: (builder: QuestionnaireBuilderDocument) => Promise<void>;
  onPublish: () => Promise<void>;
  onDuplicatePublished?: () => Promise<void>;
  publishedVersionNumber?: number | undefined;
}) {
  const [document, setDocument] = useState<QuestionnaireBuilderDocument>(() =>
    parseBuilderDocument(initialVersion),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const readOnly = initialVersion.status !== "draft";

  const selected = document.questions.find((q) => q.id === selectedId) ?? null;
  const validationErrors = useMemo(
    () => validateBuilderDocument(document),
    [document],
  );
  const compiled = useMemo(() => compileBuilderDocument(document), [document]);

  const persist = async (next: QuestionnaireBuilderDocument) => {
    setAutosave("saving");
    try {
      await onSaveDraft(next);
      setAutosave("saved");
    } catch (error) {
      setAutosave("error");
      setMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  const updateDocument = (next: QuestionnaireBuilderDocument, save = true) => {
    setDocument(next);
    if (!readOnly && save) void persist(next);
  };

  return (
    <div className="flow-questionnaire-builder">
      <SectionHeader
        eyebrow="Questionnaire"
        title={`Version ${initialVersion.versionNumber}`}
        description="Build, preview, and publish an immutable questionnaire version."
      />
      <div className="flow-toolbar">
        <VersionStatusBadge status={initialVersion.status} />
        <AutosaveStatus state={autosave} />
      </div>
      {readOnly && onDuplicatePublished && (
        <InlineAlert variant="warning">
          Published versions are immutable. Duplicate to a new draft to make changes.
          <Button size="sm" onClick={() => void onDuplicatePublished()}>
            Duplicate to new draft
          </Button>
        </InlineAlert>
      )}
      {publishedVersionNumber && (
        <p>Live published version: v{publishedVersionNumber}</p>
      )}
      <ValidationMessage messages={validationErrors} />
      {message && (
        <InlineAlert variant="warning">{message}</InlineAlert>
      )}
      {!readOnly && (
        <div className="flow-toolbar" role="toolbar" aria-label="Builder actions">
          <Button
            onClick={() => {
              const ids = new Set(document.questions.map((q) => q.id));
              const question = defaultQuestion("short_text", ids);
              updateDocument({
                ...document,
                questions: [...document.questions, question],
              });
              setSelectedId(question.id);
            }}
          >
            Add question
          </Button>
          <Button variant="secondary" onClick={() => setPreview((v) => !v)}>
            {preview ? "Exit preview" : "Preview"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void persist(document)}
            disabled={validationErrors.length > 0}
          >
            Save draft
          </Button>
          <Button
            onClick={() => setConfirmPublish(true)}
            disabled={validationErrors.length > 0 || document.questions.length === 0}
          >
            Publish
          </Button>
        </div>
      )}
      {confirmPublish && (
        <div className="flow-panel" role="dialog" aria-labelledby="publish-title">
          <h2 id="publish-title">Publish questionnaire?</h2>
          <p>
            Publishing creates an immutable version. Opportunities will bind to this
            schema until you publish a newer version.
          </p>
          <div className="flow-toolbar">
            <Button
              type="button"
              onClick={() => {
                void (async () => {
                setPublishing(true);
                try {
                  await onPublish();
                  setConfirmPublish(false);
                  setMessage("Published successfully.");
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Publish failed",
                  );
                } finally {
                  setPublishing(false);
                }
              })();
              }}
              disabled={publishing}
            >
              {publishing ? "Publishing…" : "Confirm publish"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmPublish(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {preview ? (
        <section className="flow-panel">
          <h2>Preview</h2>
          <QuestionnaireAnswerForm
            document={document}
            answers={{}}
            onChange={() => undefined}
            preview
          />
        </section>
      ) : (
        <div className="flow-questionnaire-builder__layout">
          <section className="flow-panel" aria-label="Questions">
            {document.questions.length === 0 ? (
              <EmptyQuestionnaireState>
                <p>No questions yet</p>
                <p>Add your first question to begin building this questionnaire.</p>
              </EmptyQuestionnaireState>
            ) : (
              <ol className="flow-questionnaire-list">
                {document.questions.map((question, index) => (
                  <li key={question.id}>
                    <button
                      type="button"
                      className={`flow-questionnaire-row${
                        selectedId === question.id ? " is-selected" : ""
                      }`}
                      onClick={() => setSelectedId(question.id)}
                    >
                      <span className="flow-questionnaire-row__index">
                        {index + 1}
                      </span>
                      <span className="flow-questionnaire-row__label">
                        {question.label}
                      </span>
                      {question.required && (
                        <span className="flow-badge flow-badge--essential">
                          Required
                        </span>
                      )}
                    </button>
                    {!readOnly && (
                      <div className="flow-toolbar">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Move ${question.label} up`}
                          disabled={index === 0}
                          onClick={() =>
                            updateDocument(reorderQuestions(document, index, index - 1))
                          }
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Move ${question.label} down`}
                          disabled={index === document.questions.length - 1}
                          onClick={() =>
                            updateDocument(reorderQuestions(document, index, index + 1))
                          }
                        >
                          Down
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateDocument(duplicateQuestion(document, question.id))
                          }
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Delete "${question.label}"? This cannot be undone.`,
                              )
                            ) {
                              return;
                            }
                            updateDocument({
                              ...document,
                              questions: document.questions.filter(
                                (q) => q.id !== question.id,
                              ),
                            });
                            if (selectedId === question.id) setSelectedId(null);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
          {selected && !readOnly && (
            <section className="flow-panel" aria-label="Question editor">
              <h2>Edit question</h2>
              <QuestionTypeSelector
                value={selected.kind}
                onChange={(kind) => {
                  const ids = new Set(document.questions.map((q) => q.id));
                  const next = defaultQuestion(kind, ids);
                  updateDocument({
                    ...document,
                    questions: document.questions.map((q) =>
                      q.id === selected.id ? { ...next, id: q.id, label: q.label } : q,
                    ),
                  });
                }}
              />
              <FormField label="Label" htmlFor="question-label">
                <TextInput
                  id="question-label"
                  value={selected.label}
                  onChange={(event) =>
                    updateDocument({
                      ...document,
                      questions: document.questions.map((q) =>
                        q.id === selected.id
                          ? { ...q, label: event.target.value }
                          : q,
                      ),
                    })
                  }
                />
              </FormField>
              <FormField label="Help text" htmlFor="question-help">
                <TextArea
                  id="question-help"
                  value={selected.helpText ?? ""}
                  onChange={(event) =>
                    updateDocument({
                      ...document,
                      questions: document.questions.map((q) =>
                        q.id === selected.id
                          ? { ...q, helpText: event.target.value }
                          : q,
                      ),
                    })
                  }
                />
              </FormField>
              <label className="flow-field">
                <input
                  type="checkbox"
                  checked={selected.required}
                  onChange={(event) =>
                    updateDocument({
                      ...document,
                      questions: document.questions.map((q) =>
                        q.id === selected.id
                          ? { ...q, required: event.target.checked }
                          : q,
                      ),
                    })
                  }
                />{" "}
                Required
              </label>
              {(selected.kind === "single_choice" ||
                selected.kind === "multiple_choice") && (
                <ChoiceEditor
                  choices={selected.choices ?? []}
                  onChange={(choices) =>
                    updateDocument({
                      ...document,
                      questions: document.questions.map((q) =>
                        q.id === selected.id ? { ...q, choices } : q,
                      ),
                    })
                  }
                />
              )}
            </section>
          )}
        </div>
      )}
      <details className="flow-panel">
        <summary>Compiled schema (internal)</summary>
        <pre>{JSON.stringify(compiled.jsonSchema, null, 2)}</pre>
      </details>
    </div>
  );
}
