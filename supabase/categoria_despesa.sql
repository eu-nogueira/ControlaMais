-- Tipo da despesa (Alimentação, Transporte, Lazer ou texto livre em "Outros").
-- Opcional e usado apenas nos gráficos do Dashboard.

ALTER TABLE contas
  ADD COLUMN IF NOT EXISTS categoria TEXT;
