import React, { useState } from 'react';
import {
  BookOpen,
  Database,
  Server,
  Layout,
  FileCode,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { SYSTEM_DESIGN_MARKDOWN, ENV_EXAMPLE_CONTENT, DOCKER_SETUP_GUIDE } from '../../docs/systemDesign';

export const DocsViewer: React.FC = () => {
  const [activePhase, setActivePhase] = useState<'system-design' | 'phase1' | 'phase2' | 'phase4-env' | 'phase4-docker'>('system-design');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const samplePrismaCode = `// Prisma Schema: High-Concurrency Ticket Booking System
model ShowSeat {
  id               String         @id @default(uuid())
  showtimeId       String
  showtime         Showtime       @relation(fields: [showtimeId], references: [id], onDelete: Cascade)
  seatId           String
  seat             Seat           @relation(fields: [seatId], references: [id], onDelete: Cascade)
  
  // High-Concurrency State & Locks
  status           SeatStatus     @default(AVAILABLE) // AVAILABLE, HELD, BOOKED, OFFERED
  heldByUserId     String?
  holdExpiresAt    DateTime?      // 10-minute hold TTL cutoff
  version          Int            @default(0)         // Optimistic lock versioning
  lockToken        String?        // Ephemeral distributed lock ID

  offeredToWaitlistId String?     @unique
  updatedAt        DateTime       @updatedAt

  @@unique([showtimeId, seatId])
  @@index([showtimeId, status])
  @@index([holdExpiresAt])
}`;

  const sampleBackendCode = `// Backend TypeScript Controller: Atomic Seat Hold with Pessimistic Locking
export async function holdSeatsTransaction(
  prisma: PrismaClient,
  redis: Redis,
  params: { showtimeId: string; seatIds: string[]; userId: string; ttlSeconds: number }
) {
  const { showtimeId, seatIds, userId, ttlSeconds } = params;
  
  // 1. Acquire Distributed Redis Redlock (NX EX)
  const lockKey = \`lock:showtime:\${showtimeId}:seats:\${seatIds.sort().join('_')}\`;
  const acquired = await redis.set(lockKey, userId, 'NX', 'EX', ttlSeconds);
  if (!acquired) {
    throw new ConcurrencyConflictError('Seats currently locked by another checkout session');
  }

  // 2. Execute Isolated PostgreSQL Transaction with Row Locks
  return await prisma.$transaction(async (tx) => {
    // SELECT ... FOR UPDATE ensures exclusive row lock
    const seats = await tx.$queryRaw<ShowSeat[]>\`
      SELECT id, status, version 
      FROM show_seats 
      WHERE showtime_id = \${showtimeId}::uuid AND seat_id = ANY(\${seatIds}::uuid[])
      FOR UPDATE
    \`;

    const now = new Date();
    const isAllAvailable = seats.every(
      s => s.status === 'AVAILABLE' || (s.status === 'HELD' && s.holdExpiresAt && s.holdExpiresAt < now)
    );

    if (!isAllAvailable || seats.length !== seatIds.length) {
      throw new ConcurrencyConflictError('One or more seats have already been claimed');
    }

    const expiry = new Date(Date.now() + ttlSeconds * 1000);
    await tx.showSeat.updateMany({
      where: { showtimeId, seatId: { in: seatIds } },
      data: {
        status: 'HELD',
        heldByUserId: userId,
        holdExpiresAt: expiry,
        version: { increment: 1 }
      }
    });

    return { success: true, expiresAt: expiry };
  });
}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </span>
          <h2 className="text-2xl font-black text-white">Engineering Architecture & Deliverables</h2>
        </div>
        <p className="text-xs text-slate-400">
          Complete source deliverables, schemas, concurrency algorithms & System Design Document
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActivePhase('system-design')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activePhase === 'system-design'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>System Design Document (800w)</span>
        </button>

        <button
          onClick={() => setActivePhase('phase1')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activePhase === 'phase1'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Phase 1: DB Architecture & DDL</span>
        </button>

        <button
          onClick={() => setActivePhase('phase2')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activePhase === 'phase2'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Phase 2: Backend & Concurrency Logic</span>
        </button>

        <button
          onClick={() => setActivePhase('phase4-env')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activePhase === 'phase4-env'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Phase 4: .env.example</span>
        </button>

        <button
          onClick={() => setActivePhase('phase4-docker')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activePhase === 'phase4-docker'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Docker Deployment Spec</span>
        </button>
      </div>

      {/* Active Phase Content */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {activePhase === 'system-design' && (
          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase">
                System Design Write-Up & Architectural Specifications
              </span>
              <button
                onClick={() => copyToClipboard(SYSTEM_DESIGN_MARKDOWN, 'sysdoc')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1"
              >
                {copiedKey === 'sysdoc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'sysdoc' ? 'Copied' : 'Copy Doc'}</span>
              </button>
            </div>
            <div className="whitespace-pre-wrap font-sans leading-relaxed">
              {SYSTEM_DESIGN_MARKDOWN}
            </div>
          </div>
        )}

        {activePhase === 'phase1' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Phase 1: Prisma Schema & Row Lock Indices</h3>
                <p className="text-xs text-slate-400">Available at \`/prisma/schema.prisma\` and \`/db/schema.sql\`</p>
              </div>
              <button
                onClick={() => copyToClipboard(samplePrismaCode, 'prisma')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1"
              >
                {copiedKey === 'prisma' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'prisma' ? 'Copied' : 'Copy Snippet'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
              <code>{samplePrismaCode}</code>
            </pre>
          </div>
        )}

        {activePhase === 'phase2' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Phase 2: Atomic Multi-Seat Hold & Lock Engine</h3>
                <p className="text-xs text-slate-400">TypeScript controller with rollback collision isolation</p>
              </div>
              <button
                onClick={() => copyToClipboard(sampleBackendCode, 'backend')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1"
              >
                {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'backend' ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
              <code>{sampleBackendCode}</code>
            </pre>
          </div>
        )}

        {activePhase === 'phase4-env' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Phase 4: .env.example Specification</h3>
              <button
                onClick={() => copyToClipboard(ENV_EXAMPLE_CONTENT, 'env')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1"
              >
                {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
              <code>{ENV_EXAMPLE_CONTENT}</code>
            </pre>
          </div>
        )}

        {activePhase === 'phase4-docker' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Docker Compose & Deployment Architecture</h3>
              <button
                onClick={() => copyToClipboard(DOCKER_SETUP_GUIDE, 'docker')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1"
              >
                {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'docker' ? 'Copied' : 'Copy Compose'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-purple-300 overflow-x-auto">
              <code>{DOCKER_SETUP_GUIDE}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
