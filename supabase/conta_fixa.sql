-- Conta fixa: despesa recorrente sem número máximo de parcelas (ex.: aluguel).
-- Aparece todo mês em Parcelas, mas não soma em "Falta pagar".

ALTER TABLE contas
  ADD COLUMN IF NOT EXISTS conta_fixa BOOLEAN NOT NULL DEFAULT FALSE;
