import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface AccessibleFormSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
}

export function AccessibleFormSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  description,
  error
}: AccessibleFormSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
