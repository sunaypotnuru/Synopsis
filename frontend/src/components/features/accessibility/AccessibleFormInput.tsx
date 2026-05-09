import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccessibleFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
}

export function AccessibleFormInput({
  label,
  error,
  description,
  className = "",
  id,
  ...props
}: AccessibleFormInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={inputId} className={error ? "text-red-500" : ""}>
        {label}
      </Label>
      <Input
        id={inputId}
        aria-describedby={description ? `${inputId}-desc` : undefined}
        aria-invalid={!!error}
        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
        {...props}
      />
      {description && (
        <p id={`${inputId}-desc`} className="text-xs text-slate-500">
          {description}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
