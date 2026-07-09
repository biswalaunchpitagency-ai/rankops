import { Router } from "express";
import multer from "multer";
import Parse from "@sendgrid/inbound-mail-parser";
import { inboundEmailSchema } from "core/schemas/tickets.ts";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";
import { validate } from "../lib/validate";
import { parseFromField, processIncomingEmail } from "../lib/incoming-email";

const upload = multer();
const router = Router();

router.post("/inbound-email", requireWebhookSecret, upload.any(), async (req, res) => {
  const parser = new Parse(
    { keys: ["to", "from", "subject", "text", "html"] },
    { body: req.body, files: (req.files as Express.Multer.File[]) || [] }
  );
  const parsed = parser.keyValues();
  const { email, name } = parseFromField(parsed.from || "");

  const data = validate(inboundEmailSchema, {
    from: email,
    fromName: name,
    subject: parsed.subject || "",
    body: parsed.text || "",
    bodyHtml: parsed.html || undefined,
  }, res);
  if (!data) return;

  const result = await processIncomingEmail({
    fromEmail: data.from,
    fromName: data.fromName,
    subject: data.subject,
    body: data.body,
    bodyHtml: data.bodyHtml,
  });

  if (result.type === "reply") {
    res.status(200).json({ ticket: result.ticket, reply: result.reply });
  } else {
    res.status(201).json({ ticket: result.ticket });
  }
});

export default router;
