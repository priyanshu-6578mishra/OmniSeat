import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface SeatHoldTimerProps {
  expiresAt: string | null;
  heldCount: number;
  totalCents: number;
  onCheckout: () => void;
  onRelease: () => void;
}

export const SeatHoldTimer: React.FC<SeatHoldTimerProps> = ({
  expiresAt,
  heldCount,
  totalCents,
  onCheckout,
  onRelease,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; totalSeconds: number }>({
    minutes: 10,
    seconds: 0,
    totalSeconds: 600,
  });

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, totalSeconds: 0 });
      } else {
        const totalSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setTimeLeft({ minutes, seconds, totalSeconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || heldCount === 0) return null;

  const isUrgent = timeLeft.totalSeconds < 120; // less than 2 minutes
  const isExpired = timeLeft.totalSeconds <= 0;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-2xl transition-all duration-300 ${
        isExpired
          ? 'bg-red-950/95 border-red-500/80 text-red-200'
          : isUrgent
          ? 'bg-amber-950/95 border-amber-500/80 text-amber-100 shadow-amber-500/20'
          : 'bg-slate-900/95 border-indigo-500/60 text-slate-100 shadow-indigo-500/20'
      } border-2 backdrop-blur-md rounded-2xl p-4 shadow-2xl`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Timer info */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isExpired
                ? 'bg-red-500 text-white'
                : isUrgent
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {isExpired ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Clock className={`w-6 h-6 ${isUrgent ? 'animate-spin' : ''}`} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                {isExpired ? 'Hold Lapsed' : 'Seat Hold Locked (10m TTL)'}
              </span>
              <span className="bg-slate-800 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {heldCount} Seat{heldCount > 1 ? 's' : ''} Held
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight">
                {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-sm font-semibold text-slate-300">
                &bull; ₹{(totalCents / 100).toFixed(2)} INR
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={onRelease}
            className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1"
            title="Release holds back to pool"
          >
            <X className="w-3.5 h-3.5" />
            <span>Abandon</span>
          </button>

          <button
            onClick={onCheckout}
            disabled={isExpired}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              isExpired
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : isUrgent
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30 font-black animate-bounce'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
            }`}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isExpired ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, (timeLeft.totalSeconds / 600) * 100))}%` }}
        />
      </div>
    </div>
  );
};
