import React, { useState, useMemo } from 'react';
import { EventItem, EventType } from '../../types';
import {
  Calendar,
  MapPin,
  Clock,
  Search,
  Sparkles,
  Ticket,
  Music,
  Film,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface EventListProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem, showtimeId?: string) => void;
}

export const EventList: React.FC<EventListProps> = ({ events, onSelectEvent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EventType | 'ALL'>('ALL');

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.artistOrCast && e.artistOrCast.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'ALL' || e.eventType === selectedType;

      return matchesSearch && matchesType;
    });
  }, [events, searchQuery, selectedType]);

  const featuredEvent = events[0];

  return (
    <div className="space-y-10">
      {/* Hero Showcase Banner */}
      {featuredEvent && (
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10" />
          <img
            src={featuredEvent.bannerUrl || featuredEvent.posterUrl}
            alt={featuredEvent.title}
            className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-40"
          />

          <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10 max-w-3xl">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <Flame className="w-3.5 h-3.5" /> Flash-Sale High Concurrency
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-2.5 py-1 rounded-full">
                {featuredEvent.eventType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2">
              {featuredEvent.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 mb-6 font-normal max-w-2xl">
              {featuredEvent.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mb-6">
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>{featuredEvent.venue.name}, {featuredEvent.venue.city}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>{featuredEvent.durationMins} mins</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Double-Booking Guarantee</span>
              </div>
            </div>

            <div>
              <button
                onClick={() => onSelectEvent(featuredEvent)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-black text-sm shadow-xl shadow-indigo-500/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <Ticket className="w-4 h-4" />
                <span>Select Showtime & Choose Seats</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by artist, movie, or venue..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['ALL', 'CONCERT', 'MOVIE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedType === type
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {type === 'CONCERT' && <Music className="w-3.5 h-3.5" />}
              {type === 'MOVIE' && <Film className="w-3.5 h-3.5" />}
              {type === 'ALL' && <Sparkles className="w-3.5 h-3.5" />}
              <span>{type === 'ALL' ? 'All Live Events' : `${type}S`}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((evt) => {
          const startingPrice = Math.min(...evt.showtimes.flatMap((s) => s.seatPricings.map((p) => p.priceCents)));

          return (
            <div
              key={evt.id}
              className="group bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Poster Image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={evt.posterUrl}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700/60 uppercase">
                      {evt.eventType}
                    </span>
                    {evt.ageRating && (
                      <span className="bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                        {evt.ageRating}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                    <span className="bg-slate-950/90 px-2.5 py-1 rounded-md font-bold text-emerald-400 border border-emerald-500/30">
                      From ₹{(startingPrice / 100).toFixed(2)}
                    </span>
                    <span className="bg-slate-950/90 px-2.5 py-1 rounded-md text-slate-300 font-mono">
                      {evt.showtimes.length} Showtime{evt.showtimes.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-normal line-clamp-2 mb-4">
                    {evt.description}
                  </p>

                  <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 mb-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{evt.venue.name} &bull; {evt.venue.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span>Next: {new Date(evt.showtimes[0]?.startTime || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => onSelectEvent(evt)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all group-hover:shadow-indigo-500/40"
                >
                  <span>View Seat Map & Book</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
