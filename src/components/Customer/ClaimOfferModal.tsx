import React, { useState, useEffect } from 'react';
import { WaitlistEntry, User, Booking } from '../../types';
import { Sparkles, Clock, AlertTriangle, CheckCircle2, ArrowRight, X, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClaimOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: WaitlistEntry | null;
  currentUser: User;
  onClaimOffer: (claimToken: string) => Promise<{ success: boolean; booking?: Booking; error?: string }>;
  onViewBooking: (booking: Booking) => void;
}

export const ClaimOfferModal: React.FC<ClaimOfferModalProps> = ({
  isOpen,
  onClose,
  offer,
  currentUser,
  onClaimOffer,
  onViewBooking,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedBooking, setClaimedBooking] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);

  useEffect(() => {
    if (!offer || !offer.offerExpiresAt) return;

    const calcTime = () => {
      const diff = new Date(offer.offerExpiresAt!).getTime() - Date.now();
      setSecondsRemaining(Math.max(0, Math.floor(diff / 1000)));
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  if (!isOpen || !offer) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isExpired = secondsRemaining <= 0;

  const handleClaim = async () => {
    if (!offer.claimToken) return;
    setIsClaiming(true);
    setErrorMessage(null);

    try {
      const res = await onClaimOffer(offer.claimToken);
      if (res.success && res.booking) {
        setClaimedBooking(res.booking);
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        setErrorMessage(res.error || 'Failed to claim offer.');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!claimedBooking ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                  Exclusive Waitlist Offer
                </span>
                <h3 className="text-xl font-black text-white mt-1">A Seat Opened Up For You!</h3>
              </div>
            </div>

            {/* Countdown Banner */}
            <div className={`p-4 rounded-2xl border mb-6 flex items-center justify-between ${
              isExpired
                ? 'bg-red-950/80 border-red-500/60 text-red-200'
                : 'bg-amber-950/60 border-amber-500/60 text-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 animate-pulse" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                    {isExpired ? 'Offer Window Expired' : 'Exclusive Claim Window (15m TTL)'}
                  </span>
                  <span className="text-xl font-black font-mono">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>
              <span className="text-xs text-right opacity-90 max-w-[140px]">
                {isExpired ? 'Cascaded to next fan' : 'Reserved exclusively for you'}
              </span>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Offer details */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-3 mb-6">
              <div className="flex justify-between items-start pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm">{offer.eventTitle}</h4>
                  <p className="text-slate-400">{new Date(offer.showtimeStart).toLocaleString()}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-bold text-[10px]">
                  {offer.category}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Offered Seat Allocation:</span>
                <span className="font-bold text-indigo-300">{offer.offeredSeatSummary || 'Premium Reserved Seat'}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                Signed Token: <code className="text-amber-400 font-mono">{offer.claimToken?.slice(0, 20)}...</code>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleClaim}
              disabled={isClaiming || isExpired}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Confirming Priority Reservation...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Claim & Confirm My Ticket Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                Waitlist Offer Claimed Successfully
              </span>
              <h3 className="text-2xl font-black text-white mt-2">Seat Locked & Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Booking Reference: <strong className="text-indigo-400">{claimedBooking.bookingReference}</strong>
              </p>
            </div>

            {claimedBooking.qrCodeDataUrl && (
              <div className="bg-white p-3 rounded-xl inline-block shadow-xl mx-auto border-2 border-slate-800">
                <img
                  src={claimedBooking.qrCodeDataUrl}
                  alt="Entry Pass QR"
                  className="w-36 h-36"
                />
              </div>
            )}

            <button
              onClick={() => {
                onViewBooking(claimedBooking);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
            >
              Open in My Ticket Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
