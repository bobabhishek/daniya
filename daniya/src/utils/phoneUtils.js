/**
 * Utilities for Indian 10-digit Mobile Number Parsing and Validation
 */

/**
 * Clean and normalize phone input string.
 * Strips non-digits, strips leading Indian country code (+91/91) or trunk prefix (0),
 * and caps at 10 digits.
 */
export function cleanIndianPhone(val) {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Validates whether the given value is a valid 10-digit Indian mobile number.
 * Under TRAI national numbering plan, Indian mobile numbers are 10 digits
 * starting with 6, 7, 8, or 9.
 */
export function isValidIndianPhone(val) {
  if (!val) return false;
  const cleaned = cleanIndianPhone(val);
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Format 10-digit phone number with +91 prefix for UI display.
 */
export function formatIndianPhone(val) {
  const cleaned = cleanIndianPhone(val);
  if (!cleaned) return '';
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return cleaned;
}
