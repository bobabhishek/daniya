/**
 * Merge backend registration rows with authoritative ticket records for My Passes UI.
 */

function isVerifiedRegistration(reg) {
  const payment = String(reg.paymentStatus || '').toUpperCase();
  const verification = String(reg.verificationStatus || '').toUpperCase();
  const registration = String(reg.registrationStatus || '').toUpperCase();
  return (
    verification === 'VERIFIED' ||
    payment === 'PAID' ||
    registration === 'CONFIRMED'
  );
}

function sortParticipants(participants = []) {
  return [...participants].sort((a, b) => {
    const aNum = a.participantNumber || a.participantId || 0;
    const bNum = b.participantNumber || b.participantId || 0;
    if (aNum && bNum) return Number(aNum) - Number(bNum);
    return 0;
  });
}

export function mergeRegistrationsWithTickets(registrations, tickets) {
  const ticketsByReg = {};
  for (const ticket of tickets || []) {
    const regId = ticket.registrationId;
    if (!regId) continue;
    if (!ticketsByReg[regId]) ticketsByReg[regId] = [];
    ticketsByReg[regId].push(ticket);
  }

  for (const regId of Object.keys(ticketsByReg)) {
    ticketsByReg[regId].sort((a, b) =>
      String(a.ticketId || '').localeCompare(String(b.ticketId || ''))
    );
  }

  return (registrations || [])
    .filter(isVerifiedRegistration)
    .map((reg) => {
      const regId = reg.registrationId;
      const regTickets = ticketsByReg[regId] || [];
      const ticketIds = reg.ticketIds?.length ? reg.ticketIds : regTickets.map((t) => t.ticketId);

      let participants = sortParticipants(reg.participants || []);

      if (participants.length === 0 && regTickets.length > 0) {
        participants = regTickets.map((t, idx) => ({
          name: t.name || t.participantName,
          age: t.age,
          dob: t.dob,
          ticketId: t.ticketId,
          price: t.price ?? 299,
          participantNumber: idx + 1,
        }));
      } else {
        participants = participants.map((p, idx) => {
          const ticketId =
            p.ticketId ||
            ticketIds[idx] ||
            regTickets[idx]?.ticketId ||
            `${regId}-T${String(idx + 1).padStart(2, '0')}`;
          const ticketRow =
            regTickets.find((t) => t.ticketId === ticketId) || regTickets[idx];
          return {
            ...p,
            ticketId,
            name: p.name || ticketRow?.name || ticketRow?.participantName,
            age: p.age ?? ticketRow?.age,
            price: p.price ?? ticketRow?.price ?? 299,
            participantNumber: p.participantNumber || idx + 1,
          };
        });
      }

      return {
        ...reg,
        ticketIds: ticketIds.length ? ticketIds : participants.map((p) => p.ticketId).filter(Boolean),
        participants,
      };
    });
}

export { isVerifiedRegistration };
