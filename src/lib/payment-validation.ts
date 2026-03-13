const PAYMENT_REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{3,63}$/;

export interface PaymentReferenceValidation {
  normalized: string;
  valid: boolean;
  error?: string;
}

export function normalizePaymentReference(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeOptionalPaymentReference(value?: string | null): string {
  if (!value) return '';
  return normalizePaymentReference(value);
}

export function validatePaymentReference(
  value: string,
  fieldName = 'Transaction / UTR ID',
): PaymentReferenceValidation {
  const normalized = normalizePaymentReference(value);

  if (!normalized) {
    return {
      normalized,
      valid: false,
      error: `${fieldName} is required`,
    };
  }

  if (!PAYMENT_REFERENCE_PATTERN.test(normalized)) {
    return {
      normalized,
      valid: false,
      error: `${fieldName} must be 4-64 characters and use only letters, numbers, ".", "-", "_", or "/"`,
    };
  }

  return { normalized, valid: true };
}
