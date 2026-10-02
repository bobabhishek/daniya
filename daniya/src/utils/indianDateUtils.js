/**
 * Indian Date Utilities (Strict DD/MM/YYYY standard)
 * Standard in India: DD/MM/YYYY
 */

/**
 * Parses a date string safely into a Date object.
 * Supports DD/MM/YYYY, DD-MM-YYYY, and YYYY-MM-DD (HTML5 date input format).
 * @param {string|Date} dateStr 
 * @returns {Date|null}
 */
export function parseIndianDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  const s = String(dateStr).trim();

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY (Indian Standard)
  const indianMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (indianMatch) {
    const day = parseInt(indianMatch[1], 10);
    const month = parseInt(indianMatch[2], 10);
    const year = parseInt(indianMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d;
      }
    }
  }

  // Pattern 2: YYYY-MM-DD (HTML5 date picker value format)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d;
      }
    }
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats any Date object or date string strictly to Indian standard DD/MM/YYYY
 * @param {Date|string} dateOrStr 
 * @returns {string} e.g. "15/08/2006"
 */
export function formatToIndianDate(dateOrStr) {
  if (!dateOrStr) return '';
  const d = parseIndianDate(dateOrStr);
  if (!d) return typeof dateOrStr === 'string' ? dateOrStr : '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converts any date format to YYYY-MM-DD for standard HTML input[type="date"]
 * @param {string|Date} dateOrStr 
 * @returns {string} e.g. "2006-08-15"
 */
export function toInputDateFormat(dateOrStr) {
  if (!dateOrStr) return '';
  const d = parseIndianDate(dateOrStr);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Calculate age based on Date of Birth string in DD/MM/YYYY or YYYY-MM-DD
 * @param {string} dobString 
 * @returns {number|''}
 */
export function calculateAgeFromDob(dobString) {
  if (!dobString) return '';
  const birthDate = parseIndianDate(dobString);
  if (!birthDate) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 0 ? age : 0;
}

/**
 * Returns current timestamp in Indian format: DD/MM/YYYY, HH:MM AM/PM
 * @param {string} timeString optional time string
 * @returns {string} e.g. "02/10/2026, 02:15 PM"
 */
export function formatCurrentIndianDateTime(timeString = '') {
  const now = new Date();
  const dateFormatted = formatToIndianDate(now);
  if (timeString) return `${dateFormatted}, ${timeString}`;
  const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateFormatted}, ${timeFormatted}`;
}
