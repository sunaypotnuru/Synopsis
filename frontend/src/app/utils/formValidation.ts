/**
 * Form Validation Utilities
 * Provides comprehensive validation for all form fields
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex
const PHONE_REGEX = /^[\d\s\-+()\s]{10,}$/;

// Validators
export const validators = {
  email: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Email is required';
    if (!EMAIL_REGEX.test(val)) return 'Invalid email format';
    return null;
  },

  password: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Password is required';
    if (val.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(val)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(val)) return 'Password must contain at least one number';
    if (!/[@$!%*?&]/.test(val)) return 'Password must contain at least one special character (@$!%*?&)';
    return null;
  },

  confirmPassword: (value: unknown, password: unknown): string | null => {
    const val = String(value || '');
    const pass = String(password || '');
    if (!val) return 'Please confirm your password';
    if (val !== pass) return 'Passwords do not match';
    return null;
  },

  name: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Name is required';
    if (val.length < 2) return 'Name must be at least 2 characters';
    if (val.length > 100) return 'Name must be less than 100 characters';
    if (!/^[a-zA-Z\s'-]+$/.test(val)) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    return null;
  },

  phone: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Phone number is required';
    if (!PHONE_REGEX.test(val)) return 'Invalid phone number format';
    return null;
  },

  date: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Date is required';
    const date = new Date(val);
    if (isNaN(date.getTime())) return 'Invalid date format';
    return null;
  },

  required: (value: unknown): string | null => {
    if (value === '' || value === null || value === undefined) return 'This field is required';
    return null;
  },

  minLength: (value: unknown, min: number): string | null => {
    const val = String(value || '');
    if (!val) return `This field is required`;
    if (val.length < min) return `Must be at least ${min} characters`;
    return null;
  },

  maxLength: (value: unknown, max: number): string | null => {
    const val = String(value || '');
    if (val.length > max) return `Must be less than ${max} characters`;
    return null;
  },

  number: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Number is required';
    if (isNaN(Number(val))) return 'Must be a valid number';
    return null;
  },

  url: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'URL is required';
    try {
      new URL(val);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },

  zipCode: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Zip code is required';
    if (!/^\d{5}(-\d{4})?$/.test(val)) return 'Invalid zip code format';
    return null;
  },

  creditCard: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Credit card number is required';
    const cleaned = val.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return 'Invalid credit card number';
    return null;
  },

  medicalId: (value: unknown): string | null => {
    const val = String(value || '');
    if (!val) return 'Medical ID is required';
    if (!/^[A-Z0-9]{6,20}$/.test(val)) return 'Invalid medical ID format';
    return null;
  },

  age: (value: unknown): string | null => {
    const val = Number(value);
    if (value === null || value === undefined || isNaN(val)) return 'Age is required';
    if (val < 0) return 'Age cannot be negative';
    if (val > 150) return 'Age must be less than 150';
    return null;
  },
};

// Form validation functions
export function validateEmail(email: string): string | null {
  return validators.email(email);
}

export function validatePassword(password: string): string | null {
  return validators.password(password);
}

export function validateForm(
  formData: Record<string, unknown>,
  validationRules: Record<string, (value: unknown) => string | null>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, validator] of Object.entries(validationRules)) {
    const error = validator(formData[field]);
    if (error) {
      errors.push({ field, message: error });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Specific form validators
export function validateLoginForm(formData: {
  email: string;
  password: string;
}): ValidationResult {
  return validateForm(formData, {
    email: validators.email,
    password: (value) => validators.required(value),
  });
}

export function validateRegistrationForm(formData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  return validateForm(formData, {
    name: validators.name,
    email: validators.email,
    password: validators.password,
    confirmPassword: (value) => validators.confirmPassword(value, formData.password),
  });
}

export function validateAppointmentForm(formData: {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
}): ValidationResult {
  return validateForm(formData, {
    doctorId: validators.required,
    date: validators.date,
    time: validators.required,
    reason: (value) => validators.minLength(value, 10),
  });
}

export function validateMedicalRecordForm(formData: {
  patientId: string;
  recordType: string;
  description: string;
  date: string;
}): ValidationResult {
  return validateForm(formData, {
    patientId: validators.required,
    recordType: validators.required,
    description: (value) => validators.minLength(value, 20),
    date: validators.date,
  });
}

export function validatePrescriptionForm(formData: {
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}): ValidationResult {
  return validateForm(formData, {
    patientId: validators.required,
    medication: validators.required,
    dosage: validators.required,
    frequency: validators.required,
    duration: validators.required,
  });
}

// Utility function to get error message for a field
export function getFieldError(
  errors: ValidationError[],
  fieldName: string
): string | null {
  const error = errors.find((e) => e.field === fieldName);
  return error ? error.message : null;
}

// Utility function to check if field has error
export function hasFieldError(
  errors: ValidationError[],
  fieldName: string
): boolean {
  return errors.some((e) => e.field === fieldName);
}
