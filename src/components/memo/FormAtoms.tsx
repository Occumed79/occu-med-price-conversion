import { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  error?: string;
}

export const Field = ({ label, required, children, hint, error }: FieldProps) => (
  <div className="field-group">
    <label className="field-label">
      {label}
      {required && <span className="required-star">*</span>}
    </label>
    {children}
    {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    {error && <div className="text-[11.5px] text-destructive mt-1">{error}</div>}
  </div>
);

export const Row = ({ children }: { children: ReactNode }) => (
  <div className="field-row">{children}</div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const TextInput = (props: InputProps) => (
  <input {...props} className="field-input" />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}
export const Select = ({ children, ...props }: SelectProps) => (
  <select {...props} className="field-select">{children}</select>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = (props: TextareaProps) => (
  <textarea {...props} className="field-textarea" />
);
