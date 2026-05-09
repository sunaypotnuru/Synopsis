import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AccessibleFormTextareaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  rows?: number;
}

export function AccessibleFormTextarea({
  label,
  value,
  onChange,
  placeholder,
  description,
  error,
  rows = 4
}: AccessibleFormTextareaProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        aria-label={label}
        className={error ? "border-red-500" : ""}
      />
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
