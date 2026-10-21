CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailOutbox_requestId_fkey"
        FOREIGN KEY ("requestId")
        REFERENCES "AppointmentRequest" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailOutbox_requestId_eventType_key"
ON "EmailOutbox" ("requestId", "eventType");

CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx"
ON "EmailOutbox" ("status", "nextAttemptAt");
