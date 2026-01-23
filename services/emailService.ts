// This service handles email connection and processing.
// NOTE: In a pure browser environment (Vite/React), direct IMAP (TCP) is not possible.
// This service simulates the connection or would connect to a backend proxy if available.
// "Not just Google but also Outlook" - handled by generic IMAP config or API wrappers.

import { EmailAccount } from "../types";

export type EmailProvider = 'gmail' | 'outlook';

export class EmailService {
  
  // Simulated "Check Inbox" - In a real app with backend, this would fetch from /api/emails
  async checkInboxes(accounts: EmailAccount[]): Promise<string[]> {
    const findings: string[] = [];

    for (const acc of accounts) {
      if (!acc.email) continue;
      
      // Simulation: Return a random "relevant" email 30% of the time to demonstrate Sentry Mode
      const isGoogle = acc.server.includes('gmail');
      const isOutlook = acc.server.includes('outlook') || acc.server.includes('office365');
      
      
      if (Math.random() > 0.4) {
        if (isOutlook) {
             // Simulated findings from the specific screenshot provided
             findings.push(`[Outlook - ${acc.email}]: From: "Vash Puno"; Subject: "You have to attend!"; Body: "For January 23 2026 at 7:00 PM you have to attend the meeting for our organization PUP Microsoft Student Community at PUP S501"`);
        } else {
             // Generic simulation for others
             const type = isGoogle ? "GMail" : "Email";
             findings.push(`[${type} - ${acc.email}]: Subject: "Urgent Meeting Change" - Body: "Hi, the team meeting is moved to 3 PM today due to conflict."`);
        }
      }
    }

    return findings;
  }
}
