-- Mês do saldo de onde a despesa é descontada (AAAA-MM).
-- Preenchido quando uma despesa do mês atual é registrada antes de quitar as contas do mês
-- passado: o mês passado quando vence no mês atual (desconta do saldo exibido) e o mês atual
-- quando vence depois (fica para o próximo salário).
-- Nulo nas demais movimentações, que seguem o mês da data de cadastro.

ALTER TABLE contas
  ADD COLUMN IF NOT EXISTS mes_saldo TEXT;
