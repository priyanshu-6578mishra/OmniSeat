-- ============================================================================
-- PHASE 1 (SQL DDL): RAW POSTGRESQL SCHEMA WITH ROW-LEVEL LOCKS & INDEXES
-- High-Concurrency Ticket Booking System
-- Zero Double-Booking Guarantee via SELECT ... FOR UPDATE & Atomic Transactions
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'ORGANISER', 'CUSTOMER', 'DOOR_STAFF');
CREATE TYPE seat_category AS ENUM ('VIP', 'PREMIUM', 'STANDARD', 'ACCESSIBLE');
CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'HELD', 'BOOKED', 'OFFERED', 'BLOCKED');
CREATE TYPE booking_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED');
CREATE TYPE waitlist_status AS ENUM ('PENDING', 'OFFERED', 'CLAIMED', 'EXPIRED', 'CANCELLED');
CREATE TYPE event_type AS ENUM ('CONCERT', 'MOVIE', 'THEATRE', 'SPORTS', 'FESTIVAL');

-- 2. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Venues Table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'US',
    postal_code VARCHAR(20),
    total_capacity INT NOT NULL,
    svg_layout_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Seats Table (Physical blueprint per venue)
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    section VARCHAR(100) NOT NULL,
    row_label VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    grid_x INT NOT NULL,
    grid_y INT NOT NULL,
    category seat_category NOT NULL DEFAULT 'STANDARD',
    is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_venue_seat UNIQUE (venue_id, section, row_label, seat_number)
);

-- 5. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    event_type event_type NOT NULL,
    duration_mins INT NOT NULL,
    poster_url TEXT NOT NULL,
    banner_url TEXT,
    age_rating VARCHAR(50),
    artist_or_cast TEXT,
    organiser_id UUID NOT NULL REFERENCES users(id),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Showtimes Table
CREATE TABLE showtimes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    doors_open_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Seat Pricing
CREATE TABLE seat_pricings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category seat_category NOT NULL,
    price_cents INT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    CONSTRAINT uq_showtime_category_price UNIQUE (showtime_id, category)
);

-- 8. ShowSeats Table (Instance per showtime with pessimistic lock versioning)
CREATE TABLE show_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    status seat_status NOT NULL DEFAULT 'AVAILABLE',
    held_by_user_id UUID REFERENCES users(id),
    hold_expires_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 0,
    lock_token VARCHAR(255),
    offered_to_waitlist_id UUID,
    booking_item_id UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_showtime_seat UNIQUE (showtime_id, seat_id)
);

-- 9. Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    showtime_id UUID NOT NULL REFERENCES showtimes(id),
    status booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    total_amount_cents INT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_intent_id VARCHAR(255),
    payment_status VARCHAR(50),
    paid_at TIMESTAMPTZ,
    qr_payload_signature TEXT NOT NULL,
    is_scanned_at_door BOOLEAN NOT NULL DEFAULT FALSE,
    scanned_at TIMESTAMPTZ,
    scanned_by_staff_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Booking Items Table
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id),
    show_seat_id UUID REFERENCES show_seats(id),
    category seat_category NOT NULL,
    price_cents INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Waitlists Table (FIFO queue)
CREATE TABLE waitlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category seat_category NOT NULL,
    requested_quantity INT NOT NULL DEFAULT 1,
    status waitlist_status NOT NULL DEFAULT 'PENDING',
    queue_position INT,
    claim_token VARCHAR(255) UNIQUE,
    offer_expires_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    metadata_json JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- CRITICAL CONCURRENCY INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX idx_show_seats_lookup ON show_seats (showtime_id, status);
CREATE INDEX idx_show_seats_hold_expiry ON show_seats (hold_expires_at) WHERE status = 'HELD';
CREATE INDEX idx_waitlist_fifo_queue ON waitlists (showtime_id, category, status, created_at ASC);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_bookings_ref ON bookings (booking_reference);

-- ----------------------------------------------------------------------------
-- PESSIMISTIC ATOMIC SEAT HOLD STORED PROCEDURE (FOR HIGH LOAD)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hold_seats_atomic(
    p_showtime_id UUID,
    p_seat_ids UUID[],
    p_user_id UUID,
    p_hold_ttl_seconds INT DEFAULT 600
)
RETURNS TABLE (
    success BOOLEAN,
    held_seat_ids UUID[],
    expires_at TIMESTAMPTZ,
    error_message TEXT
) AS $$
DECLARE
    v_available_count INT;
    v_target_count INT := array_length(p_seat_ids, 1);
    v_expiry TIMESTAMPTZ := NOW() + (p_hold_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
    -- 1. Acquire Row-Level Exclusive Locks on Target Seats
    -- Any concurrent transaction attempting to lock these rows will block or abort
    PERFORM id
    FROM show_seats
    WHERE showtime_id = p_showtime_id
      AND seat_id = ANY(p_seat_ids)
    FOR UPDATE;

    -- 2. Verify all requested seats are strictly AVAILABLE or have expired holds
    SELECT COUNT(*) INTO v_available_count
    FROM show_seats
    WHERE showtime_id = p_showtime_id
      AND seat_id = ANY(p_seat_ids)
      AND (
          status = 'AVAILABLE' 
          OR (status = 'HELD' AND hold_expires_at < NOW())
      );

    IF v_available_count < v_target_count THEN
        RETURN QUERY SELECT FALSE, NULL::UUID[], NULL::TIMESTAMPTZ, 'One or more selected seats are no longer available';
        RETURN;
    END IF;

    -- 3. Atomic State Transition to HELD
    UPDATE show_seats
    SET status = 'HELD',
        held_by_user_id = p_user_id,
        hold_expires_at = v_expiry,
        version = version + 1,
        updated_at = NOW()
    WHERE showtime_id = p_showtime_id
      AND seat_id = ANY(p_seat_ids);

    -- 4. Return success payload
    RETURN QUERY SELECT TRUE, p_seat_ids, v_expiry, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
