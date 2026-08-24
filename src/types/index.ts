// ============================================================================
// DOMAIN TYPES & ENUMS FOR HIGH-CONCURRENCY TICKET BOOKING SYSTEM
// ============================================================================

export type UserRole = 'ADMIN' | 'ORGANISER' | 'CUSTOMER' | 'DOOR_STAFF';

export type SeatCategory = 'VIP' | 'PREMIUM' | 'STANDARD' | 'ACCESSIBLE';

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'OFFERED' | 'BLOCKED';

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

export type WaitlistStatus = 'PENDING' | 'OFFERED' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export type EventType = 'CONCERT' | 'MOVIE' | 'THEATRE' | 'SPORTS' | 'FESTIVAL';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  totalCapacity: number;
  svgLayoutUrl?: string;
  rows: number;
  cols: number;
}

export interface Seat {
  id: string;
  venueId: string;
  section: string;
  row: string;
  number: number;
  gridX: number;
  gridY: number;
  category: SeatCategory;
  isAccessible?: boolean;
  isActive?: boolean;
}

export interface SeatPricing {
  id: string;
  showtimeId: string;
  eventId: string;
  category: SeatCategory;
  priceCents: number; // Stored in cents, e.g. 15000 = $150.00
  currency: string;
}

export interface Showtime {
  id: string;
  eventId: string;
  venueId: string;
  venueName?: string;
  startTime: string; // ISO string
  endTime: string;
  doorsOpenTime?: string;
  seatPricings: SeatPricing[];
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  eventType: EventType;
  durationMins: number;
  posterUrl: string;
  bannerUrl?: string;
  ageRating?: string;
  artistOrCast?: string;
  organiserId: string;
  organiserName: string;
  venueId: string;
  venue: Venue;
  showtimes: Showtime[];
  isPublished: boolean;
  tags?: string[];
}

export interface ShowSeat {
  id: string;
  showtimeId: string;
  seatId: string;
  seat: Seat;
  status: SeatStatus;
  heldByUserId?: string | null;
  heldByUserName?: string | null;
  holdExpiresAt?: string | null; // ISO timestamp
  version: number;
  lockToken?: string | null;
  offeredToWaitlistId?: string | null;
  offeredToUserName?: string | null;
  offeredExpiresAt?: string | null;
  bookingItemId?: string | null;
  updatedAt: string;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  seatId: string;
  showSeatId?: string;
  category: SeatCategory;
  priceCents: number;
  seatSummary: {
    section: string;
    row: string;
    number: number;
  };
}

export interface Booking {
  id: string;
  bookingReference: string; // e.g. "BK-2026-X99Q"
  userId: string;
  userName: string;
  userEmail: string;
  showtimeId: string;
  showtime: Showtime;
  event: EventItem;
  venue: Venue;
  status: BookingStatus;
  totalAmountCents: number;
  currency: string;
  paymentIntentId?: string;
  paymentStatus: 'SUCCEEDED' | 'REFUNDED' | 'FAILED';
  paidAt?: string;
  qrPayloadSignature: string;
  qrCodeDataUrl?: string;
  isScannedAtDoor: boolean;
  scannedAt?: string;
  scannedByStaffId?: string;
  createdAt: string;
  updatedAt: string;
  items: BookingItem[];
}

export interface WaitlistEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  showtimeId: string;
  showtimeStart: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: SeatCategory;
  requestedQuantity: number;
  status: WaitlistStatus;
  queuePosition: number;
  claimToken?: string | null;
  offerExpiresAt?: string | null;
  offeredSeatSummary?: string | null;
  offeredSeatId?: string | null;
  priceCents?: number;
  notifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QRPayload {
  bookingId: string;
  bookingRef: string;
  userId: string;
  userEmail: string;
  eventId: string;
  eventTitle: string;
  showtimeId: string;
  showtimeStart: string;
  venueName: string;
  seatNumbers: string[];
  totalCents: number;
  issuedAt: string;
  signature: string;
}

export interface ConcurrencyLockEvent {
  id: string;
  timestamp: string;
  type: 'LOCK_ACQUIRED' | 'LOCK_RELEASED' | 'SEAT_HELD' | 'HOLD_EXPIRED' | 'COLLISION_PREVENTED' | 'BOOKING_COMMITTED' | 'WAITLIST_OFFER_DISPATCHED' | 'OFFER_EXPIRED_CASCADED' | 'TICKET_VERIFIED';
  showtimeId: string;
  seatIds: string[];
  userId?: string;
  userName?: string;
  message: string;
  version?: number;
  latencyMs?: number;
}

export interface OrganiserAnalytics {
  eventId: string;
  eventTitle: string;
  totalCapacity: number;
  totalSeatsSold: number;
  totalSeatsHeld: number;
  totalSeatsAvailable: number;
  totalSeatsOffered: number;
  occupancyRate: number; // 0 to 100 %
  grossRevenueCents: number;
  currency: string;
  tierBreakdown: {
    category: SeatCategory;
    sold: number;
    total: number;
    revenueCents: number;
    priceCents: number;
  }[];
  waitlistDepth: {
    category: SeatCategory;
    count: number;
  }[];
  recentSales: {
    time: string;
    seats: number;
    amountCents: number;
    userName: string;
  }[];
}
