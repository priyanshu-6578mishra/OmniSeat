// ============================================================================
// EMAIL DISPATCH & HTML TICKET TEMPLATE GENERATOR
// Simulates Resend / Nodemailer dispatch with tamper-proof QR codes & Waitlist Offers
// ============================================================================

import { Booking, WaitlistEntry } from '../types';

export interface EmailDispatchPayload {
  id: string;
  to: string;
  subject: string;
  templateType: 'BOOKING_CONFIRMATION' | 'WAITLIST_OFFER_ALERT' | 'BOOKING_CANCELLATION';
  htmlContent: string;
  sentAt: string;
}

export function generateBookingEmailHtml(booking: Booking): string {
  const seatsList = booking.items
    .map((item) => `<li style="margin-bottom: 4px;"><strong>${item.category}</strong> - Row ${item.seatSummary.row}, Seat ${item.seatSummary.number} (${item.seatSummary.section}) - ₹${(item.priceCents / 100).toFixed(2)}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #151c2e; border: 1px solid #2d3748; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center; color: white; }
    .content { padding: 24px; }
    .ticket-card { background: #1e293b; border: 1px dashed #475569; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center; }
    .qr-image { width: 200px; height: 200px; border-radius: 8px; background: white; padding: 8px; margin: 12px auto; display: block; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #10b981; color: white; }
    .footer { padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #2d3748; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🎟️ Your Tickets Are Confirmed!</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9;">Booking Ref: <strong>${booking.bookingReference}</strong></p>
    </div>
    <div class="content">
      <p>Hi <strong>${booking.userName}</strong>,</p>
      <p>Your seats are securely locked in for <strong>${booking.event.title}</strong>.</p>
      
      <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0;"><strong>📍 Venue:</strong> ${booking.venue.name} (${booking.venue.city}, ${booking.venue.state || ''})</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Showtime:</strong> ${new Date(booking.showtime.startTime).toLocaleString()}</p>
        <p style="margin: 0;"><strong>💰 Total Paid:</strong> ₹${(booking.totalAmountCents / 100).toFixed(2)} INR <span class="badge">PAID</span></p>
      </div>

      <h3>Assigned Seats (${booking.items.length})</h3>
      <ul>${seatsList}</ul>

      <div class="ticket-card">
        <h4 style="margin: 0 0 8px 0; color: #38bdf8;">Tamper-Proof Gate Entry QR</h4>
        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 12px 0;">Scan at door scanner with staff on arrival</p>
        ${booking.qrCodeDataUrl ? `<img src="${booking.qrCodeDataUrl}" class="qr-image" alt="Gate Pass QR" />` : '<div style="padding: 20px; background: white; color: black;">[QR PASS]</div>'}
        <p style="font-size: 11px; color: #64748b; margin-top: 8px; word-break: break-all;">HMAC-SHA256 Sig: ${booking.qrPayloadSignature.slice(0, 24)}...</p>
      </div>
    </div>
    <div class="footer">
      Powered by OmniSeat High-Concurrency Engine &bull; Zero Double-Booking Protection
    </div>
  </div>
</body>
</html>
  `;
}

export function generateWaitlistOfferEmailHtml(entry: WaitlistEntry, claimUrl: string): string {
  const expiryFormatted = entry.offerExpiresAt
    ? new Date(entry.offerExpiresAt).toLocaleTimeString()
    : '15 minutes';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #151c2e; border: 1px solid #2d3748; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center; color: white; }
    .btn { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">⚡ Great News! A Seat Just Opened Up!</h1>
      <p style="margin: 4px 0 0 0;">Priority Waitlist Offer Notification</p>
    </div>
    <div class="content" style="padding: 24px;">
      <p>Hi <strong>${entry.userName}</strong>,</p>
      <p>You reached the top of the waitlist for <strong>${entry.eventTitle}</strong> (${entry.category} Tier)!</p>
      
      <div style="background: #0f172a; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 6px 0;"><strong>Offered Seat:</strong> ${entry.offeredSeatSummary || entry.category + ' Seat'}</p>
        <p style="margin: 0;"><strong>⏳ Time to Claim:</strong> Exclusive window closes at <strong>${expiryFormatted}</strong> (15 min TTL).</p>
      </div>

      <p style="margin-top: 18px;">Click below to claim and confirm your booking before the offer automatically cascades to the next candidate in line:</p>

      <div style="text-align: center;">
        <a href="${claimUrl}" class="btn">🚀 Claim & Book My Seat Now</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
        Signed Token: <code>${entry.claimToken}</code>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
