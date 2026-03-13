import { describe, expect, it } from 'vitest';

import {
  normalizeOptionalPaymentReference,
  normalizePaymentReference,
  validatePaymentReference,
} from '../payment-validation';

describe('payment validation', () => {
  it('normalizes transaction references to uppercase without spaces', () => {
    expect(normalizePaymentReference('  ab 12-cd  ')).toBe('AB12-CD');
  });

  it('normalizes optional references safely', () => {
    expect(normalizeOptionalPaymentReference(undefined)).toBe('');
    expect(normalizeOptionalPaymentReference(' upi/ref-9 ')).toBe('UPI/REF-9');
  });

  it('accepts supported payment reference characters', () => {
    const result = validatePaymentReference('txn/ab_12-xy');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('TXN/AB_12-XY');
  });

  it('rejects blank references', () => {
    const result = validatePaymentReference('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('rejects unsupported characters', () => {
    const result = validatePaymentReference('paid now!');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('letters, numbers');
  });
});
