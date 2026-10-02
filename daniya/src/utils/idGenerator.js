/**
 * Generate unique registration ID in the format KD-XXXXXX (e.g. KD-001245)
 */
export function generateRegistrationId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `KD-${randomNum}`;
}

/**
 * Generate unique ticket ID for a participant index
 * @param {string} registrationId e.g. "KD-001245"
 * @param {number} index 0-based index
 */
export function generateTicketId(registrationId, index) {
  const padIndex = String(index + 1).padStart(2, '0');
  return `${registrationId}-T${padIndex}`;
}

/**
 * Generate mock transaction ID for payment simulation
 */
export function generateTransactionId() {
  const chars = '0123456789ABCDEF';
  let result = 'MOCK-TXN-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
