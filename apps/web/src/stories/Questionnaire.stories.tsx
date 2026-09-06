import type { Meta, StoryObj } from "@storybook/react";
import { QuestionTypeSelector, ChoiceEditor } from "../components/questionnaire/QuestionTypeSelector";
import {
  AutosaveStatus,
  QuestionnaireProgress,
  ValidationMessage,
  VersionStatusBadge,
  EmptyQuestionnaireState,
} from "../components/questionnaire/QuestionnaireChrome";
import { QuestionnaireAnswerForm } from "../components/questionnaire/QuestionnaireAnswerForm";
import { createEmptyBuilderDocument } from "@flow/commercial";

const meta: Meta = { title: "Questionnaire" };
export default meta;
type Story = StoryObj;

export const TypeSelector: Story = {
  render: () => (
    <QuestionTypeSelector value="short_text" onChange={() => undefined} />
  ),
};

export const ChoiceEditorStory: Story = {
  render: () => (
    <ChoiceEditor
      choices={[
        { id: "a", label: "Emerging brand" },
        { id: "b", label: "Established brand" },
      ]}
      onChange={() => undefined}
    />
  ),
};

export const ValidationMessages: Story = {
  render: () => (
    <ValidationMessage messages={["Primary audience is required", "Invalid email format"]} />
  ),
};

export const AutosaveSaving: Story = {
  render: () => <AutosaveStatus state="saving" />,
};

export const AutosaveSaved: Story = {
  render: () => <AutosaveStatus state="saved" />,
};

export const AutosaveError: Story = {
  render: () => <AutosaveStatus state="error" error="Network unavailable" />,
};

export const Progress: Story = {
  render: () => <QuestionnaireProgress answered={2} total={5} />,
};

export const VersionDraft: Story = {
  render: () => <VersionStatusBadge status="draft" />,
};

export const VersionPublished: Story = {
  render: () => <VersionStatusBadge status="published" />,
};

export const EmptyBuilder: Story = {
  render: () => (
    <EmptyQuestionnaireState>
      <p>No questions yet</p>
      <p>Add your first question to begin.</p>
    </EmptyQuestionnaireState>
  ),
};

export const AnswerPreview: Story = {
  render: () => (
    <QuestionnaireAnswerForm
      document={{
        version: 1,
        questions: [
          { id: "email", kind: "email", label: "Contact email", required: true },
          {
            id: "scope",
            kind: "long_text",
            label: "Project scope",
            required: false,
            helpText: "Describe outcomes, not deliverable lists.",
          },
        ],
      }}
      answers={{ email: "founder@example.com" }}
      onChange={() => undefined}
      preview
    />
  ),
};

export const MobileLongContent: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <QuestionnaireAnswerForm
      document={createEmptyBuilderDocument()}
      answers={{}}
      onChange={() => undefined}
    />
  ),
};
