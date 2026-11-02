/**
 * Server-only YCloud WhatsApp Business API sender.
 * Never import this file from client code; the API key must stay on the server.
 */
import { internationalPhone } from "./audit-phone";
import type { StoredProfileImage } from "./profile-screenshots";

export type AuditWhatsAppDetails = { website: string | null; social_media: string | null; instagram?: string | null; facebook?: string | null; tiktok?: string | null; x?: string | null; linkedin?: string | null; profile_screenshots: StoredProfileImage[]; screenshot_path: string | null };

const YCLOUD_MESSAGES_URL = "https://api.ycloud.com/v2/whatsapp/messages";
const SENDER = "+2349034340796";
const TEMPLATE_NAME = "audit_received";

/** Send the audit-received template message. Throws on failure; callers must catch. */
export async function sendAuditWhatsApp(customerName: string, customerPhone: string, _details?: AuditWhatsAppDetails): Promise<void> {
  // Separate audit details are accepted internally; the approved name-only template remains unchanged.
  const apiKey = process.env["YCLOUD_API_KEY"];
  if (!apiKey) throw new Error("YCLOUD_API_KEY is not configured");
  const recipientDigits = internationalPhone(customerPhone).replace(/^\+/, "");

  const response = await fetch(YCLOUD_MESSAGES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: SENDER,
      to: recipientDigits,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: customerName }],
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    // Log status only; the response body may echo request details.
    console.error(`YCloud WhatsApp send failed with status ${response.status}.`);
    throw new Error(`WhatsApp send failed (${response.status})`);
  }
}
