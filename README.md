# OmniSeat - High-Concurrency Ticket Booking Engine

OmniSeat is a high-concurrency ticket booking platform designed to handle simultaneous seat reservations while preventing double booking and maintaining reliable ticket allocation.

## Features

- High-concurrency seat booking
- Temporary seat locking with TTL
- Automatic seat release after hold expiration
- FIFO waitlist management
- Automated waitlist reallocation
- Interactive visual seat maps
- Secure ticket generation
- QR-based ticket verification
- Customer ticket wallet
- Organizer dashboard and analytics
- Event and seat inventory management
- Door-staff ticket verification
- System architecture documentation
- Concurrency testing and stress simulation

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Node.js
- Express
- Prisma
- QR Code generation
- Motion

## Project Structure

```text
src/
├── components/
│   ├── Admin/
│   ├── ConcurrencyLab/
│   ├── Customer/
│   ├── Documentation/
│   ├── DoorStaff/
│   ├── Organiser/
│   └── SeatMap/
├── docs/
├── lib/
│   ├── concurrencyEngine.ts
│   ├── crypto.ts
│   ├── emailService.ts
│   └── mockData.ts
├── types/
├── App.tsx
├── index.css
└── main.tsx