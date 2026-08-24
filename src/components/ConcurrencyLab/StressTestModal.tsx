import React, { useState } from 'react';
import { ShowSeat, Showtime, User } from '../../types';
import { Zap, ShieldCheck, AlertOctagon, Play, X, Activity, CheckCircle2 } from 'lucide-react';

interface StressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  showtime: Showtime;
  availableSeats: ShowSeat[];
  onRunStressTest: (targetSeatId: string, concurrentThreads: number) => Promise<{
    winnerUserId: string;
    winnerName: string;
    totalAttempts: number;
    collisionsPrevented: number;
    executionTimeMs: number;
    auditLog: string[];
  }>;
}

export const StressTestModal: React.FC<StressTestModalProps> = ({
  isOpen,
  onClose,
  showtime,
  availableSeats,
  onRunStressTest,
}) => {
  const [targetSeatId, setTargetSeatId] = useState(availableSeats[0]?.seatId || '');
  const [threads, setThreads] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    winnerUserId: string;
    winnerName: string;
    totalAttempts: number;
    collisionsPrevented: number;
    executionTimeMs: number;
    auditLog: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!targetSeatId) return;
    setIsRunning(true);
    setTestResult(null);

    try {
      const res = await onRunStressTest(targetSeatId, threads);
      setTestResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Concurrency & Race Condition Lab</h3>
            <p className="text-xs text-slate-400">
              Fire simultaneous parallel threads at the same seat to prove zero double-booking
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Target Contested Seat
            </label>
            <select
              value={targetSeatId}
              onChange={(e) => setTargetSeatId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {availableSeats.map((s) => (
                <option key={s.seatId} value={s.seatId}>
                  Row {s.seat.row}, Seat {s.seat.number} ({s.seat.category} - {s.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Simultaneous Threads: <strong className="text-red-400">{threads} parallel requests</strong>
            </label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={threads}
              onChange={(e) => setThreads(Number(e.target.value))}
              className="w-full mt-2 accent-red-500 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning || !targetSeatId}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Simulating Microsecond Race Collision...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Parallel Stress Test</span>
            </>
          )}
        </button>

        {/* Results Stream */}
        {testResult && (
          <div className="mt-6 space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Scorecard */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Locks Won</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">Exactly 1</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Collisions Prevented</span>
                <p className="text-lg font-black text-red-400 mt-0.5">{testResult.collisionsPrevented}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Execution Latency</span>
                <p className="text-lg font-black text-indigo-300 mt-0.5">{testResult.executionTimeMs}ms</p>
              </div>
            </div>

            {/* Winner Banner */}
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Exclusive distributed lock granted to: <strong>{testResult.winnerName}</strong>
              </span>
            </div>

            {/* Terminal Audit Log */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-3 font-mono text-[11px] overflow-y-auto max-h-48 space-y-1 text-slate-300">
              {testResult.auditLog.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.includes('[LOCK GRANTED]')
                      ? 'text-emerald-400 font-bold'
                      : line.includes('[LOCK REJECTED]')
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
