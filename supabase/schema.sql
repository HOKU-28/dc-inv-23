-- Run this in the Supabase SQL Editor before using the app.
-- It creates the tables (if missing), adds any missing columns,
-- enables RLS, and creates anonymous read/write policies.

-- Items table
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  min_stock NUMERIC NOT NULL,
  check_frequency_days INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  barcode TEXT,
  location TEXT,
  updated_at BIGINT
);

-- Ensure all columns exist (safe to re-run)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- Stock logs table
CREATE TABLE IF NOT EXISTS public.stock_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'check', 'add', 'archive')),
  qty NUMERIC NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  recorded_by TEXT,
  created_at BIGINT NOT NULL
);

ALTER TABLE public.stock_logs
  ADD COLUMN IF NOT EXISTS recorded_by TEXT;

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at BIGINT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for the exposed anon key.
-- This is suitable for a small internal app. For production,
-- switch to authenticated users and stricter policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'Allow anonymous select on items') THEN
    CREATE POLICY "Allow anonymous select on items" ON public.items FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'Allow anonymous insert on items') THEN
    CREATE POLICY "Allow anonymous insert on items" ON public.items FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'Allow anonymous update on items') THEN
    CREATE POLICY "Allow anonymous update on items" ON public.items FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'Allow anonymous delete on items') THEN
    CREATE POLICY "Allow anonymous delete on items" ON public.items FOR DELETE TO anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_logs' AND policyname = 'Allow anonymous select on stock_logs') THEN
    CREATE POLICY "Allow anonymous select on stock_logs" ON public.stock_logs FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_logs' AND policyname = 'Allow anonymous insert on stock_logs') THEN
    CREATE POLICY "Allow anonymous insert on stock_logs" ON public.stock_logs FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_logs' AND policyname = 'Allow anonymous update on stock_logs') THEN
    CREATE POLICY "Allow anonymous update on stock_logs" ON public.stock_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_logs' AND policyname = 'Allow anonymous delete on stock_logs') THEN
    CREATE POLICY "Allow anonymous delete on stock_logs" ON public.stock_logs FOR DELETE TO anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales' AND policyname = 'Allow anonymous select on sales') THEN
    CREATE POLICY "Allow anonymous select on sales" ON public.sales FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales' AND policyname = 'Allow anonymous insert on sales') THEN
    CREATE POLICY "Allow anonymous insert on sales" ON public.sales FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales' AND policyname = 'Allow anonymous update on sales') THEN
    CREATE POLICY "Allow anonymous update on sales" ON public.sales FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales' AND policyname = 'Allow anonymous delete on sales') THEN
    CREATE POLICY "Allow anonymous delete on sales" ON public.sales FOR DELETE TO anon USING (true);
  END IF;
END
$$;

-- Refresh PostgREST schema cache so new tables/columns are available immediately
NOTIFY pgrst, 'reload schema';
