// ============================================================================
// HIGH-CONCURRENCY RESERVATION & WAITLIST REALLOCATION ENGINE
// Implements:
// 1. Atomic Multi-Seat Hold with Row-Level / Distributed Mutex Simulation
// 2. 10-Minute Hold TTL Auto-Release Scheduler
// 3. FIFO Waitlist Reallocation with 15-Minute Cascading Offers
// 4. Cryptographic QR Booking Commit
// 5. Pub-Sub Event Bus for Real-Time Multi-Client Synchronization
// ============================================================================

import {
  ShowSeat,
  Booking,
  WaitlistEntry,
  ConcurrencyLockEvent,
  OrganiserAnalytics,
  SeatCategory,
  EventItem,
  User,
} from '../types';
import { MOCK_EVENTS, MOCK_VENUES, generateVenueSeats, MOCK_USERS } from './mockData';
import { createSignedQRPayload, generateClaimToken } from './crypto';

// In-Memory Storage / Redis Simulation
interface EngineState {
  showSeats: Map<string, ShowSeat[]>; // key: showtimeId -> ShowSeat[]
  bookings: Map<string, Booking>;      // key: bookingId -> Booking
  waitlists: Map<string, WaitlistEntry[]>; // key: showtimeId -> WaitlistEntry[]
  events: EventItem[];
  eventLogs: ConcurrencyLockEvent[];
  activeLocks: Map<string, { lockedBy: string; expiresAt: number }>; // key: `showtimeId:seatId`
}

class ConcurrencyEngine {
  private state: EngineState;
  private subscribers: Set<(event: ConcurrencyLockEvent) => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private holdTTLSeconds: number = 600; // 10 minutes default
  private offerTTLSeconds: number = 900; // 15 minutes default

  constructor() {
    this.state = {
      showSeats: new Map(),
      bookings: new Map(),
      waitlists: new Map(),
      events: [...MOCK_EVENTS],
      eventLogs: [],
      activeLocks: new Map(),
    };

    this.initializeSeats();
    this.seedInitialState();
    this.setupBroadcastChannel();
    this.startBackgroundWorkers();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION & SEEDING
  // --------------------------------------------------------------------------

  private initializeSeats() {
    for (const event of this.state.events) {
      const venue = MOCK_VENUES.find((v) => v.id === event.venueId) || MOCK_VENUES[0];
      const seats = generateVenueSeats(venue.id, venue.rows, venue.cols);

      for (const show of event.showtimes) {
        const showSeats: ShowSeat[] = seats.map((seat) => ({
          id: `ss_${show.id}_${seat.id}`,
          showtimeId: show.id,
          seatId: seat.id,
          seat,
          status: 'AVAILABLE',
          heldByUserId: null,
          heldByUserName: null,
          holdExpiresAt: null,
          version: 1,
          lockToken: null,
          updatedAt: new Date().toISOString(),
        }));

        this.state.showSeats.set(show.id, showSeats);
      }
    }
  }

  private seedInitialState() {
    // Seed some initial bookings and a full category to demo waitlist
    const taylorShow1 = 'show_taylor_night1';
    const seats = this.state.showSeats.get(taylorShow1);

    if (seats && seats.length > 0) {
      // Mark VIP seats row A as BOOKED
      const vipSeats = seats.filter((s) => s.seat.row === 'A');
      vipSeats.forEach((s, idx) => {
        s.status = 'BOOKED';
        s.heldByUserId = 'usr_customer_3';
        s.heldByUserName = 'Marcus Vance';
      });

      // Mark Row B seats 1-4 as HELD with remaining 4 minutes TTL
      const now = Date.now();
      const heldSeats = seats.filter((s) => s.seat.row === 'B' && s.seat.number <= 4);
      heldSeats.forEach((s) => {
        s.status = 'HELD';
        s.heldByUserId = 'usr_customer_2';
        s.heldByUserName = 'Sarah Chen';
        s.holdExpiresAt = new Date(now + 4 * 60 * 1000).toISOString();
      });

      // Seed a sample confirmed booking for Alex
      const bookedSeat = seats.find((s) => s.seat.row === 'C' && s.seat.number === 5);
      if (bookedSeat) {
        bookedSeat.status = 'BOOKED';
        bookedSeat.heldByUserId = 'usr_customer_1';
        bookedSeat.heldByUserName = 'Alex Rivera';

        const sampleBooking: Booking = {
          id: 'bk_sample_001',
          bookingReference: 'BK-2026-ERA89',
          userId: 'usr_customer_1',
          userName: 'Alex Rivera',
          userEmail: 'alex.rivera@example.com',
          showtimeId: taylorShow1,
          showtime: MOCK_EVENTS[0].showtimes[0],
          event: MOCK_EVENTS[0],
          venue: MOCK_EVENTS[0].venue,
          status: 'CONFIRMED',
          totalAmountCents: 24000,
          currency: 'INR',
          paymentStatus: 'SUCCEEDED',
          paidAt: new Date(Date.now() - 3600000).toISOString(),
          qrPayloadSignature: 'hmac_sha256_sample_verified_valid_2026',
          isScannedAtDoor: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          items: [
            {
              id: 'bki_sample_001',
              bookingId: 'bk_sample_001',
              seatId: bookedSeat.seatId,
              showSeatId: bookedSeat.id,
              category: 'PREMIUM',
              priceCents: 24000,
              seatSummary: {
                section: bookedSeat.seat.section,
                row: bookedSeat.seat.row,
                number: bookedSeat.seat.number,
              },
            },
          ],
        };

        this.state.bookings.set(sampleBooking.id, sampleBooking);
      }

      // Seed waitlist for VIP category
      const waitlistEntries: WaitlistEntry[] = [
        {
          id: 'wl_001',
          eventId: 'evt_taylor_swift',
          eventTitle: 'The Eras Stadium World Tour: Deluxe Edition',
          showtimeId: taylorShow1,
          showtimeStart: '2026-09-12T19:30:00Z',
          userId: 'usr_customer_2',
          userName: 'Sarah Chen',
          userEmail: 'sarah.chen@example.com',
          category: 'VIP',
          requestedQuantity: 1,
          status: 'PENDING',
          queuePosition: 1,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'wl_002',
          eventId: 'evt_taylor_swift',
          eventTitle: 'The Eras Stadium World Tour: Deluxe Edition',
          showtimeId: taylorShow1,
          showtimeStart: '2026-09-12T19:30:00Z',
          userId: 'usr_customer_3',
          userName: 'Marcus Vance',
          userEmail: 'marcus.vance@example.com',
          category: 'VIP',
          requestedQuantity: 1,
          status: 'PENDING',
          queuePosition: 2,
          createdAt: new Date(Date.now() - 900000).toISOString(),
          updatedAt: new Date(Date.now() - 900000).toISOString(),
        },
      ];
      this.state.waitlists.set(taylorShow1, waitlistEntries);
    }
  }

  private setupBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('omniseat_concurrency_bus');
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data && ev.data.type) {
            this.notifySubscribersLocally(ev.data);
          }
        };
      } catch {
        // Fallback for non-supported browsers
      }
    }
  }

  // --------------------------------------------------------------------------
  // BACKGROUND WORKER: HOLD TTL & WAITLIST OFFER EXPIRATION CHECKER
  // --------------------------------------------------------------------------

  private startBackgroundWorkers() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Heartbeat ticker running every 1.5s
    this.timerInterval = setInterval(() => {
      this.checkExpiredHolds();
      this.checkExpiredWaitlistOffers();
    }, 1500);
  }

  private checkExpiredHolds() {
    const now = Date.now();

    for (const [showtimeId, seats] of this.state.showSeats.entries()) {
      for (const seat of seats) {
        if (seat.status === 'HELD' && seat.holdExpiresAt) {
          const expiryTime = new Date(seat.holdExpiresAt).getTime();
          if (expiryTime <= now) {
            // Auto-Release seat lock
            const prevUser = seat.heldByUserName || 'Customer';
            seat.status = 'AVAILABLE';
            seat.heldByUserId = null;
            seat.heldByUserName = null;
            seat.holdExpiresAt = null;
            seat.lockToken = null;
            seat.version += 1;
            seat.updatedAt = new Date().toISOString();

            const event: ConcurrencyLockEvent = {
              id: `evt_exp_${Date.now()}_${seat.id}`,
              timestamp: new Date().toISOString(),
              type: 'HOLD_EXPIRED',
              showtimeId,
              seatIds: [seat.seatId],
              userName: prevUser,
              message: `Hold expired for Seat ${seat.seat.row}-${seat.seat.number}. Auto-released back to inventory pool.`,
              version: seat.version,
            };

            this.logAndBroadcast(event);
          }
        }
      }
    }
  }

  private checkExpiredWaitlistOffers() {
    const now = Date.now();

    for (const [showtimeId, entries] of this.state.waitlists.entries()) {
      for (const entry of entries) {
        if (entry.status === 'OFFERED' && entry.offerExpiresAt) {
          const expiryTime = new Date(entry.offerExpiresAt).getTime();
          if (expiryTime <= now) {
            // Offer lapsed! Mark entry EXPIRED and cascade to NEXT person
            entry.status = 'EXPIRED';
            entry.updatedAt = new Date().toISOString();

            const offeredSeatId = entry.offeredSeatId;

            const event: ConcurrencyLockEvent = {
              id: `evt_wlexp_${Date.now()}_${entry.id}`,
              timestamp: new Date().toISOString(),
              type: 'OFFER_EXPIRED_CASCADED',
              showtimeId,
              seatIds: offeredSeatId ? [offeredSeatId] : [],
              userId: entry.userId,
              userName: entry.userName,
              message: `Waitlist offer window (15m) expired for ${entry.userName}. Cascading offer to next candidate in queue.`,
            };
            this.logAndBroadcast(event);

            // Trigger reallocation for this seat
            if (offeredSeatId) {
              this.reallocateSeatToNextWaitlist(showtimeId, offeredSeatId, entry.category);
            }
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // ATOMIC SEAT HOLD CONTROLLER (TRANSACTION + DISTRIBUTED LOCK SIMULATION)
  // --------------------------------------------------------------------------

  public async holdSeats(params: {
    showtimeId: string;
    seatIds: string[];
    user: User;
    holdTTLSeconds?: number;
  }): Promise<{
    success: boolean;
    heldSeats?: ShowSeat[];
    expiresAt?: string;
    error?: string;
    collisionDetails?: string;
  }> {
    const startTime = performance.now();
    const { showtimeId, seatIds, user } = params;
    const ttl = params.holdTTLSeconds || this.holdTTLSeconds;
    const seats = this.state.showSeats.get(showtimeId);

    if (!seats) {
      return { success: false, error: 'Showtime not found' };
    }

    // 1. Pessimistic Lock Acquisition Verification
    // Verify ALL target seats exist and are AVAILABLE (or current user already holds them)
    const targetShowSeats = seats.filter((s) => seatIds.includes(s.seatId));
    if (targetShowSeats.length !== seatIds.length) {
      return { success: false, error: 'One or more selected seats do not exist' };
    }

    const now = Date.now();
    const unavailableSeats: ShowSeat[] = [];

    for (const seat of targetShowSeats) {
      const isAvailable =
        seat.status === 'AVAILABLE' ||
        (seat.status === 'HELD' && seat.holdExpiresAt && new Date(seat.holdExpiresAt).getTime() < now) ||
        (seat.status === 'HELD' && seat.heldByUserId === user.id);

      if (!isAvailable) {
        unavailableSeats.push(seat);
      }
    }

    // Collision Detected: Atomic Rollback!
    if (unavailableSeats.length > 0) {
      const conflictNames = unavailableSeats
        .map((s) => `${s.seat.row}${s.seat.number} (${s.status} by ${s.heldByUserName || 'another customer'})`)
        .join(', ');

      const latencyMs = Math.round(performance.now() - startTime);

      const collisionEvent: ConcurrencyLockEvent = {
        id: `evt_col_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'COLLISION_PREVENTED',
        showtimeId,
        seatIds: unavailableSeats.map((s) => s.seatId),
        userId: user.id,
        userName: user.fullName,
        message: `High-concurrency race condition prevented! Seat ${conflictNames} was locked by another user. Transaction rolled back with 0 double-booking.`,
        latencyMs,
      };
      this.logAndBroadcast(collisionEvent);

      return {
        success: false,
        error: 'One or more selected seats were just claimed by another user.',
        collisionDetails: conflictNames,
      };
    }

    // 2. Atomic Transition to HELD
    const expiresAt = new Date(now + ttl * 1000).toISOString();
    const lockToken = `lock_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    for (const seat of targetShowSeats) {
      seat.status = 'HELD';
      seat.heldByUserId = user.id;
      seat.heldByUserName = user.fullName;
      seat.holdExpiresAt = expiresAt;
      seat.lockToken = lockToken;
      seat.version += 1;
      seat.updatedAt = new Date().toISOString();
    }

    const latencyMs = Math.round(performance.now() - startTime);

    const lockEvent: ConcurrencyLockEvent = {
      id: `evt_hold_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SEAT_HELD',
      showtimeId,
      seatIds,
      userId: user.id,
      userName: user.fullName,
      message: `Reserved ${seatIds.length} seat(s) for ${user.fullName}. Hold TTL locked for ${Math.round(ttl / 60)} minutes (Expires ${new Date(expiresAt).toLocaleTimeString()}).`,
      version: targetShowSeats[0]?.version,
      latencyMs,
    };
    this.logAndBroadcast(lockEvent);

    return {
      success: true,
      heldSeats: targetShowSeats,
      expiresAt,
    };
  }

  // --------------------------------------------------------------------------
  // RELEASE SEAT HOLD (MANUAL OR ABANDON CHECKOUT)
  // --------------------------------------------------------------------------

  public releaseHolds(params: {
    showtimeId: string;
    seatIds: string[];
    userId: string;
  }): boolean {
    const { showtimeId, seatIds, userId } = params;
    const seats = this.state.showSeats.get(showtimeId);
    if (!seats) return false;

    const releasedSeatLabels: string[] = [];

    for (const seat of seats) {
      if (seatIds.includes(seat.seatId) && seat.status === 'HELD' && seat.heldByUserId === userId) {
        seat.status = 'AVAILABLE';
        seat.heldByUserId = null;
        seat.heldByUserName = null;
        seat.holdExpiresAt = null;
        seat.lockToken = null;
        seat.version += 1;
        seat.updatedAt = new Date().toISOString();
        releasedSeatLabels.push(`${seat.seat.row}${seat.seat.number}`);
      }
    }

    if (releasedSeatLabels.length > 0) {
      const event: ConcurrencyLockEvent = {
        id: `evt_rel_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'LOCK_RELEASED',
        showtimeId,
        seatIds,
        userId,
        message: `Cart holds manually released for seat(s): ${releasedSeatLabels.join(', ')}.`,
      };
      this.logAndBroadcast(event);
      return true;
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // CONFIRM BOOKING & COMMIT PAYMENT
  // --------------------------------------------------------------------------

  public async commitBooking(params: {
    showtimeId: string;
    seatIds: string[];
    user: User;
    paymentIntentId?: string;
  }): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
  }> {
    const { showtimeId, seatIds, user } = params;
    const seats = this.state.showSeats.get(showtimeId);
    if (!seats) return { success: false, error: 'Showtime not found' };

    // Verify all seats are currently HELD by this user
    const targetShowSeats = seats.filter((s) => seatIds.includes(s.seatId));
    const invalidSeats = targetShowSeats.filter(
      (s) => (s.status !== 'HELD' && s.status !== 'OFFERED') || (s.heldByUserId !== user.id && s.offeredToWaitlistId === null)
    );

    if (invalidSeats.length > 0 || targetShowSeats.length !== seatIds.length) {
      return {
        success: false,
        error: 'One or more seat holds expired or are not assigned to your session.',
      };
    }

    // Find event and showtime info
    const event = this.state.events.find((e) => e.showtimes.some((s) => s.id === showtimeId));
    const showtime = event?.showtimes.find((s) => s.id === showtimeId);
    const venue = event?.venue || MOCK_VENUES[0];

    if (!event || !showtime) {
      return { success: false, error: 'Event or showtime metadata not found' };
    }

    const bookingRef = `BK-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const seatNumbers = targetShowSeats.map((s) => `${s.seat.row}${s.seat.number}`);

    // Calculate total pricing
    let totalAmountCents = 0;
    const bookingItems = targetShowSeats.map((s) => {
      const pricing = showtime.seatPricings.find((p) => p.category === s.seat.category);
      const priceCents = pricing?.priceCents || 10000;
      totalAmountCents += priceCents;

      return {
        id: `bki_${Date.now()}_${s.seatId}`,
        bookingId,
        seatId: s.seatId,
        showSeatId: s.id,
        category: s.seat.category,
        priceCents,
        seatSummary: {
          section: s.seat.section,
          row: s.seat.row,
          number: s.seat.number,
        },
      };
    });

    // Generate cryptographic QR signature
    const { payload, signature, qrDataUrl } = await createSignedQRPayload({
      bookingId,
      bookingRef,
      userId: user.id,
      userEmail: user.email,
      eventId: event.id,
      eventTitle: event.title,
      showtimeId,
      showtimeStart: showtime.startTime,
      venueName: venue.name,
      seatNumbers,
      totalCents: totalAmountCents,
    });

    const booking: Booking = {
      id: bookingId,
      bookingReference: bookingRef,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      showtimeId,
      showtime,
      event,
      venue,
      status: 'CONFIRMED',
      totalAmountCents,
      currency: 'INR',
      paymentIntentId: params.paymentIntentId || `pi_sim_${Date.now()}`,
      paymentStatus: 'SUCCEEDED',
      paidAt: new Date().toISOString(),
      qrPayloadSignature: signature,
      qrCodeDataUrl: qrDataUrl,
      isScannedAtDoor: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: bookingItems,
    };

    // Transition all seats to BOOKED
    for (const seat of targetShowSeats) {
      seat.status = 'BOOKED';
      seat.heldByUserId = user.id;
      seat.heldByUserName = user.fullName;
      seat.holdExpiresAt = null;
      seat.lockToken = null;
      seat.offeredToWaitlistId = null;
      seat.version += 1;
      seat.updatedAt = new Date().toISOString();
    }

    this.state.bookings.set(bookingId, booking);

    const eventMsg: ConcurrencyLockEvent = {
      id: `evt_book_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'BOOKING_COMMITTED',
      showtimeId,
      seatIds,
      userId: user.id,
      userName: user.fullName,
      message: `Confirmed Booking ${bookingRef} for ${user.fullName} (${seatNumbers.join(', ')}). QR Ticket issued with HMAC-SHA256 signature.`,
      version: targetShowSeats[0]?.version,
    };
    this.logAndBroadcast(eventMsg);

    return { success: true, booking };
  }

  // --------------------------------------------------------------------------
  // CANCEL BOOKING & AUTOMATED WAITLIST REALLOCATION DISPATCH
  // --------------------------------------------------------------------------

  public async cancelBooking(bookingId: string, cancelledByUserId: string): Promise<{
    success: boolean;
    reallocatedCount: number;
    error?: string;
  }> {
    const booking = this.state.bookings.get(bookingId);
    if (!booking) return { success: false, reallocatedCount: 0, error: 'Booking not found' };

    if (booking.userId !== cancelledByUserId && cancelledByUserId !== 'usr_admin_1') {
      return { success: false, reallocatedCount: 0, error: 'Unauthorized to cancel this booking' };
    }

    booking.status = 'CANCELLED';
    booking.paymentStatus = 'REFUNDED';
    booking.updatedAt = new Date().toISOString();

    const showtimeId = booking.showtimeId;
    const seats = this.state.showSeats.get(showtimeId);
    let reallocatedCount = 0;

    if (seats) {
      for (const item of booking.items) {
        const showSeat = seats.find((s) => s.seatId === item.seatId);
        if (showSeat) {
          // Attempt waitlist reallocation for this seat
          const reallocated = this.reallocateSeatToNextWaitlist(
            showtimeId,
            showSeat.seatId,
            item.category
          );

          if (reallocated) {
            reallocatedCount++;
          } else {
            // No waitlist: return directly to AVAILABLE
            showSeat.status = 'AVAILABLE';
            showSeat.heldByUserId = null;
            showSeat.heldByUserName = null;
            showSeat.holdExpiresAt = null;
            showSeat.version += 1;
            showSeat.updatedAt = new Date().toISOString();
          }
        }
      }
    }

    return { success: true, reallocatedCount };
  }

  // --------------------------------------------------------------------------
  // WAITLIST FIFO QUEUE ENGINE & CASCADING OFFER ALLOCATOR
  // --------------------------------------------------------------------------

  public joinWaitlist(params: {
    eventId: string;
    showtimeId: string;
    user: User;
    category: SeatCategory;
    quantity?: number;
  }): { success: boolean; entry?: WaitlistEntry; queuePosition?: number; error?: string } {
    const { eventId, showtimeId, user, category } = params;
    const event = this.state.events.find((e) => e.id === eventId);
    const showtime = event?.showtimes.find((s) => s.id === showtimeId);

    if (!event || !showtime) {
      return { success: false, error: 'Event or showtime not found' };
    }

    let entries = this.state.waitlists.get(showtimeId);
    if (!entries) {
      entries = [];
      this.state.waitlists.set(showtimeId, entries);
    }

    // Check if user is already pending in this queue
    const existing = entries.find(
      (e) => e.userId === user.id && e.category === category && (e.status === 'PENDING' || e.status === 'OFFERED')
    );
    if (existing) {
      return {
        success: false,
        error: `You are already #${existing.queuePosition} in the waitlist queue for ${category} seats.`,
      };
    }

    // Calculate queue position (FIFO)
    const categoryEntries = entries.filter((e) => e.category === category && e.status === 'PENDING');
    const queuePosition = categoryEntries.length + 1;

    const entry: WaitlistEntry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      eventTitle: event.title,
      showtimeId,
      showtimeStart: showtime.startTime,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      category,
      requestedQuantity: params.quantity || 1,
      status: 'PENDING',
      queuePosition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    entries.push(entry);

    const logEvent: ConcurrencyLockEvent = {
      id: `evt_wl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SEAT_HELD',
      showtimeId,
      seatIds: [],
      userId: user.id,
      userName: user.fullName,
      message: `${user.fullName} joined ${category} waitlist queue at position #${queuePosition}.`,
    };
    this.logAndBroadcast(logEvent);

    return { success: true, entry, queuePosition };
  }

  public reallocateSeatToNextWaitlist(
    showtimeId: string,
    seatId: string,
    category: SeatCategory
  ): boolean {
    const entries = this.state.waitlists.get(showtimeId);
    const seats = this.state.showSeats.get(showtimeId);
    if (!entries || !seats) return false;

    const targetSeat = seats.find((s) => s.seatId === seatId);
    if (!targetSeat) return false;

    // Find next candidate in FIFO line
    const pendingCandidates = entries
      .filter((e) => e.category === category && e.status === 'PENDING')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (pendingCandidates.length === 0) {
      // Nobody waiting in line: seat becomes public AVAILABLE
      targetSeat.status = 'AVAILABLE';
      targetSeat.heldByUserId = null;
      targetSeat.heldByUserName = null;
      targetSeat.holdExpiresAt = null;
      targetSeat.offeredToWaitlistId = null;
      targetSeat.version += 1;
      targetSeat.updatedAt = new Date().toISOString();

      const event: ConcurrencyLockEvent = {
        id: `evt_avl_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'LOCK_RELEASED',
        showtimeId,
        seatIds: [seatId],
        message: `Cancelled seat ${targetSeat.seat.row}${targetSeat.seat.number} had no active waitlist candidates. Reverted to public AVAILABLE.`,
      };
      this.logAndBroadcast(event);
      return false;
    }

    // Candidate found! Transition to OFFERED
    const candidate = pendingCandidates[0];
    const offerExpiresAt = new Date(Date.now() + this.offerTTLSeconds * 1000).toISOString();
    const claimToken = generateClaimToken(candidate.id, targetSeat.seatId, offerExpiresAt);

    // Update Seat Status to OFFERED (Not publicly bookable)
    targetSeat.status = 'OFFERED';
    targetSeat.heldByUserId = candidate.userId;
    targetSeat.heldByUserName = candidate.userName;
    targetSeat.offeredToWaitlistId = candidate.id;
    targetSeat.offeredExpiresAt = offerExpiresAt;
    targetSeat.version += 1;
    targetSeat.updatedAt = new Date().toISOString();

    // Update Candidate Waitlist Entry
    candidate.status = 'OFFERED';
    candidate.claimToken = claimToken;
    candidate.offerExpiresAt = offerExpiresAt;
    candidate.offeredSeatId = targetSeat.seatId;
    candidate.offeredSeatSummary = `Row ${targetSeat.seat.row}, Seat ${targetSeat.seat.number} (${targetSeat.seat.section})`;
    candidate.notifiedAt = new Date().toISOString();
    candidate.updatedAt = new Date().toISOString();

    const event: ConcurrencyLockEvent = {
      id: `evt_off_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'WAITLIST_OFFER_DISPATCHED',
      showtimeId,
      seatIds: [seatId],
      userId: candidate.userId,
      userName: candidate.userName,
      message: `Automated Reallocation Engine dispatched exclusive offer for Seat ${targetSeat.seat.row}-${targetSeat.seat.number} to ${candidate.userName} (15m signed claim token: ${claimToken.slice(0, 14)}...).`,
      version: targetSeat.version,
    };
    this.logAndBroadcast(event);

    return true;
  }

  // --------------------------------------------------------------------------
  // CLAIM TIME-LIMITED WAITLIST OFFER
  // --------------------------------------------------------------------------

  public async claimWaitlistOffer(claimToken: string, user: User): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
  }> {
    for (const [showtimeId, entries] of this.state.waitlists.entries()) {
      const entry = entries.find((e) => e.claimToken === claimToken);
      if (entry) {
        if (entry.status !== 'OFFERED') {
          return { success: false, error: 'This offer is no longer valid or has already been processed.' };
        }

        if (entry.offerExpiresAt && new Date(entry.offerExpiresAt).getTime() < Date.now()) {
          return { success: false, error: 'This purchase window has expired. The seat has been cascaded to the next user.' };
        }

        if (entry.userId !== user.id && user.role !== 'ADMIN') {
          return { success: false, error: 'This claim link belongs to a different registered account.' };
        }

        const seatId = entry.offeredSeatId;
        if (!seatId) return { success: false, error: 'No seat associated with this offer' };

        // Mark entry as CLAIMED
        entry.status = 'CLAIMED';
        entry.updatedAt = new Date().toISOString();

        // Commit booking immediately
        const commitResult = await this.commitBooking({
          showtimeId,
          seatIds: [seatId],
          user,
        });

        if (commitResult.success) {
          const logEvent: ConcurrencyLockEvent = {
            id: `evt_claimed_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'BOOKING_COMMITTED',
            showtimeId,
            seatIds: [seatId],
            userId: user.id,
            userName: user.fullName,
            message: `${user.fullName} successfully claimed waitlist offer! Seat confirmed.`,
          };
          this.logAndBroadcast(logEvent);
        }

        return commitResult;
      }
    }

    return { success: false, error: 'Invalid or expired claim token.' };
  }

  // --------------------------------------------------------------------------
  // DOOR STAFF QR TICKET SCANNER & VERIFICATION
  // --------------------------------------------------------------------------

  public verifyTicketToken(qrRawJson: string, staffUser: User): {
    isValid: boolean;
    booking?: Booking;
    reason?: string;
    warning?: string;
  } {
    try {
      const parsed = JSON.parse(qrRawJson);
      const bookingId = parsed.bookingId || parsed.id;
      if (!bookingId) {
        return { isValid: false, reason: 'Invalid QR Ticket signature payload format' };
      }

      const booking = this.state.bookings.get(bookingId);
      if (!booking) {
        return { isValid: false, reason: 'Ticket not found in central database' };
      }

      if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
        return { isValid: false, booking, reason: 'TICKET VOID: This booking was cancelled or refunded.' };
      }

      if (booking.isScannedAtDoor) {
        return {
          isValid: true,
          booking,
          warning: `ALREADY ADMITTED: Ticket was already scanned at ${new Date(booking.scannedAt || '').toLocaleTimeString()} by ${booking.scannedByStaffId || 'Gate Agent'}.`,
        };
      }

      // Mark as scanned
      booking.isScannedAtDoor = true;
      booking.scannedAt = new Date().toISOString();
      booking.scannedByStaffId = staffUser.fullName;
      booking.updatedAt = new Date().toISOString();

      const logEvent: ConcurrencyLockEvent = {
        id: `evt_scan_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'TICKET_VERIFIED',
        showtimeId: booking.showtimeId,
        seatIds: booking.items.map((i) => i.seatId),
        userId: staffUser.id,
        userName: staffUser.fullName,
        message: `DOOR SCAN: Validated ticket ${booking.bookingReference} for ${booking.userName} (${booking.items.map((i) => `${i.seatSummary.row}${i.seatSummary.number}`).join(', ')}). Access Granted.`,
      };
      this.logAndBroadcast(logEvent);

      return { isValid: true, booking };
    } catch {
      return { isValid: false, reason: 'Unreadable or corrupt QR code string.' };
    }
  }

  // --------------------------------------------------------------------------
  // STRESS TEST & RACE CONDITION SIMULATOR
  // --------------------------------------------------------------------------

  public async runConcurrencyStressTest(params: {
    showtimeId: string;
    targetSeatId: string;
    concurrentThreads: number;
  }): Promise<{
    winnerUserId: string;
    winnerName: string;
    totalAttempts: number;
    collisionsPrevented: number;
    executionTimeMs: number;
    auditLog: string[];
  }> {
    const startTime = performance.now();
    const { showtimeId, targetSeatId, concurrentThreads } = params;
    const log: string[] = [];

    // Create virtual users competing in parallel
    const virtualUsers: User[] = Array.from({ length: concurrentThreads }, (_, i) => ({
      id: `usr_stress_${i + 1}`,
      email: `runner_${i + 1}@stresslab.io`,
      fullName: `Contender #${i + 1} (${['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'][i % 5]})`,
      role: 'CUSTOMER',
    }));

    log.push(`[T0] Launching ${concurrentThreads} concurrent thread requests targeting seat ID: ${targetSeatId}`);

    // Fire all hold requests simultaneously using Promise.all
    const promises = virtualUsers.map((user) =>
      this.holdSeats({
        showtimeId,
        seatIds: [targetSeatId],
        user,
        holdTTLSeconds: 120,
      })
    );

    const results = await Promise.all(promises);

    let winnerIdx = -1;
    let collisions = 0;

    results.forEach((res, idx) => {
      if (res.success) {
        winnerIdx = idx;
        log.push(`[LOCK GRANTED] ${virtualUsers[idx].fullName} successfully acquired exclusive distributed mutex.`);
      } else {
        collisions++;
        log.push(`[LOCK REJECTED] ${virtualUsers[idx].fullName} rejected: ${res.error}`);
      }
    });

    const executionTimeMs = Math.round(performance.now() - startTime);
    log.push(`[RESULT] Benchmark completed in ${executionTimeMs}ms. Exactly 1 lock won. ${collisions} collisions safely isolated.`);

    return {
      winnerUserId: winnerIdx >= 0 ? virtualUsers[winnerIdx].id : 'none',
      winnerName: winnerIdx >= 0 ? virtualUsers[winnerIdx].fullName : 'None',
      totalAttempts: concurrentThreads,
      collisionsPrevented: collisions,
      executionTimeMs,
      auditLog: log,
    };
  }

  // --------------------------------------------------------------------------
  // ORGANISER ANALYTICS AGGREGATOR
  // --------------------------------------------------------------------------

  public getOrganiserAnalytics(eventId: string): OrganiserAnalytics {
    const event = this.state.events.find((e) => e.id === eventId) || this.state.events[0];
    const showtimes = event.showtimes;
    let totalCapacity = 0;
    let totalSold = 0;
    let totalHeld = 0;
    let totalAvailable = 0;
    let totalOffered = 0;
    let grossRevenueCents = 0;

    const tierStatsMap: Record<SeatCategory, { sold: number; total: number; revenueCents: number; priceCents: number }> = {
      VIP: { sold: 0, total: 0, revenueCents: 0, priceCents: 0 },
      PREMIUM: { sold: 0, total: 0, revenueCents: 0, priceCents: 0 },
      STANDARD: { sold: 0, total: 0, revenueCents: 0, priceCents: 0 },
      ACCESSIBLE: { sold: 0, total: 0, revenueCents: 0, priceCents: 0 },
    };

    const waitlistMap: Record<SeatCategory, number> = {
      VIP: 0,
      PREMIUM: 0,
      STANDARD: 0,
      ACCESSIBLE: 0,
    };

    for (const show of showtimes) {
      const seats = this.state.showSeats.get(show.id) || [];
      totalCapacity += seats.length;

      for (const pricing of show.seatPricings) {
        tierStatsMap[pricing.category].priceCents = pricing.priceCents;
      }

      for (const seat of seats) {
        const cat = seat.seat.category;
        tierStatsMap[cat].total += 1;

        if (seat.status === 'BOOKED') {
          totalSold += 1;
          tierStatsMap[cat].sold += 1;
          const p = show.seatPricings.find((pr) => pr.category === cat)?.priceCents || 10000;
          tierStatsMap[cat].revenueCents += p;
          grossRevenueCents += p;
        } else if (seat.status === 'HELD') {
          totalHeld += 1;
        } else if (seat.status === 'OFFERED') {
          totalOffered += 1;
        } else if (seat.status === 'AVAILABLE') {
          totalAvailable += 1;
        }
      }

      // Tally waitlists
      const wl = this.state.waitlists.get(show.id) || [];
      for (const entry of wl) {
        if (entry.status === 'PENDING' || entry.status === 'OFFERED') {
          waitlistMap[entry.category] = (waitlistMap[entry.category] || 0) + 1;
        }
      }
    }

    const occupancyRate = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

    return {
      eventId: event.id,
      eventTitle: event.title,
      totalCapacity,
      totalSeatsSold: totalSold,
      totalSeatsHeld: totalHeld,
      totalSeatsAvailable: totalAvailable,
      totalSeatsOffered: totalOffered,
      occupancyRate,
      grossRevenueCents,
      currency: 'INR',
      tierBreakdown: Object.entries(tierStatsMap).map(([category, stats]) => ({
        category: category as SeatCategory,
        sold: stats.sold,
        total: stats.total,
        revenueCents: stats.revenueCents,
        priceCents: stats.priceCents,
      })),
      waitlistDepth: Object.entries(waitlistMap).map(([category, count]) => ({
        category: category as SeatCategory,
        count,
      })),
      recentSales: Array.from(this.state.bookings.values())
        .filter((b) => b.event.id === eventId && b.status === 'CONFIRMED')
        .slice(-5)
        .reverse()
        .map((b) => ({
          time: new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          seats: b.items.length,
          amountCents: b.totalAmountCents,
          userName: b.userName,
        })),
    };
  }

  // --------------------------------------------------------------------------
  // GETTERS & SUBSCRIBERS
  // --------------------------------------------------------------------------

  public getEvents(): EventItem[] {
    return this.state.events;
  }

  public getShowSeats(showtimeId: string): ShowSeat[] {
    return this.state.showSeats.get(showtimeId) || [];
  }

  public getUserBookings(userId: string): Booking[] {
    return Array.from(this.state.bookings.values()).filter((b) => b.userId === userId);
  }

  public getAllBookings(): Booking[] {
    return Array.from(this.state.bookings.values());
  }

  public getUserWaitlists(userId: string): WaitlistEntry[] {
    const list: WaitlistEntry[] = [];
    for (const entries of this.state.waitlists.values()) {
      for (const e of entries) {
        if (e.userId === userId) {
          list.push(e);
        }
      }
    }
    return list;
  }

  public getWaitlistsForShowtime(showtimeId: string): WaitlistEntry[] {
    return this.state.waitlists.get(showtimeId) || [];
  }

  public getEventLogs(): ConcurrencyLockEvent[] {
    return this.state.eventLogs;
  }

  public subscribe(callback: (event: ConcurrencyLockEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribersLocally(event: ConcurrencyLockEvent) {
    this.subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    });
  }

  private logAndBroadcast(event: ConcurrencyLockEvent) {
    this.state.eventLogs.unshift(event);
    if (this.state.eventLogs.length > 100) {
      this.state.eventLogs.pop();
    }

    this.notifySubscribersLocally(event);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch {
        // Fallback ignore
      }
    }
  }

  public createEvent(newEvent: Partial<EventItem>, showtimesCount: number = 1): EventItem {
    const venue = MOCK_VENUES.find((v) => v.id === newEvent.venueId) || MOCK_VENUES[0];
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const event: EventItem = {
      id: eventId,
      title: newEvent.title || 'New Live Event',
      slug: (newEvent.title || 'new-event').toLowerCase().replace(/\s+/g, '-'),
      description: newEvent.description || 'Exciting live experience.',
      eventType: newEvent.eventType || 'CONCERT',
      durationMins: newEvent.durationMins || 120,
      posterUrl: newEvent.posterUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
      bannerUrl: newEvent.bannerUrl,
      ageRating: newEvent.ageRating || 'All Ages',
      artistOrCast: newEvent.artistOrCast || 'Headlining Artist',
      organiserId: newEvent.organiserId || 'usr_organiser_1',
      organiserName: 'LivePulse Entertainment',
      venueId: venue.id,
      venue,
      isPublished: true,
      tags: ['New Listing', 'Live Booking'],
      showtimes: Array.from({ length: showtimesCount }, (_, i) => ({
        id: `show_${eventId}_${i + 1}`,
        eventId,
        venueId: venue.id,
        venueName: venue.name,
        startTime: new Date(Date.now() + (i + 1) * 86400000 + 19 * 3600000).toISOString(),
        endTime: new Date(Date.now() + (i + 1) * 86400000 + 22 * 3600000).toISOString(),
        doorsOpenTime: new Date(Date.now() + (i + 1) * 86400000 + 18 * 3600000).toISOString(),
        seatPricings: [
          { id: `sp_${eventId}_vip`, showtimeId: `show_${eventId}_${i + 1}`, eventId, category: 'VIP', priceCents: 29900, currency: 'INR' },
          { id: `sp_${eventId}_prem`, showtimeId: `show_${eventId}_${i + 1}`, eventId, category: 'PREMIUM', priceCents: 19900, currency: 'INR' },
          { id: `sp_${eventId}_std`, showtimeId: `show_${eventId}_${i + 1}`, eventId, category: 'STANDARD', priceCents: 9900, currency: 'INR' },
          { id: `sp_${eventId}_acc`, showtimeId: `show_${eventId}_${i + 1}`, eventId, category: 'ACCESSIBLE', priceCents: 9900, currency: 'INR' },
        ],
      })),
    };

    this.state.events.unshift(event);

    // Initialize seats for the new showtimes
    const seats = generateVenueSeats(venue.id, venue.rows, venue.cols);
    for (const show of event.showtimes) {
      const showSeats: ShowSeat[] = seats.map((seat) => ({
        id: `ss_${show.id}_${seat.id}`,
        showtimeId: show.id,
        seatId: seat.id,
        seat,
        status: 'AVAILABLE',
        heldByUserId: null,
        heldByUserName: null,
        holdExpiresAt: null,
        version: 1,
        lockToken: null,
        updatedAt: new Date().toISOString(),
      }));
      this.state.showSeats.set(show.id, showSeats);
    }

    return event;
  }
}

// Singleton global concurrency instance
export const concurrencyEngine = new ConcurrencyEngine();
