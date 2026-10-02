import React from 'react';
import { X, Printer, Download, Sparkles } from 'lucide-react';
import TicketCard from '../tickets/TicketCard';

export default function TicketPreviewModal({ record, onClose }) {
  if (!record) return null;

  const handleDownloadSingle = (ticket) => {
    const singleData = {
      registrationId: record.registrationId,
      ticketId: ticket.ticketId,
      attendee: ticket.name,
      age: ticket.age,
      price: ticket.price,
      status: "PAID"
    };

    const blob = new Blob([JSON.stringify(singleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticket.ticketId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] rounded-3xl border border-amber-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-stone-900 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-stone-900 uppercase">
                Admin Ticket Preview
              </span>
              <span className="text-xs font-mono text-amber-200">{record.registrationId}</span>
            </div>
            <h3 className="text-lg font-bold font-festive mt-0.5">
              Issued Passes ({record.participants?.length || record.count} Passes)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Print Passes"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Ticket Cards List */}
        <div className="p-6 overflow-y-auto space-y-6 printable-tickets-area">
          {record.participants?.map((ticket, idx) => (
            <TicketCard
              key={ticket.ticketId || idx}
              ticket={ticket}
              registrationId={record.registrationId}
              index={idx}
              totalCount={record.participants.length}
              onDownloadSingle={handleDownloadSingle}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-amber-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
