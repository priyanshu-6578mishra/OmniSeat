import React, { useState } from 'react';
import { EventItem, Showtime, SeatCategory, User, WaitlistEntry } from '../../types';
import { Users, Clock, Sparkles, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  showtime: Showtime;
  category: SeatCategory;
  currentUser: User;
  onJoinWaitlist: (category: SeatCategory) => { success: boolean; entry?: WaitlistEntry; queuePosition?: number; error?: string };
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  event,
  showtime,
  category,
  currentUser,
  onJoinWaitlist,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ queuePosition: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = onJoinWaitlist(category);
    setIsSubmitting(false);

    if (res.success && res.queuePosition) {
      setResult({ queuePosition: res.queuePosition });
    } else {
      setErrorMessage(res.error || 'Failed to join waitlist.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!result ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Join Priority Waitlist</h3>
                <p className="text-xs text-slate-400">
                  Tier: <strong className="text-amber-400">{category}</strong>
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2 mb-6">
              <p className="text-slate-300 font-semibold">{event.title}</p>
              <p className="text-slate-400">
                Showtime: {new Date(showtime.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>FIFO Guarantee:</strong> When a customer cancels or an unpaid hold expires, our automated reallocation engine immediately reserves the seat and sends you a 15-minute exclusive claim link.
                </span>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentUser.fullName}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notification Email
                </label>
                <input
                  type="email"
                  readOnly
                  value={currentUser.email}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98"
              >
                <span>Join FIFO Waitlist Queue</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-4 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                Queue Position #{result.queuePosition}
              </span>
              <h3 className="text-xl font-black text-white mt-2">You're in Line!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                We'll automatically email <strong>{currentUser.email}</strong> with an exclusive 15-minute claim link the instant a seat opens.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
