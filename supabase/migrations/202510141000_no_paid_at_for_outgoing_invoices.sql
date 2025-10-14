-- Ensure Outgoing invoices never receive a paid_at timestamp
-- 1) Backfill: remove any existing paid_at on outgoing invoices
-- 2) Add CHECK constraint to prevent future violations

BEGIN;

-- Backfill cleanup: never store paid_at for outgoing invoices
UPDATE public.buchungen
SET paid_at = NULL
WHERE direction = 'Outgoing'
  AND COALESCE(is_invoice, false) = true
  AND paid_at IS NOT NULL;

-- Add constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_buchungen_no_paid_at_for_outgoing_invoice'
  ) THEN
    ALTER TABLE public.buchungen
      ADD CONSTRAINT chk_buchungen_no_paid_at_for_outgoing_invoice
      CHECK (
        NOT (
          direction = 'Outgoing'
          AND COALESCE(is_invoice, false) = true
          AND paid_at IS NOT NULL
        )
      );
  END IF;
END
$$;

COMMIT;


