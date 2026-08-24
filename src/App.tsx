/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  EventItem,
  Showtime,
  ShowSeat,
  Booking,
  WaitlistEntry,
  ConcurrencyLockEvent,
  SeatCategory,
} from './types';
import { concurrencyEngine } from './lib/concurrencyEngine';
import { MOCK_USERS, MOCK_VENUES } from './lib/mockData';
import { Navbar } from './components/Navbar';
import { EventList } from './components/Customer/EventList';
import { InteractiveSeatMap } from './components/SeatMap/InteractiveSeatMap';
import { SeatHoldTimer } from './components/SeatMap/SeatHoldTimer';
import { CheckoutModal } from './components/Customer/CheckoutModal';
import { MyBookingsModal } from './components/Customer/MyBookingsModal';
import { WaitlistModal } from './components/Customer/WaitlistModal';
import { ClaimOfferModal } from './components/Customer/ClaimOfferModal';
import { OrganiserDashboard } from './components/Organiser/OrganiserDashboard';
import { AdminStudio } from './components/Admin/AdminStudio';
import { TicketScanner } from './components/DoorStaff/TicketScanner';
import { StressTestModal } from './components/ConcurrencyLab/StressTestModal';
import { DocsViewer } from './components/Documentation/DocsViewer';
import {
  Calendar,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Bell,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  // Current session & active user (defaults to Customer: Alex Rivera)
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [activeTab, setActiveTab] = useState<'explore' | 'bookings' | 'organiser' | 'admin' | 'scanner' | 'docs' | 'lab'>('explore');

  // Events & Selected Showtime
  const [events, setEvents] = useState<EventItem[]>(() => concurrencyEngine.getEvents());
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>('');
  
  // Real-time seats for current showtime
  const [currentShowSeats, setCurrentShowSeats] = useState<ShowSeat[]>([]);
  const [isHoldingLock, setIsHoldingLock] = useState(false);

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isStressLabOpen, setIsStressLabOpen] = useState(false);
  const [waitlistModalCategory, setWaitlistModalCategory] = useState<SeatCategory | null>(null);
  const [activeClaimOffer, setActiveClaimOffer] = useState<WaitlistEntry | null>(null);

  // Real-time Event Stream / Toasts
  const [eventLogs, setEventLogs] = useState<ConcurrencyLockEvent[]>(() => concurrencyEngine.getEventLogs());
  const [latestToast, setLatestToast] = useState<ConcurrencyLockEvent | null>(null);

  // Refresh current seats whenever selectedShowtimeId or events change
  const refreshSeats = () => {
    if (selectedShowtimeId) {
      setCurrentShowSeats([...concurrencyEngine.getShowSeats(selectedShowtimeId)]);
    }
  };

  // Subscribe to real-time engine events (WebSockets / BroadcastChannel simulation)
  useEffect(() => {
    const unsubscribe = concurrencyEngine.subscribe((event) => {
      setEventLogs([...concurrencyEngine.getEventLogs()]);
      refreshSeats();
      setLatestToast(event);
      setTimeout(() => setLatestToast((prev) => (prev?.id === event.id ? null : prev)), 4000);
    });

    return () => unsubscribe();
  }, [selectedShowtimeId]);

  // If selecting an event, default to its first showtime
  useEffect(() => {
    if (selectedEvent && selectedEvent.showtimes.length > 0) {
      setSelectedShowtimeId(selectedEvent.showtimes[0].id);
    }
  }, [selectedEvent]);

  // Refresh seats on showtime change
  useEffect(() => {
    refreshSeats();
  }, [selectedShowtimeId]);

  // Compute active held seats by current user across the system
  const myHeldSeatsForShowtime = useMemo(() => {
    return currentShowSeats.filter(
      (s) => s.status === 'HELD' && s.heldByUserId === currentUser.id
    );
  }, [currentShowSeats, currentUser.id]);

  const activeHoldExpiresAt = useMemo(() => {
    if (myHeldSeatsForShowtime.length === 0) return null;
    return myHeldSeatsForShowtime[0].holdExpiresAt || null;
  }, [myHeldSeatsForShowtime]);

  // Held seats total calculation
  const currentShowtimeObj = useMemo(() => {
    return selectedEvent?.showtimes.find((s) => s.id === selectedShowtimeId) || selectedEvent?.showtimes[0];
  }, [selectedEvent, selectedShowtimeId]);

  const heldTotalCents = useMemo(() => {
    if (!currentShowtimeObj) return 0;
    return myHeldSeatsForShowtime.reduce((sum, seat) => {
      const p = currentShowtimeObj.seatPricings.find((pr) => pr.category === seat.seat.category);
      return sum + (p?.priceCents || 10000);
    }, 0);
  }, [myHeldSeatsForShowtime, currentShowtimeObj]);

  // Unread waitlist offers for current user
  const userOffers = useMemo(() => {
    return concurrencyEngine.getUserWaitlists(currentUser.id).filter((w) => w.status === 'OFFERED');
  }, [currentUser.id, eventLogs]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleHoldSeats = async (seatIds: string[]) => {
    if (!selectedShowtimeId) return;
    setIsHoldingLock(true);
    try {
      const res = await concurrencyEngine.holdSeats({
        showtimeId: selectedShowtimeId,
        seatIds,
        user: currentUser,
      });

      if (res.success) {
        refreshSeats();
      } else {
        alert(res.error || 'Failed to hold selected seats');
      }
    } finally {
      setIsHoldingLock(false);
    }
  };

  const handleReleaseHolds = () => {
    if (!selectedShowtimeId || myHeldSeatsForShowtime.length === 0) return;
    concurrencyEngine.releaseHolds({
      showtimeId: selectedShowtimeId,
      seatIds: myHeldSeatsForShowtime.map((s) => s.seatId),
      userId: currentUser.id,
    });
    refreshSeats();
  };

  const handleCommitBooking = async (paymentIntentId: string) => {
    if (!selectedShowtimeId) return { success: false, error: 'No active showtime' };
    const res = await concurrencyEngine.commitBooking({
      showtimeId: selectedShowtimeId,
      seatIds: myHeldSeatsForShowtime.map((s) => s.seatId),
      user: currentUser,
      paymentIntentId,
    });
    refreshSeats();
    return res;
  };

  const handleCancelBooking = async (bookingId: string) => {
    const res = await concurrencyEngine.cancelBooking(bookingId, currentUser.id);
    refreshSeats();
    return res;
  };

  const handleJoinWaitlist = (category: SeatCategory) => {
    if (!selectedEvent || !selectedShowtimeId) {
      return { success: false, error: 'No event or showtime selected' };
    }
    return concurrencyEngine.joinWaitlist({
      eventId: selectedEvent.id,
      showtimeId: selectedShowtimeId,
      user: currentUser,
      category,
    });
  };

  const handleClaimOffer = async (claimToken: string) => {
    const res = await concurrencyEngine.claimWaitlistOffer(claimToken, currentUser);
    refreshSeats();
    return res;
  };

  const handleRunStressTest = async (targetSeatId: string, concurrentThreads: number) => {
    const showId = selectedShowtimeId || events[0].showtimes[0].id;
    return await concurrencyEngine.runConcurrencyStressTest({
      showtimeId: showId,
      targetSeatId,
      concurrentThreads,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeHeldSeatsCount={myHeldSeatsForShowtime.length}
        onOpenHeldCart={() => setIsCheckoutOpen(true)}
        onOpenStressLab={() => setIsStressLabOpen(true)}
        unreadOffersCount={userOffers.length}
        onOpenOffers={() => {
          if (userOffers.length > 0) {
            setActiveClaimOffer(userOffers[0]);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Explore Events Tab */}
        {activeTab === 'explore' && (
          <div>
            {!selectedEvent ? (
              <EventList
                events={events}
                onSelectEvent={(evt, showId) => {
                  setSelectedEvent(evt);
                  if (showId) setSelectedShowtimeId(showId);
                }}
              />
            ) : (
              /* Event Detail & Interactive Seat Map View */
              <div className="space-y-6 animate-in fade-in">
                {/* Back to Events */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to All Events</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Select Date & Time:</span>
                    <div className="flex items-center gap-1.5">
                      {selectedEvent.showtimes.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setSelectedShowtimeId(st.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedShowtimeId === st.id
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {new Date(st.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                          {new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Seat Map */}
                {currentShowtimeObj && (
                  <InteractiveSeatMap
                    event={selectedEvent}
                    showtime={currentShowtimeObj}
                    seats={currentShowSeats}
                    currentUser={currentUser}
                    onHoldSeats={handleHoldSeats}
                    onJoinWaitlist={(cat) => setWaitlistModalCategory(cat)}
                    isHolding={isHoldingLock}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* My Ticket Wallet Tab */}
        {activeTab === 'bookings' && (
          <MyBookingsModal
            bookings={concurrencyEngine.getUserBookings(currentUser.id)}
            currentUser={currentUser}
            onCancelBooking={handleCancelBooking}
          />
        )}

        {/* Organiser Hub Tab */}
        {activeTab === 'organiser' && (
          <OrganiserDashboard
            events={events}
            analytics={concurrencyEngine.getOrganiserAnalytics(selectedEvent?.id || events[0].id)}
            selectedEventId={selectedEvent?.id || events[0].id}
            onSelectEvent={(id) => {
              const e = events.find((item) => item.id === id);
              if (e) setSelectedEvent(e);
            }}
            onCreateEvent={(newEventData, showtimesCount) => {
              const created = concurrencyEngine.createEvent(newEventData, showtimesCount);
              setEvents([...concurrencyEngine.getEvents()]);
              setSelectedEvent(created);
            }}
            currentUser={currentUser}
          />
        )}

        {/* Admin Studio Tab */}
        {activeTab === 'admin' && (
          <AdminStudio
            currentUser={currentUser}
            venues={MOCK_VENUES}
            eventLogs={eventLogs}
            onTriggerAutoReleaseTest={() => {
              // Trigger heartbeats
              refreshSeats();
            }}
          />
        )}

        {/* Door Scanner Tab */}
        {activeTab === 'scanner' && (
          <TicketScanner
            currentUser={currentUser}
            allBookings={concurrencyEngine.getAllBookings()}
            onVerifyPayload={(rawJson) => concurrencyEngine.verifyTicketToken(rawJson, currentUser)}
          />
        )}

        {/* Docs & Specs Tab */}
        {activeTab === 'docs' && <DocsViewer />}
      </main>

      {/* Persistent 10-Minute Hold TTL Countdown Bar */}
      <SeatHoldTimer
        expiresAt={activeHoldExpiresAt}
        heldCount={myHeldSeatsForShowtime.length}
        totalCents={heldTotalCents}
        onCheckout={() => setIsCheckoutOpen(true)}
        onRelease={handleReleaseHolds}
      />

      {/* Checkout Modal */}
      {selectedEvent && currentShowtimeObj && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          event={selectedEvent}
          showtime={currentShowtimeObj}
          heldSeats={myHeldSeatsForShowtime}
          currentUser={currentUser}
          onConfirmBooking={handleCommitBooking}
          onViewBooking={() => {
            setActiveTab('bookings');
            setIsCheckoutOpen(false);
          }}
        />
      )}

      {/* Waitlist Modal */}
      {selectedEvent && currentShowtimeObj && waitlistModalCategory && (
        <WaitlistModal
          isOpen={!!waitlistModalCategory}
          onClose={() => setWaitlistModalCategory(null)}
          event={selectedEvent}
          showtime={currentShowtimeObj}
          category={waitlistModalCategory}
          currentUser={currentUser}
          onJoinWaitlist={handleJoinWaitlist}
        />
      )}

      {/* Claim Time-Limited Offer Modal */}
      {activeClaimOffer && (
        <ClaimOfferModal
          isOpen={!!activeClaimOffer}
          onClose={() => setActiveClaimOffer(null)}
          offer={activeClaimOffer}
          currentUser={currentUser}
          onClaimOffer={handleClaimOffer}
          onViewBooking={() => {
            setActiveTab('bookings');
            setActiveClaimOffer(null);
          }}
        />
      )}

      {/* Concurrency Stress Test Lab Modal */}
      {currentShowtimeObj && (
        <StressTestModal
          isOpen={isStressLabOpen}
          onClose={() => setIsStressLabOpen(false)}
          showtime={currentShowtimeObj}
          availableSeats={currentShowSeats}
          onRunStressTest={handleRunStressTest}
        />
      )}

      {/* Floating Concurrency Live Toast Indicator */}
      {latestToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm p-3.5 bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-indigo-400">
              Live Concurrency Bus &bull; {latestToast.type}
            </span>
            <p className="text-xs text-slate-200 mt-0.5 leading-snug">{latestToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
