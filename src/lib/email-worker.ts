import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const STALE_AFTER_MS = 10 * 60 * 1000;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASSWORD and a valid SMTP_PORT must be configured");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

function retryDelayMs(attempt: number) {
  return Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempt - 1));
}

export async function processEmailOutbox() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MS);

  // Recover jobs left in PROCESSING after a server crash.
  await prisma.emailOutbox.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleBefore }, attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "PENDING", nextAttemptAt: now },
  });
  await prisma.emailOutbox.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleBefore }, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: "FAILED", lastError: "Worker stopped before completing delivery" },
  });

  const jobs = await prisma.emailOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  if (jobs.length === 0) return { processed: 0, sent: 0, failed: 0 };

  const transport = getTransport();
  const fromName = process.env.EMAIL_FROM_NAME || "ChatWithGP";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER;
  if (!fromAddress) throw new Error("EMAIL_FROM_ADDRESS or SMTP_USER must be configured");

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    // Conditional claim prevents two overlapping cron runs from sending the same job.
    const claim = await prisma.emailOutbox.updateMany({
      where: { id: job.id, status: "PENDING", nextAttemptAt: { lte: new Date() } },
      data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
    });
    if (claim.count !== 1) continue;

    processed += 1;
    const attempt = job.attempts + 1;
    try {
      await transport.sendMail({
        from: { name: fromName, address: fromAddress },
        to: job.recipient,
        subject: job.subject,
        text: job.text,
        html: job.html,
      });
      await prisma.emailOutbox.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SMTP error";
      const isFinal = attempt >= MAX_ATTEMPTS;
      await prisma.emailOutbox.update({
        where: { id: job.id },
        data: {
          status: isFinal ? "FAILED" : "PENDING",
          lastError: message.slice(0, 2000),
          nextAttemptAt: new Date(Date.now() + retryDelayMs(attempt)),
        },
      });
      failed += 1;
      console.error("[email-outbox] Delivery failed", { jobId: job.id, attempt, isFinal, message });
    }
  }

  return { processed, sent, failed };
}
