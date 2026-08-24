// ============================================================================
// MOCK SEED DATA & REALISTIC CATALOGUE
// ============================================================================

import { EventItem, Venue, User, SeatCategory, Seat } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'usr_customer_1',
    email: 'alex.rivera@example.com',
    fullName: 'Alex Rivera',
    phoneNumber: '+1 (555) 234-5678',
    role: 'CUSTOMER',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_customer_2',
    email: 'sarah.chen@example.com',
    fullName: 'Sarah Chen',
    phoneNumber: '+1 (555) 876-5432',
    role: 'CUSTOMER',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_customer_3',
    email: 'marcus.vance@example.com',
    fullName: 'Marcus Vance',
    phoneNumber: '+1 (555) 432-1098',
    role: 'CUSTOMER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_organiser_1',
    email: 'elena.rostova@livepulse.events',
    fullName: 'Elena Rostova (LivePulse Ent)',
    role: 'ORGANISER',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_admin_1',
    email: 'system.admin@omniseat.io',
    fullName: 'Devon Hayes (System Admin)',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_staff_1',
    email: 'gate4.scanner@apexarena.com',
    fullName: 'Jordan Miller (Door Staff Lead)',
    role: 'DOOR_STAFF',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

// Helper to generate a realistic seat grid
export function generateVenueSeats(venueId: string, rows: number, cols: number): Seat[] {
  const seats: Seat[] = [];
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];

  for (let r = 0; r < rows; r++) {
    const rowLabel = rowLabels[r] || `R${r + 1}`;
    let category: SeatCategory = 'STANDARD';
    let section = 'Standard Tier';

    if (r < 2) {
      category = 'VIP';
      section = 'Front Stage VIP';
    } else if (r < 5) {
      category = 'PREMIUM';
      section = 'Prime Orchestra';
    } else {
      category = 'STANDARD';
      section = 'Upper Tier';
    }

    for (let c = 1; c <= cols; c++) {
      const isAisle = c === 1 || c === cols;
      const isAccessible = r === rows - 1 && (c === 1 || c === 2);
      
      seats.push({
        id: `seat_${venueId}_${rowLabel}_${c}`,
        venueId,
        section,
        row: rowLabel,
        number: c,
        gridX: c,
        gridY: r + 1,
        category: isAccessible ? 'ACCESSIBLE' : category,
        isAccessible,
        isActive: true,
      });
    }
  }

  return seats;
}

export const MOCK_VENUES: Venue[] = [
  {
    id: 'ven_apex_arena',
    name: 'Apex Grand Amphitheater',
    slug: 'apex-grand-amphitheater',
    address: '1000 Olympic Boulevard',
    city: 'Los Angeles',
    state: 'CA',
    country: 'US',
    postalCode: '90015',
    totalCapacity: 80,
    rows: 8,
    cols: 10,
  },
  {
    id: 'ven_starlight_imax',
    name: 'Starlight Laser IMAX Grand Cinema',
    slug: 'starlight-imax',
    address: '450 Broadway District',
    city: 'New York',
    state: 'NY',
    country: 'US',
    postalCode: '10036',
    totalCapacity: 64,
    rows: 8,
    cols: 8,
  },
  {
    id: 'ven_symphony_hall',
    name: 'Metropolis Royal Symphony Hall',
    slug: 'metropolis-royal-symphony',
    address: '220 Michigan Avenue',
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    postalCode: '60604',
    totalCapacity: 72,
    rows: 8,
    cols: 9,
  },
];

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt_taylor_swift',
    title: 'The Eras Stadium World Tour: Deluxe Edition',
    slug: 'the-eras-tour-deluxe',
    description: 'Experience the cultural phenomenon of the decade live. A breathtaking 3-hour journey spanning all musical eras, synchronized wristband light displays, acoustic secret sets, and state-of-the-art cinematic staging.',
    eventType: 'CONCERT',
    durationMins: 195,
    posterUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&auto=format&fit=crop&q=80',
    ageRating: 'All Ages',
    artistOrCast: 'Taylor Swift, Special Guest Opening Acts',
    organiserId: 'usr_organiser_1',
    organiserName: 'LivePulse Entertainment',
    venueId: 'ven_apex_arena',
    venue: MOCK_VENUES[0],
    isPublished: true,
    tags: ['Mega Concert', 'High Demand', 'Stage Curvature', 'Hot Seller'],
    showtimes: [
      {
        id: 'show_taylor_night1',
        eventId: 'evt_taylor_swift',
        venueId: 'ven_apex_arena',
        venueName: 'Apex Grand Amphitheater',
        startTime: '2026-09-12T19:30:00Z',
        endTime: '2026-09-12T23:00:00Z',
        doorsOpenTime: '2026-09-12T17:30:00Z',
        seatPricings: [
          { id: 'sp_1', showtimeId: 'show_taylor_night1', eventId: 'evt_taylor_swift', category: 'VIP', priceCents: 38000, currency: 'USD' },
          { id: 'sp_2', showtimeId: 'show_taylor_night1', eventId: 'evt_taylor_swift', category: 'PREMIUM', priceCents: 24000, currency: 'USD' },
          { id: 'sp_3', showtimeId: 'show_taylor_night1', eventId: 'evt_taylor_swift', category: 'STANDARD', priceCents: 14500, currency: 'USD' },
          { id: 'sp_4', showtimeId: 'show_taylor_night1', eventId: 'evt_taylor_swift', category: 'ACCESSIBLE', priceCents: 14500, currency: 'USD' },
        ],
      },
      {
        id: 'show_taylor_night2',
        eventId: 'evt_taylor_swift',
        venueId: 'ven_apex_arena',
        venueName: 'Apex Grand Amphitheater',
        startTime: '2026-09-13T19:30:00Z',
        endTime: '2026-09-13T23:00:00Z',
        doorsOpenTime: '2026-09-13T17:30:00Z',
        seatPricings: [
          { id: 'sp_5', showtimeId: 'show_taylor_night2', eventId: 'evt_taylor_swift', category: 'VIP', priceCents: 39500, currency: 'USD' },
          { id: 'sp_6', showtimeId: 'show_taylor_night2', eventId: 'evt_taylor_swift', category: 'PREMIUM', priceCents: 25500, currency: 'USD' },
          { id: 'sp_7', showtimeId: 'show_taylor_night2', eventId: 'evt_taylor_swift', category: 'STANDARD', priceCents: 15000, currency: 'USD' },
          { id: 'sp_8', showtimeId: 'show_taylor_night2', eventId: 'evt_taylor_swift', category: 'ACCESSIBLE', priceCents: 15000, currency: 'USD' },
        ],
      },
    ],
  },
  {
    id: 'evt_hans_zimmer',
    title: 'Hans Zimmer Live: Symphonic Odyssey',
    slug: 'hans-zimmer-symphonic-odyssey',
    description: 'Grammy & Academy Award winning maestro Hans Zimmer leads an 80-piece philharmonic orchestra and rock choir, performing iconic scores from Interstellar, Inception, Gladiator, Dune, and The Dark Knight with immersive surround sound.',
    eventType: 'CONCERT',
    durationMins: 160,
    posterUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80',
    ageRating: 'All Ages',
    artistOrCast: 'Hans Zimmer, Royal Philharmonic Orchestra & Vocalists',
    organiserId: 'usr_organiser_1',
    organiserName: 'LivePulse Entertainment',
    venueId: 'ven_symphony_hall',
    venue: MOCK_VENUES[2],
    isPublished: true,
    tags: ['Orchestral', 'Immersive Audio', 'Visual Masterpiece'],
    showtimes: [
      {
        id: 'show_zimmer_evening',
        eventId: 'evt_hans_zimmer',
        venueId: 'ven_symphony_hall',
        venueName: 'Metropolis Royal Symphony Hall',
        startTime: '2026-09-20T20:00:00Z',
        endTime: '2026-09-20T22:45:00Z',
        doorsOpenTime: '2026-09-20T18:45:00Z',
        seatPricings: [
          { id: 'sp_z1', showtimeId: 'show_zimmer_evening', eventId: 'evt_hans_zimmer', category: 'VIP', priceCents: 27500, currency: 'USD' },
          { id: 'sp_z2', showtimeId: 'show_zimmer_evening', eventId: 'evt_hans_zimmer', category: 'PREMIUM', priceCents: 18500, currency: 'USD' },
          { id: 'sp_z3', showtimeId: 'show_zimmer_evening', eventId: 'evt_hans_zimmer', category: 'STANDARD', priceCents: 11000, currency: 'USD' },
          { id: 'sp_z4', showtimeId: 'show_zimmer_evening', eventId: 'evt_hans_zimmer', category: 'ACCESSIBLE', priceCents: 11000, currency: 'USD' },
        ],
      },
    ],
  },
  {
    id: 'evt_oppenheimer_imax',
    title: 'Oppenheimer 70mm IMAX Special Presentation',
    slug: 'oppenheimer-70mm-imax',
    description: 'Christopher Nolan’s historical masterpiece presented on authentic 70mm IMAX 15-perf film print. Crystal-clear 18K resolution equivalent with 12-channel laser sound. Witness history in the definitive format.',
    eventType: 'MOVIE',
    durationMins: 180,
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&auto=format&fit=crop&q=80',
    ageRating: 'R (17+)',
    artistOrCast: 'Cillian Murphy, Emily Blunt, Robert Downey Jr., Matt Damon',
    organiserId: 'usr_organiser_1',
    organiserName: 'LivePulse Entertainment',
    venueId: 'ven_starlight_imax',
    venue: MOCK_VENUES[1],
    isPublished: true,
    tags: ['70mm IMAX', 'Exclusive Reel', 'Dolby Atmos'],
    showtimes: [
      {
        id: 'show_oppenheimer_prime',
        eventId: 'evt_oppenheimer_imax',
        venueId: 'ven_starlight_imax',
        venueName: 'Starlight Laser IMAX Grand Cinema',
        startTime: '2026-09-18T19:00:00Z',
        endTime: '2026-09-18T22:15:00Z',
        doorsOpenTime: '2026-09-18T18:30:00Z',
        seatPricings: [
          { id: 'sp_o1', showtimeId: 'show_oppenheimer_prime', eventId: 'evt_oppenheimer_imax', category: 'VIP', priceCents: 3200, currency: 'USD' },
          { id: 'sp_o2', showtimeId: 'show_oppenheimer_prime', eventId: 'evt_oppenheimer_imax', category: 'PREMIUM', priceCents: 2600, currency: 'USD' },
          { id: 'sp_o3', showtimeId: 'show_oppenheimer_prime', eventId: 'evt_oppenheimer_imax', category: 'STANDARD', priceCents: 1950, currency: 'USD' },
          { id: 'sp_o4', showtimeId: 'show_oppenheimer_prime', eventId: 'evt_oppenheimer_imax', category: 'ACCESSIBLE', priceCents: 1950, currency: 'USD' },
        ],
      },
    ],
  },
  {
    id: 'evt_coldplay_spheres',
    title: 'Coldplay: Music of the Spheres World Tour',
    slug: 'coldplay-music-of-the-spheres',
    description: 'The spectacular eco-friendly stadium spectacle powered by kinetic dance floors and solar energy. Complete with fireworks, confetti, and unreleased cosmic anthems.',
    eventType: 'CONCERT',
    durationMins: 135,
    posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80',
    ageRating: 'All Ages',
    artistOrCast: 'Coldplay, H.E.R.',
    organiserId: 'usr_organiser_1',
    organiserName: 'LivePulse Entertainment',
    venueId: 'ven_apex_arena',
    venue: MOCK_VENUES[0],
    isPublished: true,
    tags: ['Stadium Tour', 'Eco Powered', 'Wristband FX'],
    showtimes: [
      {
        id: 'show_coldplay_sat',
        eventId: 'evt_coldplay_spheres',
        venueId: 'ven_apex_arena',
        venueName: 'Apex Grand Amphitheater',
        startTime: '2026-09-26T20:00:00Z',
        endTime: '2026-09-26T22:30:00Z',
        doorsOpenTime: '2026-09-26T18:00:00Z',
        seatPricings: [
          { id: 'sp_c1', showtimeId: 'show_coldplay_sat', eventId: 'evt_coldplay_spheres', category: 'VIP', priceCents: 31000, currency: 'USD' },
          { id: 'sp_c2', showtimeId: 'show_coldplay_sat', eventId: 'evt_coldplay_spheres', category: 'PREMIUM', priceCents: 19500, currency: 'USD' },
          { id: 'sp_c3', showtimeId: 'show_coldplay_sat', eventId: 'evt_coldplay_spheres', category: 'STANDARD', priceCents: 12000, currency: 'USD' },
          { id: 'sp_c4', showtimeId: 'show_coldplay_sat', eventId: 'evt_coldplay_spheres', category: 'ACCESSIBLE', priceCents: 12000, currency: 'USD' },
        ],
      },
    ],
  },
];
