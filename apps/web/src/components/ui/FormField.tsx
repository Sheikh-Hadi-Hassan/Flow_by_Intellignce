import type { InputHTMLAttributes, ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  help,
  error,
  children,
}: FormFieldProps) {
  const helpId = help ? `${htmlFor ?? label}-help` : undefined;
  const errorId = error ? `${htmlFor ?? label}-error` : undefined;

  return (
    <div className="flow-field">
      {htmlFor ? (
        <label className="flow-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="flow-field__label">{label}</span>
      )}
      {children}
      {help && (
        <p className="flow-field__help" id={helpId}>
          {help}
        </p>
      )}
      {error && (
        <p className="flow-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  id,
  describedBy,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { describedBy?: string }) {
  return (
    <input
      id={id}
      className={`flow-input ${className}`}
      aria-describedby={describedBy}
      {...props}
    />
  );
}

export function TextArea({
  id,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea id={id} className={`flow-textarea ${className}`} {...props} />
  );
}

export function Select({
  id,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select id={id} className={`flow-select ${className}`} {...props}>
      {children}
    </select>
  );
}
