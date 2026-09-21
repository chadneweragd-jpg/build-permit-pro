import { Permit, SavedSearch } from '@/types';

export function generateDailyDigestHTML(options: {
  recipientEmail: string;
  savedSearchName: string;
  hubName: string;
  matchedPermits: Permit[];
  dateString?: string;
}): string {
  const { recipientEmail, savedSearchName, hubName, matchedPermits, dateString = new Date().toLocaleDateString('en-CA', { dateStyle: 'full' }) } = options;

  const totalValue = matchedPermits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
  const formattedTotal = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(totalValue);

  const permitCardsHtml = matchedPermits.slice(0, 8).map((permit) => {
    const valFormatted = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(permit.estimated_value);
    const tradesBadges = permit.trades.map(t => 
      `<span style="display:inline-block; background-color:${t.color}20; color:${t.color}; border:1px solid ${t.color}60; font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; margin-right:6px; margin-bottom:4px;">${t.name}</span>`
    ).join('');

    return `
      <div style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <span style="background-color:#1e293b; color:#ffffff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:0.5px;">${permit.permit_number}</span>
            <span style="color:#64748b; font-size:12px; margin-left:8px;">Issued: ${permit.issue_date}</span>
          </div>
          <div style="font-size:16px; font-weight:800; color:#16a34a;">${valFormatted}</div>
        </div>
        <h3 style="margin:6px 0; font-size:16px; color:#0f172a;">${permit.address}</h3>
        <p style="margin:4px 0 10px 0; font-size:13px; color:#475569; line-height:1.4;">
          <strong>Estimator Summary:</strong> ${permit.ai_summary}
        </p>
        <div style="margin-top:10px;">
          ${tradesBadges}
        </div>
        <div style="margin-top:12px; padding-top:10px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b;">
          <span>Contractor: <strong>${permit.contractor_name || 'Not Listed'}</strong></span>
          <a href="http://localhost:3000/?permit=${permit.permit_number}" style="color:#2563eb; text-decoration:none; font-weight:600;">View in BPP Scout &rarr;</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Build Permit Pro - 6:00 AM Daily Permit Intelligence</title>
      </head>
      <body style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color:#f8fafc; margin:0; padding:24px; color:#1e293b;">
        <div style="max-width:680px; margin:0 auto; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;">
          <!-- Header Banner -->
          <div style="background-color:#0f172a; padding:28px 24px; color:#ffffff; border-bottom:4px solid #16a34a;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">BUILD PERMIT PRO</h1>
                <p style="margin:4px 0 0 0; font-size:13px; color:#94a3b8;">Commercial Contractor Intelligence &bull; ${hubName}</p>
              </div>
              <div style="text-align:right;">
                <span style="background-color:#16a34a; color:#ffffff; font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px;">DAILY 6:00 AM DIGEST</span>
                <p style="margin:4px 0 0 0; font-size:11px; color:#94a3b8;">${dateString}</p>
              </div>
            </div>
          </div>

          <!-- Summary Metric Box -->
          <div style="background-color:#f1f5f9; padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:12px; color:#64748b; text-transform:uppercase; font-weight:600;">Saved Filter:</span>
              <strong style="color:#0f172a; margin-left:6px;">${savedSearchName}</strong>
            </div>
            <div style="text-align:right;">
              <span style="font-size:13px; color:#0f172a; font-weight:700;">${matchedPermits.length} New Permits</span>
              <span style="color:#64748b; margin:0 6px;">|</span>
              <span style="font-size:13px; color:#16a34a; font-weight:800;">${formattedTotal} Valuation</span>
            </div>
          </div>

          <!-- Permit Cards -->
          <div style="padding:24px;">
            ${permitCardsHtml}
          </div>

          <!-- Footer -->
          <div style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 24px; text-align:center; font-size:12px; color:#64748b;">
            <p style="margin:0 0 8px 0;">This automated daily intelligence alert was dispatched to <strong>${recipientEmail}</strong>.</p>
            <p style="margin:0;">&copy; 2026 Build Permit Pro &bull; Canadian Regional Construction Intelligence.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
