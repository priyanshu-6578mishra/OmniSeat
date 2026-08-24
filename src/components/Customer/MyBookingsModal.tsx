import React, { useState } from 'react';
import { Booking, User } from '../../types';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  ShieldCheck,
  AlertCircle,
  X,
  Mail,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { generateBookingEmailHtml } from '../../lib/emailService';

interface MyBookingsModalProps {
  bookings: Booking[];
  currentUser: User;
  onCancelBooking: (bookingId: string) => Promise<{ success: boolean; reallocatedCount: number; error?: string }>;
  onClose?: () => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  bookings,
  currentUser,
  onCancelBooking,
  onClose,
}) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(bookings[0] || null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ message: string; reallocated: number } | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The seat will be automatically reallocated to the next fan on the waitlist.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await onCancelBooking(bookingId);
      if (res.success) {
        setCancelResult({
          message: 'Booking cancelled and payment marked refunded.',
          reallocated: res.reallocatedCount,
        });
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: 'CANCELLED' });
        }
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Ticket className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-white">My Ticket Wallet</h2>
          </div>
          <p className="text-xs text-slate-400">
            Cryptographically signed passes for <strong className="text-slate-200">{currentUser.fullName}</strong>
          </p>
        </div>
      </div>

      {cancelResult && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div>
            <p className="font-bold">{cancelResult.message}</p>
            <p className="text-emerald-300/80 mt-0.5">
              ⚡ Automated Reallocation Engine: Dispatched exclusive 15m claim offer to #{cancelResult.reallocated} waitlist candidate!
            </p>
          </div>
          <button
            onClick={() => setCancelResult(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No active tickets yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Browse our high-concurrency concerts and movies to reserve seats with guaranteed zero double-booking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Bookings List */}
          <div className="lg:col-span-5 space-y-3">
            {bookings.map((b) => {
              const isSelected = selectedBooking?.id === b.id;
              const isCancelled = b.status === 'CANCELLED';

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  } ${isCancelled ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isCancelled
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                            : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        }`}
                      >
                        {b.status}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">{b.event.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{b.bookingReference}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-white">
                        ₹{(b.totalAmountCents / 100).toFixed(2)}
                      </span>
                      <p className="text-[10px] text-slate-500">{b.items.length} seat(s)</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      {new Date(b.showtime.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      Seats: {b.items.map((i) => `${i.seatSummary.row}${i.seatSummary.number}`).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Ticket Detail & QR Display */}
          <div className="lg:col-span-7">
            {selectedBooking ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                {/* Visual Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                      Pass #{selectedBooking.bookingReference}
                    </span>
                    <h3 className="text-xl font-black text-white mt-1">{selectedBooking.event.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedBooking.venue.name} &bull; {selectedBooking.venue.city}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEmailPreview(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="View Generated Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Pass</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Print Ticket"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Left: Metadata */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase text-[10px]">Showtime</span>
                      <p className="font-bold text-white text-sm">
                        {new Date(selectedBooking.showtime.startTime).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block uppercase text-[10px]">Assigned Seats</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedBooking.items.map((item) => (
                          <span
                            key={item.id}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono font-bold"
                          >
                            Row {item.seatSummary.row}, Seat {item.seatSummary.number} ({item.category})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block uppercase text-[10px]">Digital Signature</span>
                      <p className="font-mono text-[10px] text-slate-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                        {selectedBooking.qrPayloadSignature}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block uppercase text-[10px]">Gate Verification Status</span>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-md font-bold text-[11px] ${
                          selectedBooking.isScannedAtDoor
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {selectedBooking.isScannedAtDoor ? 'Admitted at Gate Scanner' : 'Valid & Unscanned'}
                      </span>
                    </div>
                  </div>

                  {/* Right: QR Code Visual */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                    {selectedBooking.qrCodeDataUrl ? (
                      <div className="bg-white p-3 rounded-xl shadow-lg border-2 border-slate-800">
                        <img
                          src={selectedBooking.qrCodeDataUrl}
                          alt="Entry Pass QR"
                          className="w-40 h-40"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                        <QrCode className="w-10 h-10" />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono mt-3 uppercase tracking-wider">
                      Gate Scanner Payload
                    </span>
                  </div>
                </div>

                {/* Cancel Booking & Waitlist Reallocation Trigger */}
                {selectedBooking.status === 'CONFIRMED' && (
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      Need to cancel? Seats will be immediately offered to waitlisted fans.
                    </p>
                    <button
                      onClick={() => handleCancel(selectedBooking.id)}
                      disabled={isCancelling}
                      className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isCancelling ? 'Reallocating...' : 'Cancel & Refund Booking'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* HTML Email Modal Preview */}
      {showEmailPreview && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Dispatched HTML Email Preview (Resend / Nodemailer)</h4>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-white rounded-xl p-4 text-slate-950">
              <div dangerouslySetInnerHTML={{ __html: generateBookingEmailHtml(selectedBooking) }} />
            </div>

            <div className="text-right">
              <button
                onClick={() => setShowEmailPreview(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
