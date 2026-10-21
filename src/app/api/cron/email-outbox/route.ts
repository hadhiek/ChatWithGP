import { processEmailOutbox } from "@/lib/email-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[email-outbox] CRON_SECRET is not configured");
    return Response.json({ error: "Worker is not configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || supplied.length !== secret.length ||
      !cryptoSafeEqual(supplied, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processEmailOutbox();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[email-outbox] Worker run failed", error);
    return Response.json({ error: "Email worker failed to run" }, { status: 500 });
  }
}

function cryptoSafeEqual(a: string, b: string) {
  // Constant-time comparison for equal-length UTF-8 secrets.
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}
