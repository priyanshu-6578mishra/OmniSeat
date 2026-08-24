import React, { useState } from 'react';
import { Venue, User, ConcurrencyLockEvent } from '../../types';
import { MOCK_VENUES } from '../../lib/mockData';
import {
  ShieldCheck,
  Building2,
  Server,
  Activity,
  Terminal,
  Grid,
  Zap,
  Lock,
  Layers,
  Database,
  RefreshCw,
} from 'lucide-react';

interface AdminStudioProps {
  currentUser: User;
  venues: Venue[];
  eventLogs: ConcurrencyLockEvent[];
  onTriggerAutoReleaseTest: () => void;
}

export const AdminStudio: React.FC<AdminStudioProps> = ({
  currentUser,
  venues,
  eventLogs,
  onTriggerAutoReleaseTest,
}) => {
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id || MOCK_VENUES[0].id);
  const currentVenue = venues.find((v) => v.id === selectedVenueId) || MOCK_VENUES[0];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-white">System Admin & Venue Studio</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure venue geometry, inspect distributed mutexes & review system audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onTriggerAutoReleaseTest}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Trigger Heartbeat TTL Check</span>
          </button>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Concurrency Engine</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-emerald-400">ACTIVE &bull; 0 Collisions</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Row-Level \`SELECT FOR UPDATE\` & Redlock
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Hold TTL Worker</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-amber-300">10m Auto-Release</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cascading Waitlist FIFO: 15m Window
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Tamper-Proof QR</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-purple-300">HMAC-SHA256</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Offline Door Validation Ready
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Venue Layout Inspector & Live Concurrency Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Venue Configuration */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Venue Layout & Geometry</span>
            </h3>

            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white px-3 py-1.5"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Venue Name:</span>
              <span className="font-bold text-white">{currentVenue.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Location:</span>
              <span className="text-slate-200">{currentVenue.address}, {currentVenue.city}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Grid Dimensions:</span>
              <span className="font-mono text-indigo-300 font-bold">{currentVenue.rows} Rows &times; {currentVenue.cols} Columns</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Total Seating Capacity:</span>
              <span className="font-bold text-emerald-400">{currentVenue.totalCapacity} Seats</span>
            </div>
          </div>

          {/* Mini Visual Grid Blueprint */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Venue Blueprint Matrix
            </span>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col items-center">
              <div className="w-3/4 h-2 bg-indigo-500/40 rounded-full mb-4 text-center text-[9px] uppercase tracking-widest text-indigo-300 font-bold">
                Front Stage / Screen
              </div>

              <div className="space-y-1">
                {Array.from({ length: currentVenue.rows }).map((_, r) => (
                  <div key={r} className="flex gap-1">
                    {Array.from({ length: currentVenue.cols }).map((_, c) => {
                      const isVIP = r < 2;
                      const isPrem = r >= 2 && r < 5;
                      return (
                        <div
                          key={c}
                          className={`w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-mono ${
                            isVIP
                              ? 'bg-purple-900 border border-purple-500'
                              : isPrem
                              ? 'bg-blue-900 border border-blue-500'
                              : 'bg-emerald-900 border border-emerald-500'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Concurrency Event Stream */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Concurrency Event Bus</span>
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              Live Pub-Sub Stream
            </span>
          </div>

          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 p-4 font-mono text-xs overflow-y-auto max-h-[420px] space-y-2.5">
            {eventLogs.length === 0 ? (
              <p className="text-slate-600 text-center py-10">Listening for atomic lock events...</p>
            ) : (
              eventLogs.map((log) => {
                let badgeColor = 'text-slate-400';
                if (log.type === 'SEAT_HELD') badgeColor = 'text-amber-400';
                if (log.type === 'BOOKING_COMMITTED') badgeColor = 'text-emerald-400';
                if (log.type === 'COLLISION_PREVENTED') badgeColor = 'text-red-400 font-bold';
                if (log.type === 'WAITLIST_OFFER_DISPATCHED') badgeColor = 'text-purple-400';
                if (log.type === 'HOLD_EXPIRED') badgeColor = 'text-orange-400';

                return (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                      <span className={badgeColor}>[{log.type}]</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-200">{log.message}</p>
                    {log.latencyMs && (
                      <span className="text-[10px] text-slate-500">
                        Lock transaction resolved in {log.latencyMs}ms
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
