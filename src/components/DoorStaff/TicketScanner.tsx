import React, { useState } from 'react';
import { Booking, User } from '../../types';
import {
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  QrCode,
  Sparkles,
  Ticket,
} from 'lucide-react';

interface TicketScannerProps {
  currentUser: User;
  allBookings: Booking[];
  onVerifyPayload: (rawPayload: string) => { isValid: boolean; booking?: Booking; reason?: string; warning?: string };
}

export const TicketScanner: React.FC<TicketScannerProps> = ({
  currentUser,
  allBookings,
  onVerifyPayload,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    isValid: boolean;
    booking?: Booking;
    reason?: string;
    warning?: string;
  } | null>(null);

  const handleScan = (rawJson: string) => {
    const res = onVerifyPayload(rawJson);
    setScanResult(res);
  };

  const handleSimulateQuickScan = (booking: Booking, tamperWithSignature: boolean = false) => {
    const payload = {
      bookingId: booking.id,
      bookingRef: booking.bookingReference,
      userId: booking.userId,
      userEmail: booking.userEmail,
      eventId: booking.event.id,
      eventTitle: booking.event.title,
      showtimeId: booking.showtimeId,
      showtimeStart: booking.showtime.startTime,
      venueName: booking.venue.name,
      seatNumbers: booking.items.map((i) => `${i.seatSummary.row}${i.seatSummary.number}`),
      totalCents: booking.totalAmountCents,
      issuedAt: booking.createdAt,
      signature: tamperWithSignature ? 'forged_tampered_signature_xyz' : booking.qrPayloadSignature,
    };
    const jsonStr = JSON.stringify(payload);
    setTokenInput(jsonStr);
    handleScan(jsonStr);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ScanLine className="w-5 h-5" />
          </span>
          <h2 className="text-2xl font-black text-white">Door Staff Pass Verifier</h2>
        </div>
        <p className="text-xs text-slate-400">
          Gate Agent: <strong className="text-slate-200">{currentUser.fullName}</strong> &bull; Authenticate HMAC-SHA256 Digital Signatures
        </p>
      </div>

      {/* Main Scanner Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Scan / Input Raw QR Code Payload JSON
          </label>
          <textarea
            rows={4}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder='Paste QR Code Payload JSON string: {"bookingId": "...", "signature": "..."}'
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleScan(tokenInput)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify & Admit Attendee</span>
          </button>

          <button
            onClick={() => {
              setTokenInput('');
              setScanResult(null);
            }}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Clear Scanner
          </button>
        </div>

        {/* Scan Result Hologram Badge */}
        {scanResult && (
          <div
            className={`p-6 rounded-2xl border-2 transition-all ${
              scanResult.isValid && !scanResult.warning
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-xl shadow-emerald-500/20'
                : scanResult.warning
                ? 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-xl shadow-amber-500/20'
                : 'bg-red-950/80 border-red-500 text-red-100 shadow-xl shadow-red-500/20'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  scanResult.isValid && !scanResult.warning
                    ? 'bg-emerald-500 text-slate-950'
                    : scanResult.warning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-500 text-white'
                }`}
              >
                {scanResult.isValid && !scanResult.warning ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : scanResult.warning ? (
                  <AlertTriangle className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950/40">
                  {scanResult.isValid && !scanResult.warning
                    ? 'ACCESS GRANTED'
                    : scanResult.warning
                    ? 'DUPLICATE ENTRY DETECTED'
                    : 'ACCESS DENIED'}
                </span>

                <h3 className="text-lg font-black mt-1">
                  {scanResult.isValid && !scanResult.warning
                    ? 'Valid Ticket Authenticated'
                    : scanResult.warning || scanResult.reason}
                </h3>
              </div>
            </div>

            {scanResult.booking && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Attendee</span>
                  <p className="font-bold text-white mt-0.5">{scanResult.booking.userName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Event</span>
                  <p className="font-bold text-white mt-0.5 truncate">{scanResult.booking.event.title}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Seats</span>
                  <p className="font-mono font-bold text-indigo-300 mt-0.5">
                    {scanResult.booking.items.map((i) => `${i.seatSummary.row}${i.seatSummary.number}`).join(', ')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Booking Ref</span>
                  <p className="font-mono font-bold text-white mt-0.5">{scanResult.booking.bookingReference}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Test Simulator Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Quick Simulator: Test Valid vs Forged Tickets</span>
        </h3>

        <div className="space-y-2">
          {allBookings.slice(0, 3).map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs"
            >
              <div>
                <span className="font-bold text-white">{b.userName}</span>
                <span className="text-slate-500 text-[11px] ml-2">
                  ({b.bookingReference} &bull; {b.items.map((i) => `${i.seatSummary.row}${i.seatSummary.number}`).join(', ')})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateQuickScan(b, false)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                >
                  Test Valid Scan
                </button>
                <button
                  onClick={() => handleSimulateQuickScan(b, true)}
                  className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-[11px] transition-colors"
                >
                  Test Forgery
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
