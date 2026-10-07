export function getParticipantPhoneNumbers(participants = []) {
  if (!Array.isArray(participants)) return [];

  const cleaned = participants
    .map((participant) => {
      const value = participant?.phoneNumber ?? participant?.phone ?? '';
      if (!value) return '';

      let digits = String(value).replace(/\D/g, '');
      if (digits.startsWith('91') && digits.length === 12) {
        digits = digits.slice(2);
      }

      return digits.length === 10 ? digits : '';
    })
    .filter(Boolean);

  return [...new Set(cleaned)];
}

export function formatParticipantPhoneNumbers(participants = []) {
  const phones = getParticipantPhoneNumbers(participants);
  return phones.length ? phones.map((phone) => `+91 ${phone}`).join(', ') : '—';
}
