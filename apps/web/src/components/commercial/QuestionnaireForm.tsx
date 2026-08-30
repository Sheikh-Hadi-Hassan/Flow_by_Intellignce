"use client";

import Form from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";

interface QuestionnaireFormProps {
  readonly schema: Record<string, unknown>;
  readonly uiSchema?: Record<string, unknown>;
  readonly formData: Record<string, unknown>;
  readonly onChange: (value: Record<string, unknown>) => void;
  readonly disabled?: boolean;
}

export function QuestionnaireForm({
  schema,
  uiSchema,
  formData,
  onChange,
  disabled,
}: QuestionnaireFormProps) {
  return (
    <Form
      schema={schema as RJSFSchema}
      formData={formData}
      validator={validator}
      liveValidate
      showErrorList={false}
      {...(uiSchema ? { uiSchema: uiSchema as UiSchema } : {})}
      {...(disabled ? { disabled: true } : {})}
      onChange={(event) =>
        onChange((event.formData ?? {}) as Record<string, unknown>)
      }
      onSubmit={() => undefined}
    >
      <div />
    </Form>
  );
}
