/**
 * Generate sequential registration ID in the format KD-{6 digits} (e.g. KD-000001)
 * Used as frontend fallback/test helper; backend is authoritative.
 */
let localSequenceCounter = 1;

export function generateRegistrationId(seq = null) {
  const num = seq !== null ? seq : localSequenceCounter++;
  return `KD-${String(num).padStart(6, '0')}`;
}

/**
 * Generate unique ticket ID for a participant index
 * @param {string} registrationId e.g. "KD-000001"
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
  let result = 'TXN-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

