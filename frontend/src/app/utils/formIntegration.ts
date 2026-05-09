/**
 * Form Integration Utilities
 * Bridges react-hook-form with our validation utilities
 */

import { UseFormSetError, FieldValues, Path } from 'react-hook-form';
import { ValidationError } from './formValidation';

/**
 * Convert validation errors to react-hook-form errors
 */
export function applyValidationErrors<T extends FieldValues>(
  errors: ValidationError[],
  setError: UseFormSetError<T>
) {
  errors.forEach((error) => {
    setError(error.field as Path<T>, {
      type: 'manual',
      message: error.message,
    });
  });
}

/**
 * Get error message for a field from react-hook-form
 */
export function getFieldErrorMessage(error: { message?: string | { toString: () => string } }): string | undefined {
  if (!error) return undefined;
  if (typeof error.message === 'string') return error.message;
  if (error.message && typeof error.message === 'object' && 'toString' in error.message) {
    return error.message.toString();
  }
  return undefined;
}

/**
 * Check if field has error
 */
export function hasFieldError(errors: Record<string, unknown>, fieldName: string): boolean {
  return !!errors[fieldName];
}

/**
 * Get all error messages from form
 */
export function getAllErrorMessages(errors: Record<string, unknown>): string[] {
  return Object.values(errors)
    .map((error) => getFieldErrorMessage(error as { message?: string }))
    .filter((msg): msg is string => !!msg);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: string): string {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

/**
 * Format date for input
 */
export function formatDateForInput(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Sanitize form data
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const sanitized = { ...data };
  
  (Object.keys(sanitized) as Array<keyof T>).forEach((key) => {
    const value = sanitized[key];
    
    // Trim strings
    if (typeof value === 'string') {
      sanitized[key] = value.trim() as T[keyof T];
    }
    
    // Remove empty strings
    if (value === '') {
      delete sanitized[key];
    }
  });
  
  return sanitized;
}

/**
 * Merge validation errors
 */
export function mergeValidationErrors(
  errors1: ValidationError[],
  errors2: ValidationError[]
): ValidationError[] {
  const merged = [...errors1];
  
  errors2.forEach((error2) => {
    const exists = merged.find((e) => e.field === error2.field);
    if (!exists) {
      merged.push(error2);
    }
  });
  
  return merged;
}

/**
 * Check if form has any errors
 */
export function hasFormErrors(errors: Record<string, unknown>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get first error message
 */
export function getFirstErrorMessage(errors: Record<string, unknown>): string | undefined {
  const messages = getAllErrorMessages(errors);
  return messages[0];
}

/**
 * Create form error object
 */
export function createFormError(field: string, message: string): ValidationError {
  return { field, message };
}

/**
 * Validate form data before submission
 */
export function validateFormBeforeSubmit<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  requiredFields.forEach((field) => {
    const value = data[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        field: String(field),
        message: `${String(field)} is required`,
      });
    }
  });
  
  return errors;
}

/**
 * Debounce form validation
 */
export function debounceValidation(
  callback: () => void,
  delay: number = 500
): () => void {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
}

/**
 * Create async validator
 */
export function createAsyncValidator(
  validationFn: (value: string) => Promise<string | null>
) {
  return async (value: string) => {
    const error = await validationFn(value);
    return error || true;
  };
}

/**
 * Combine validators
 */
export function combineValidators(
  ...validators: Array<(value: unknown) => string | null>
) {
  return (value: unknown) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
}

/**
 * Create conditional validator
 */
export function createConditionalValidator(
  condition: boolean,
  validator: (value: unknown) => string | null
) {
  return (value: unknown) => {
    if (!condition) return null;
    return validator(value);
  };
}

/**
 * Get form data as FormData object
 */
export function getFormDataAsFormData<T extends Record<string, unknown>>(
  data: T
): FormData {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });
  
  return formData;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  maxSize: number = 5 * 1024 * 1024, // 5MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']
): string | null {
  if (!file) return 'File is required';
  
  if (file.size > maxSize) {
    return `File size must be less than ${maxSize / 1024 / 1024}MB`;
  }
  
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  
  return null;
}

/**
 * Create file validator
 */
export function createFileValidator(
  maxSize: number = 5 * 1024 * 1024,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']
) {
  return (file: File) => validateFileUpload(file, maxSize, allowedTypes);
}
