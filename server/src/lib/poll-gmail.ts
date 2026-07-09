import Sentry from "./sentry";
import { parseFromField, processIncomingEmail } from "./incoming-email";

let intervalId: NodeJS.Timeout | null = null;

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: GmailMessageHeader[];
  body?: {
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers: GmailMessageHeader[];
    body?: {
      size: number;
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
}

function getHeader(headers: GmailMessageHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function parseMessageBody(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";

  function traverse(part: GmailMessagePart) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text += Buffer.from(part.body.data, "base64url").toString("utf8");
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html += Buffer.from(part.body.data, "base64url").toString("utf8");
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  }

  if (payload.body?.data) {
    if (payload.mimeType === "text/plain") {
      text = Buffer.from(payload.body.data, "base64url").toString("utf8");
    } else if (payload.mimeType === "text/html") {
      html = Buffer.from(payload.body.data, "base64url").toString("utf8");
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      traverse(part);
    }
  }

  return { text, html };
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SMTP_CLIENT_ID;
  const clientSecret = process.env.SMTP_CLIENT_SECRET;
  const refreshToken = process.env.SMTP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth2 credentials (SMTP_CLIENT_ID, SMTP_CLIENT_SECRET, SMTP_REFRESH_TOKEN)");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh Google access token: ${response.statusText} - ${errText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

export async function pollGmailOnce() {
  try {
    const accessToken = await getAccessToken();

    // List unread messages in the Primary inbox only, maximum 5 at a time
    const query = encodeURIComponent("is:unread category:primary");
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`;
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list unread Gmail messages: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json() as { messages?: { id: string; threadId: string }[] };
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return;
    }

    console.log(`[Gmail Poller] Found ${messages.length} unread message(s) to process.`);

    for (const msg of messages) {
      try {
        // Fetch message detail
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`;
        const detailResponse = await fetch(detailUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!detailResponse.ok) {
          console.error(`[Gmail Poller] Failed to fetch message ${msg.id}: ${detailResponse.statusText}`);
          continue;
        }

        const msgDetail = await detailResponse.json() as GmailMessageDetail;
        if (!msgDetail.payload) {
          console.warn(`[Gmail Poller] Message ${msg.id} has no payload.`);
          continue;
        }

        const headers = msgDetail.payload.headers || [];
        const fromHeader = getHeader(headers, "from");
        const subjectHeader = getHeader(headers, "subject") || "(No Subject)";
        console.log(`[Gmail Poller] Found message ${msg.id} from ${fromHeader} with subject ${subjectHeader}`);
        if (!fromHeader) {
          console.warn(`[Gmail Poller] Message ${msg.id} has no From header.`);
          continue;
        }

        const { email: fromEmail, name: fromName } = parseFromField(fromHeader);
        const { text: bodyText, html: bodyHtml } = parseMessageBody(msgDetail.payload);

        // Process message as ticket or reply
        const result = await processIncomingEmail({
          fromEmail,
          fromName,
          subject: subjectHeader,
          body: bodyText || msgDetail.snippet || "",
          bodyHtml: bodyHtml || undefined,
        });

        console.log(`[Gmail Poller] Successfully processed message ${msg.id} as a new ${result.type}.`);

        // Mark message as read (remove UNREAD label)
        const modifyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`;
        const modifyResponse = await fetch(modifyUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            removeLabelIds: ["UNREAD"],
          }),
        });

        if (!modifyResponse.ok) {
          console.error(`[Gmail Poller] Failed to mark message ${msg.id} as read: ${modifyResponse.statusText}`);
        } else {
          console.log(`[Gmail Poller] Marked message ${msg.id} as read.`);
        }
      } catch (msgError) {
        console.error(`[Gmail Poller] Error processing individual message ${msg.id}:`, msgError);
        Sentry.captureException(msgError);
      }
    }
  } catch (error) {
    console.error("[Gmail Poller] Error in polling cycle:", error);
    Sentry.captureException(error);
  }
}

export function startGmailPolling(intervalMs: number = 60000) {
  const isEnabled = process.env.ENABLE_GMAIL_POLLING === "true";
  if (!isEnabled) {
    console.log("[Gmail Poller] Polling is disabled via ENABLE_GMAIL_POLLING=false in .env");
    return;
  }

  const clientId = process.env.SMTP_CLIENT_ID;
  const clientSecret = process.env.SMTP_CLIENT_SECRET;
  const refreshToken = process.env.SMTP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[Gmail Poller] Missing Google OAuth2 credentials. Polling disabled.");
    return;
  }

  if (intervalId) {
    clearInterval(intervalId);
  }

  console.log(`[Gmail Poller] Initializing Gmail API polling every ${intervalMs / 1000}s...`);

  // Run once immediately on start
  pollGmailOnce();

  // Schedule periodic polling
  intervalId = setInterval(() => {
    pollGmailOnce();
  }, intervalMs);
}

export function stopGmailPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Gmail Poller] Gmail API polling stopped.");
  }
}
