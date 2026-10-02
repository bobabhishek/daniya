import { formatToIndianDate } from './indianDateUtils';

/**
 * Generates an SVG Data URL for a sample mock Aadhaar / Government ID card with visible DOB
 * Used for pre-populated mock registrations so admin and user previews look authentic
 */
export function generateMockIdProofSvg({ name = 'Participant', dob = '15/08/2006', docType = 'Aadhaar Card' }) {
  const formattedDob = formatToIndianDate(dob) || dob;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF9933" />
      <stop offset="50%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#138808" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Card Background -->
  <rect x="10" y="10" width="580" height="360" rx="20" fill="#FFFFFF" stroke="#D4AF37" stroke-width="2.5" filter="url(#shadow)" />

  <!-- Top Tricolor Ribbon -->
  <rect x="10" y="10" width="580" height="12" rx="6" fill="url(#headerGrad)" />

  <!-- Card Header -->
  <g transform="translate(30, 42)">
    <!-- Ashoka Emblem Symbol Simulation -->
    <circle cx="20" cy="18" r="16" fill="#1E3A8A" />
    <circle cx="20" cy="18" r="12" fill="#FFFFFF" />
    <circle cx="20" cy="18" r="4" fill="#1E3A8A" />
    
    <text x="50" y="16" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#1E293B">GOVERNMENT OF INDIA</text>
    <text x="50" y="32" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#B45309">UNIQUE IDENTIFICATION AUTHORITY OF INDIA</text>

    <!-- Document Badge -->
    <rect x="420" y="5" width="120" height="26" rx="6" fill="#FEF3C7" stroke="#F59E0B" />
    <text x="480" y="22" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#92400E" text-anchor="middle">GOVT AGE PROOF</text>
  </g>

  <!-- Divider Line -->
  <line x1="30" y1="92" x2="570" y2="92" stroke="#E2E8F0" stroke-width="1.5" />

  <!-- Photo Box -->
  <g transform="translate(35, 110)">
    <rect width="120" height="150" rx="12" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1.5" />
    <!-- Avatar Graphic -->
    <circle cx="60" cy="55" r="26" fill="#CBD5E1" />
    <path d="M 25 135 C 25 95, 95 95, 95 135 Z" fill="#94A3B8" />
    <rect x="15" y="130" width="90" height="15" rx="4" fill="#047857" />
    <text x="60" y="141" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF" text-anchor="middle">VERIFIED CITIZEN</text>
  </g>

  <!-- Attendee & DOB Details (Crucial for Age Proof) -->
  <g transform="translate(180, 118)">
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">NAME / નામ / नाम</text>
    <text x="0" y="44" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0F172A">${name}</text>

    <!-- HIGHLIGHTED DATE OF BIRTH FIELD -->
    <rect x="-8" y="60" width="370" height="46" rx="8" fill="#FEF2F2" stroke="#EF4444" stroke-width="1.5" />
    <text x="8" y="78" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#991B1B">DATE OF BIRTH (DD/MM/YYYY) / જન્મ તારીખ</text>
    <text x="8" y="98" font-family="Arial, sans-serif" font-size="16" font-weight="extrabold" fill="#DC2626">${formattedDob}</text>
    <rect x="250" y="68" width="100" height="28" rx="6" fill="#10B981" />
    <text x="300" y="86" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">✓ DOB VERIFIED</text>

    <!-- Document Subtitle -->
    <text x="0" y="130" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#64748B">DOCUMENT TYPE</text>
    <text x="0" y="146" font-family="Arial, sans-serif" font-size="13" font-weight="semibold" fill="#1E293B">${docType}</text>
  </g>

  <!-- Aadhaar Number Simulation at Bottom -->
  <g transform="translate(180, 290)">
    <rect x="-10" y="-8" width="370" height="38" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
    <text x="175" y="17" font-family="'Courier New', monospace" font-size="18" font-weight="bold" fill="#1E293B" text-anchor="middle" letter-spacing="4">
      XXXX  XXXX  4892
    </text>
  </g>

  <!-- QR Code simulation stamp -->
  <g transform="translate(500, 245)">
    <rect width="60" height="60" rx="8" fill="#F1F5F9" stroke="#64748B" stroke-dasharray="2 2" />
    <text x="30" y="34" font-family="Arial, sans-serif" font-size="9" fill="#64748B" text-anchor="middle">QR VERIFIED</text>
  </g>

  <!-- Security Seal text -->
  <text x="300" y="352" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#94A3B8" text-anchor="middle">
    Official Entry Age Verification • Navratri Garba &amp; Dandiya Raas
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
