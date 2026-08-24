import React, { useState, useMemo } from 'react';
import {
  ShowSeat,
  SeatCategory,
  EventItem,
  Showtime,
  User,
  SeatStatus,
} from '../../types';
import {
  Lock,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface InteractiveSeatMapProps {
  event: EventItem;
  showtime: Showtime;
  seats: ShowSeat[];
  currentUser: User;
  onHoldSeats: (seatIds: string[]) => Promise<void>;
  onJoinWaitlist: (category: SeatCategory) => void;
  isHolding: boolean;
}

export const InteractiveSeatMap: React.FC<InteractiveSeatMapProps> = ({
  event,
  showtime,
  seats,
  currentUser,
  onHoldSeats,
  onJoinWaitlist,
  isHolding,
}) => {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<ShowSeat | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<SeatCategory | 'ALL'>('ALL');

  // Group seats by row
  const rows = useMemo(() => {
    const rowMap = new Map<string, ShowSeat[]>();
    for (const seat of seats) {
      const r = seat.seat.row;
      if (!rowMap.has(r)) rowMap.set(r, []);
      rowMap.get(r)!.push(seat);
    }
    // Sort rows alphabetically and seats by number
    const sorted = Array.from(rowMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sorted.forEach(([, list]) => list.sort((a, b) => a.seat.number - b.seat.number));
    return sorted;
  }, [seats]);

  // Category counts and availability metrics
  const categoryStats = useMemo(() => {
    const stats: Record<SeatCategory, { total: number; available: number; priceCents: number }> = {
      VIP: { total: 0, available: 0, priceCents: 0 },
      PREMIUM: { total: 0, available: 0, priceCents: 0 },
      STANDARD: { total: 0, available: 0, priceCents: 0 },
      ACCESSIBLE: { total: 0, available: 0, priceCents: 0 },
    };

    for (const p of showtime.seatPricings) {
      stats[p.category].priceCents = p.priceCents;
    }

    for (const s of seats) {
      const cat = s.seat.category;
      stats[cat].total += 1;
      if (s.status === 'AVAILABLE') {
        stats[cat].available += 1;
      }
    }

    return stats;
  }, [seats, showtime]);

  // Subtotal for selected seats
  const selectedSubtotalCents = useMemo(() => {
    return selectedSeatIds.reduce((sum, seatId) => {
      const s = seats.find((seat) => seat.seatId === seatId);
      if (!s) return sum;
      const p = showtime.seatPricings.find((pr) => pr.category === s.seat.category);
      return sum + (p?.priceCents || 0);
    }, 0);
  }, [selectedSeatIds, seats, showtime]);

  const handleSeatClick = (seat: ShowSeat) => {
    // If seat is currently held by this user, or available, toggle selection
    const isHeldByMe = seat.status === 'HELD' && seat.heldByUserId === currentUser.id;
    const isOfferedToMe = seat.status === 'OFFERED' && seat.heldByUserId === currentUser.id;

    if (seat.status !== 'AVAILABLE' && !isHeldByMe && !isOfferedToMe) {
      return;
    }

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.seatId)) {
        return prev.filter((id) => id !== seat.seatId);
      } else {
        // Max 6 seats per transaction
        if (prev.length >= 6) {
          return prev;
        }
        return [...prev, seat.seatId];
      }
    });
  };

  const getSeatColorClass = (seat: ShowSeat) => {
    const isSelected = selectedSeatIds.includes(seat.seatId);
    const isHeldByMe = seat.status === 'HELD' && seat.heldByUserId === currentUser.id;
    const isOfferedToMe = seat.status === 'OFFERED' && seat.heldByUserId === currentUser.id;

    if (isSelected) {
      return 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-300 shadow-lg shadow-cyan-500/50 font-bold scale-110 z-10';
    }
    if (isHeldByMe) {
      return 'bg-amber-400 text-slate-950 ring-2 ring-amber-200 shadow-md font-bold';
    }
    if (isOfferedToMe) {
      return 'bg-purple-500 text-white ring-2 ring-purple-300 shadow-md font-bold animate-pulse';
    }

    switch (seat.status) {
      case 'AVAILABLE':
        switch (seat.seat.category) {
          case 'VIP':
            return 'bg-purple-900/80 border-2 border-purple-400 text-purple-200 hover:bg-purple-600 hover:text-white hover:scale-110';
          case 'PREMIUM':
            return 'bg-blue-900/80 border-2 border-blue-400 text-blue-200 hover:bg-blue-600 hover:text-white hover:scale-110';
          case 'ACCESSIBLE':
            return 'bg-teal-900/80 border-2 border-teal-400 text-teal-200 hover:bg-teal-600 hover:text-white hover:scale-110';
          default:
            return 'bg-emerald-900/80 border-2 border-emerald-400 text-emerald-200 hover:bg-emerald-600 hover:text-white hover:scale-110';
        }
      case 'HELD':
        return 'bg-amber-950/80 border-2 border-amber-600 text-amber-400/80 cursor-not-allowed opacity-80';
      case 'BOOKED':
        return 'bg-rose-950/50 border border-rose-800/40 text-rose-500/40 cursor-not-allowed';
      case 'OFFERED':
        return 'bg-indigo-950/80 border-2 border-indigo-500 text-indigo-400 cursor-not-allowed';
      default:
        return 'bg-slate-800 text-slate-500 cursor-not-allowed';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl backdrop-blur-xl">
      {/* Top Bar: Event & Showtime Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {event.eventType}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(showtime.startTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })} &bull; {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">{event.title}</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Venue: <strong className="text-slate-200">{event.venue.name}</strong> ({event.venue.city}, {event.venue.country})
          </p>
        </div>

        {/* Category Filter Pills & Sold Out Waitlist triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'VIP', 'PREMIUM', 'STANDARD', 'ACCESSIBLE'] as const).map((cat) => {
            const isAll = cat === 'ALL';
            const available = isAll ? 0 : categoryStats[cat]?.available ?? 0;
            const price = isAll ? null : categoryStats[cat]?.priceCents;
            const isSoldOut = !isAll && available === 0;

            return (
              <div key={cat} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ₹{
                    selectedCategoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                  }`}
                >
                  <span>{cat}</span>
                  {!isAll && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ₹{isSoldOut ? 'bg-red-900/60 text-red-300' : 'bg-slate-700 text-slate-200'}`}>
                      {isSoldOut ? 'Sold Out' : `₹{available} left`}
                    </span>
                  )}
                  {price && <span className="text-[10px] text-slate-400">₹{(price / 100).toFixed(0)}</span>}
                </button>

                {isSoldOut && (
                  <button
                    onClick={() => onJoinWaitlist(cat as SeatCategory)}
                    className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    title={`Join ₹{cat} Waitlist`}
                  >
                    <span>Waitlist</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage / Cinema Screen Curve Graphic */}
      <div className="my-8 flex flex-col items-center">
        <div className="relative w-full max-w-2xl text-center">
          {/* Curved SVG screen */}
          <svg className="w-full h-12 text-indigo-500" viewBox="0 0 500 40" fill="none">
            <path
              d="M 20 30 Q 250 5 480 30"
              stroke="url(#screenGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id="screenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-[11px] uppercase tracking-widest font-extrabold text-indigo-300 -mt-2">
            {event.eventType === 'MOVIE' ? '⚡ Laser IMAX Screen (70mm 15-Perf) ⚡' : '🎸 Center Stage & Catwalk 🎸'}
          </div>
        </div>
      </div>

      {/* Seat Map Visual Grid */}
      <div className="overflow-x-auto pb-6 pt-2 flex flex-col items-center">
        <div className="inline-block min-w-max p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
          <div className="space-y-2.5">
            {rows.map(([rowLabel, rowSeats]) => (
              <div key={rowLabel} className="flex items-center gap-3">
                {/* Row Label Left */}
                <div className="w-6 text-center text-xs font-black text-slate-400 font-mono">
                  {rowLabel}
                </div>

                {/* Seats in this row */}
                <div className="flex items-center gap-2">
                  {rowSeats.map((seat) => {
                    const isFilteredOut =
                      selectedCategoryFilter !== 'ALL' && seat.seat.category !== selectedCategoryFilter;
                    const isSelected = selectedSeatIds.includes(seat.seatId);
                    const isHeldByMe = seat.status === 'HELD' && seat.heldByUserId === currentUser.id;
                    const isOfferedToMe = seat.status === 'OFFERED' && seat.heldByUserId === currentUser.id;

                    return (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        onMouseEnter={() => setHoveredSeat(seat)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        disabled={seat.status !== 'AVAILABLE' && !isHeldByMe && !isOfferedToMe}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono transition-all duration-150 relative select-none ₹{
                          isFilteredOut ? 'opacity-20' : ''
                        } ₹{getSeatColorClass(seat)}`}
                      >
                        <span>{seat.seat.number}</span>

                        {seat.status === 'HELD' && !isHeldByMe && (
                          <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-amber-400" />
                        )}

                        {seat.status === 'OFFERED' && (
                          <Sparkles className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-purple-300" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Row Label Right */}
                <div className="w-6 text-center text-xs font-black text-slate-400 font-mono">
                  {rowLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seat Hover Tooltip Bar */}
      <div className="min-h-[44px] flex items-center justify-center text-center">
        {hoveredSeat ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-200 shadow-md">
            <span className="font-bold text-indigo-400">
              Row {hoveredSeat.seat.row}, Seat {hoveredSeat.seat.number}
            </span>
            <span>&bull;</span>
            <span className="uppercase font-semibold text-slate-300">{hoveredSeat.seat.category}</span>
            <span>&bull;</span>
            <span className="font-bold text-emerald-400">
              ₹
              {(
                (showtime.seatPricings.find((p) => p.category === hoveredSeat.seat.category)?.priceCents || 0) /
                100
              ).toFixed(2)}
            </span>
            <span>&bull;</span>
            <span
              className={`font-semibold ₹{
                hoveredSeat.status === 'AVAILABLE'
                  ? 'text-emerald-400'
                  : hoveredSeat.status === 'HELD'
                  ? 'text-amber-400'
                  : hoveredSeat.status === 'BOOKED'
                  ? 'text-rose-400'
                  : 'text-purple-400'
              }`}
            >
              {hoveredSeat.status === 'HELD'
                ? `HELD by ₹{hoveredSeat.heldByUserName || 'Customer'}`
                : hoveredSeat.status}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Click on any available seat to select up to 6 seats. Real-time distributed locks prevent double-booking.
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-emerald-900 border-2 border-emerald-400" />
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-cyan-500 ring-2 ring-cyan-300" />
          <span className="text-slate-300">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-950 border-2 border-amber-500" />
          <span className="text-slate-300">Held (10m TTL Lock)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-rose-950 border border-rose-800" />
          <span className="text-slate-300">Booked / Sold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-purple-950 border-2 border-purple-400" />
          <span className="text-slate-300">Waitlist Offered</span>
        </div>
      </div>

      {/* Bottom Sticky Action Bar: Multi-seat Selection Summary */}
      {selectedSeatIds.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-300 uppercase font-extrabold tracking-wider">
                Selection Summary
              </span>
              <span className="text-xs bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full font-bold">
                {selectedSeatIds.length} seat{selectedSeatIds.length > 1 ? 's' : ''} chosen
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                ₹{(selectedSubtotalCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-medium">INR + taxes</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSelectedSeatIds([])}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
            >
              Clear
            </button>

            <button
              onClick={async () => {
                await onHoldSeats(selectedSeatIds);
                setSelectedSeatIds([]);
              }}
              disabled={isHolding}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isHolding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Acquiring Distributed Lock...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Lock & Hold Seats (10m TTL)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
