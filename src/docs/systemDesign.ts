// ============================================================================
// SYSTEM DESIGN DOCUMENT & ARCHITECTURAL WRITE-UP
// Covers: Concurrency Mechanics, Distributed Locks, Waitlist State Machine, Scalability
// ============================================================================

export const SYSTEM_DESIGN_MARKDOWN = `# OmniSeat: High-Concurrency Ticket Booking System
## System Architecture & Mission-Critical Concurrency Design

---

### 1. Concurrency Protection & Race Condition Elimination
In flash-sale events (e.g., world tours or IMAX blockbusters), thousands of concurrent requests target the same optimal seats within milliseconds. To guarantee **strictly zero double-booking**, the architecture leverages a two-tier locking strategy:

1. **Tier 1: Distributed In-Memory Lock (Redis Redlock / Atomic \`SET NX EX\`):**
   - When a customer clicks "Hold", the API attempts an atomic Redis lock:
     \`\`\`redis
     SET lock:showtime:<showtime_id>:seat:<seat_id> <user_id> NX EX 600
     \`\`\`
   - If the key already exists, the Redis operation returns \`null\` in <1ms, instantly rejecting collision attempts before hitting the relational database.

2. **Tier 2: PostgreSQL Row-Level Pessimistic Locking with Transactions:**
   - Inside an isolated PostgreSQL transaction (\`ISOLATION LEVEL READ COMMITTED\` or \`REPEATABLE READ\`), the database executes:
     \`\`\`sql
     SELECT id, status, version 
     FROM show_seats 
     WHERE showtime_id = $1 AND seat_id = ANY($2)
     FOR UPDATE;
     \`\`\`
   - \`FOR UPDATE\` places an exclusive write lock on the physical row. If another concurrent worker attempts to inspect or mutate these rows, it blocks until commit or rolls back immediately if condition \`status = 'AVAILABLE'\` fails.

---

### 2. Distributed Seat Hold TTL & Automated Auto-Release Mechanics
- **State Transition:** \`AVAILABLE\` $\\rightarrow$ \`HELD\` (with \`hold_expires_at = NOW() + INTERVAL '10 minutes'\`).
- **Heartbeat & Event Scheduling:**
  - In a cloud environment, **BullMQ** with a delayed job worker tracks key expirations.
  - Alternatively, Redis Key-Space Notifications (\`__keyevent@0__:expired\`) notify the event-driven release worker.
  - The worker atomically updates the seat back to \`AVAILABLE\`, increments the \`version\` column, and emits a WebSockets/SSE broadcast event (\`HOLD_EXPIRED\`) to repaint all client visual seat maps in real time.

\`\`\`
[ Customer 1: Hold (10m TTL) ] ---> [ Redis SET NX & PG FOR UPDATE ] ---> Status: HELD
                                                                              |
       +----------------------------------------------------------------------+
       | (If Checkout Abandoned / Timer Expires at T+10m)
       v
[ BullMQ / Redis Expired Event ] ---> Revert to AVAILABLE ---> WebSocket Pub-Sub (Broadcasts to all clients)
\`\`\`

---

### 3. Automated Waitlist State Machine & Time-Limited Cascading Offers
When all seats in a tier are \`BOOKED\` or \`HELD\`, customers join a strict **FIFO Waitlist Queue** (\`INDEX ON (showtime_id, category, status, created_at ASC)\`).

#### Dynamic Reallocation Workflow:
1. **Trigger:** A customer cancels a confirmed booking (\`POST /api/bookings/:id/cancel\`).
2. **Atomic Offer Reservation:** The cancellation transaction transitions the seat directly to \`OFFERED\` (bypassing the public \`AVAILABLE\` pool to prevent scalper front-running).
3. **Queue Polling:** The engine pops the first \`PENDING\` candidate ordered by \`created_at ASC\`.
4. **Token Generation:** The system issues a signed, time-limited cryptographic token (\`claimToken\`) valid for **15 minutes** (\`offer_expires_at = NOW() + INTERVAL '15 minutes'\`).
5. **Notification Dispatch:** An automated email / push notification is delivered with a 1-click checkout URL (\`/claim-offer?token=<signed_token>\`).
6. **Cascading State Machine:**
   - If the candidate **claims** the offer: Seat transitions to \`BOOKED\`, waitlist becomes \`CLAIMED\`.
   - If the candidate **lapses** (>15m): Worker marks entry as \`EXPIRED\` and immediately invokes the reallocation trigger for the **next customer** in FIFO order. If no candidates remain, the seat unlocks to \`AVAILABLE\`.

---

### 4. Scalability Bottlenecks & Production Mitigation Strategies
1. **Database Connection Saturation:**
   - Direct connection spikes during flash sales can exhaust PostgreSQL connection limits.
   - *Mitigation:* Deploy **PgBouncer** in transaction pooling mode (e.g. 5,000 incoming client connections pooled into 100 dedicated Postgres connections).

2. **Read Amplification on Visual Seat Map:**
   - 50,000 fans refreshing the seat map generates heavy read load.
   - *Mitigation:* Read-Through Redis caching of showtime seat map JSON blobs (\`GET showtime:<id>:seatmap\`). The cache is updated reactively via CDC (Debezium/Kafka) or invalidation pub-sub on state changes.

3. **Tamper-Proof Door Scanning:**
   - Tickets encode an HMAC-SHA256 digital signature computed from \`booking_id + user_id + seat_numbers + issued_at\`.
   - Door staff scanner validates the cryptographic signature offline or online, preventing screenshot forgery and double-entry fraud.
`;

export const ENV_EXAMPLE_CONTENT = `# ============================================================================
# OMNISEAT PRODUCTION CONFIGURATION
# ============================================================================

# Database Connection (PostgreSQL with PgBouncer)
DATABASE_URL="postgresql://omniseat_user:SuperSecretPassword123!@localhost:5432/omniseat_db?schema=public&connection_limit=50&pool_timeout=10"

# Redis Instance (Distributed Locks & BullMQ Queue)
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# JWT & Cryptographic Signing Keys
JWT_SECRET="omni_jwt_hmac_secret_key_prod_2026_x89a"
QR_HMAC_SECRET="omni_seat_super_secure_hmac_secret_key_2026_prod"

# Email Provider (Resend or Nodemailer SMTP)
RESEND_API_KEY="re_123456789abcdef"
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@tickets.omniseat.io"
SMTP_PASSWORD="smtp_password_here"
EMAIL_FROM_ADDRESS="tickets@omniseat.io"

# Application Settings
PORT="3000"
APP_URL="https://omniseat.io"
HOLD_TTL_SECONDS="600"
OFFER_TTL_SECONDS="900"
`;

export const DOCKER_SETUP_GUIDE = `# ============================================================================
# DOCKER-COMPOSE LOCAL DEPLOYMENT SPECIFICATION
# ============================================================================

version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://omniseat:password123@postgres:5432/omniseat_prod
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=production_super_secret_jwt_key
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    container_name: omniseat_postgres
    restart: always
    environment:
      POSTGRES_USER: omniseat
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: omniseat_prod
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7.2-alpine
    container_name: omniseat_redis
    restart: always
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
`;
