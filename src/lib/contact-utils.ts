/**
 * Contact Validation and Formatting Utilities
 * Eliminates placeholder, dummy, or mock contact details across Build Permit Pro.
 */

const BLOCKED_PHONE_PATTERNS = [
  '8600100',
  '860-0100',
  '5550100',
  '555-0100',
  '8603100',
  '860-3100',
  '8601234',
  '860-1234',
  '5555555',
  '1234567',
  '0000000'
];

const BLOCKED_EMAIL_DOMAINS = [
  'contractor.bc.ca',
  'builder.bc.ca',
  'contractor.ca',
  'example.com',
  'test.com',
  'sample.com',
  'demo.com'
];

/**
 * Validates whether a phone number is genuine, non-null, and not a dummy/mock pattern.
 * Checks for standard 10-digit format (or 11-digit with country code 1).
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;

  // Check against blocked placeholder substrings
  const digits = trimmed.replace(/\D/g, '');
  if (BLOCKED_PHONE_PATTERNS.some((pattern) => digits.includes(pattern.replace(/\D/g, '')))) {
    return false;
  }

  // Must have 10 digits (or 11 digits starting with 1)
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('1')) return true;

  return false;
}

/**
 * Validates whether an email address is authentic and non-placeholder.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;

  // Check against blocked mock domains
  if (BLOCKED_EMAIL_DOMAINS.some((domain) => trimmed.includes(domain))) {
    return false;
  }

  // Standard email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Formats a valid 10-digit Canadian/US phone number to (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
