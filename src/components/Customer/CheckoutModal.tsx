import React, { useState } from 'react';
import {
  Booking,
  EventItem,
  Showtime,
  ShowSeat,
  User,
} from '../../types';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  Clock,
  X,
  Mail,
  Download,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  showtime: Showtime;
  heldSeats: ShowSeat[];
  currentUser: User;
  onConfirmBooking: (paymentIntentId: string) => Promise<{ success: boolean; booking?: Booking; error?: string }>;
  onViewBooking: (booking: Booking) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  event,
  showtime,
  heldSeats,
  currentUser,
  onConfirmBooking,
  onViewBooking,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('888');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate pricing
  let totalCents = 0;
  const items = heldSeats.map((seat) => {
    const pricing = showtime.seatPricings.find((p) => p.category === seat.seat.category);
    const price = pricing?.priceCents || 10000;
    totalCents += price;
    return {
      seat,
      price,
    };
  });

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const simulatedPaymentIntent = `pi_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const result = await onConfirmBooking(simulatedPaymentIntent);

      if (result.success && result.booking) {
        setConfirmedBooking(result.booking);
        // Confetti celebration
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        setErrorMessage(result.error || 'Transaction failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment processor timeout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!confirmedBooking ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Instant Checkout</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exclusive 10-minute hold lock active</span>
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Order Items */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-slate-800">
                <span>{event.title}</span>
                <span className="text-slate-400">{new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {items.map(({ seat, price }) => (
                  <div key={seat.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-indigo-300 font-mono text-[10px] flex items-center justify-center font-bold">
                        {seat.seat.row}{seat.seat.number}
                      </span>
                      <span className="text-slate-300">
                        Row {seat.seat.row}, Seat {seat.seat.number} ({seat.seat.category})
                      </span>
                    </div>
                    <span className="font-semibold text-slate-200"> ₹{(price / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Total Amount Due</span>
                <span className="text-xl font-black text-white"> ₹{(totalCents / 100).toFixed(2)} INR</span>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentUser.fullName}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Card Details (Simulated Test Card)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-black text-sm shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Committing Transaction & Minting QR...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{(totalCents / 100).toFixed(2)} INR & Get Tickets</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation State */
          <div className="text-center py-4 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                Zero Double-Booking Confirmed
              </span>
              <h3 className="text-2xl font-black text-white mt-2">You're Going Live!</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Booking Reference: <strong className="text-indigo-400">{confirmedBooking.bookingReference}</strong>
              </p>
            </div>

            {/* QR Pass */}
            {confirmedBooking.qrCodeDataUrl && (
              <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl mx-auto border-4 border-slate-800">
                <img
                  src={confirmedBooking.qrCodeDataUrl}
                  alt="Entry QR Pass"
                  className="w-44 h-44 mx-auto rounded-lg"
                />
                <p className="text-[10px] font-mono text-slate-700 mt-2 font-bold">
                  TAMPER-PROOF HMAC-SHA256 PASS
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onViewBooking(confirmedBooking);
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Open Ticket Wallet</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Back to Events
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
