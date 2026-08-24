import React, { useState } from 'react';
import { EventItem, OrganiserAnalytics, User, Venue, EventType } from '../../types';
import {
  DollarSign,
  Users,
  TrendingUp,
  Ticket,
  PlusCircle,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';
import { MOCK_VENUES } from '../../lib/mockData';

interface OrganiserDashboardProps {
  events: EventItem[];
  analytics: OrganiserAnalytics;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: (newEvent: Partial<EventItem>, showtimesCount: number) => void;
  currentUser: User;
}

export const OrganiserDashboard: React.FC<OrganiserDashboardProps> = ({
  events,
  analytics,
  selectedEventId,
  onSelectEvent,
  onCreateEvent,
  currentUser,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('CONCERT');
  const [newEventVenueId, setNewEventVenueId] = useState(MOCK_VENUES[0].id);
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDuration, setNewEventDuration] = useState(150);
  const [newShowtimesCount, setNewShowtimesCount] = useState(2);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    onCreateEvent(
      {
        title: newEventTitle,
        eventType: newEventType,
        venueId: newEventVenueId,
        description: newEventDesc,
        durationMins: Number(newEventDuration),
        organiserId: currentUser.id,
        organiserName: currentUser.fullName,
      },
      newShowtimesCount
    );

    setShowCreateModal(false);
    setNewEventTitle('');
    setNewEventDesc('');
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-white">Organiser Command Center</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time revenue metrics, seat occupancy rates & waitlist telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Event Selector */}
          <select
            value={selectedEventId}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              ₹{(analytics.grossRevenueCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Transaction Ledger
            </p>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Occupancy Rate</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{analytics.occupancyRate}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${analytics.occupancyRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tickets Sold */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tickets Sold</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {analytics.totalSeatsSold} <span className="text-xs text-slate-500 font-normal">/ {analytics.totalCapacity}</span>
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {analytics.totalSeatsHeld} currently locked in 10m TTL
            </p>
          </div>
        </div>

        {/* Waitlist Demand */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Waitlist Depth</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-300">
              {analytics.waitlistDepth.reduce((sum, w) => sum + w.count, 0)} fans in line
            </span>
            <p className="text-[11px] text-amber-400/80 mt-0.5">
              Automated FIFO Cascade Enabled
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Tier Breakdown & Real-Time Sales Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Tier Breakdown */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Category Tier Performance & Pricing</span>
          </h3>

          <div className="space-y-4">
            {analytics.tierBreakdown.map((tier) => {
              const percent = tier.total > 0 ? Math.round((tier.sold / tier.total) * 100) : 0;

              return (
                <div key={tier.category} className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-xs text-white uppercase">{tier.category}</span>
                      <span className="text-slate-400 text-xs ml-2">({(tier.priceCents / 100).toFixed(2)})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        ₹{(tier.revenueCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        ({tier.sold}/{tier.total} sold)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent > 80 ? 'bg-emerald-500' : percent > 40 ? 'bg-indigo-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Waitlist Queue & Recent Sales */}
        <div className="lg:col-span-5 space-y-6">
          {/* Waitlist Queue Overview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Waitlist Queue by Category</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {analytics.waitlistDepth.map((w) => (
                <div key={w.category} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{w.category}</span>
                  <p className="text-lg font-black text-amber-300 mt-1">{w.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Confirmed Sales */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Recent Ticket Sales</span>
            </h3>

            <div className="space-y-2">
              {analytics.recentSales.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">No sales recorded yet.</p>
              ) : (
                analytics.recentSales.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-200">{s.userName}</span>
                      <span className="text-slate-500 text-[10px] block">{s.time} &bull; {s.seats} seat(s)</span>
                    </div>
                    <span className="font-bold text-emerald-400">+₹{(s.amountCents / 100).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Create New Event Listing</h3>
                <p className="text-xs text-slate-400">Add showtimes and initialize real-time seat inventory</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bruno Mars: Live in Las Vegas"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Event Type
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as EventType)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CONCERT">CONCERT</option>
                    <option value="MOVIE">MOVIE (IMAX)</option>
                    <option value="THEATRE">THEATRE</option>
                    <option value="SPORTS">SPORTS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Venue
                  </label>
                  <select
                    value={newEventVenueId}
                    onChange={(e) => setNewEventVenueId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {MOCK_VENUES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.totalCapacity} cap)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed event description, VIP inclusions..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={newEventDuration}
                    onChange={(e) => setNewEventDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Initial Showtimes Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newShowtimesCount}
                    onChange={(e) => setNewShowtimesCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <span>Publish Event & Allocate Seats</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
