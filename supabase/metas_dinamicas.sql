-- Meta dinâmica: economia progressiva. O depósito de cada mês é
-- valor_inicial + incremento × (número do mês - 1), durante `duracao` meses a partir de `inicio`.
-- Cada depósito registrado guarda em mes_referencia o número do mês do plano a que pertence.
-- status: ativa, pausada (pausada_em guarda desde quando) ou encerrada; vale para todos os tipos.
-- Executar depois de metas.sql. Pode ser executado mais de uma vez.

ALTER TABLE metas
  ADD COLUMN IF NOT EXISTS valor_inicial NUMERIC(12, 2) CHECK (valor_inicial > 0),
  ADD COLUMN IF NOT EXISTS incremento    NUMERIC(12, 2) CHECK (incremento >= 0),
  ADD COLUMN IF NOT EXISTS duracao       SMALLINT       CHECK (duracao BETWEEN 1 AND 600),
  ADD COLUMN IF NOT EXISTS inicio        DATE,
  ADD COLUMN IF NOT EXISTS status        TEXT           NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'encerrada')),
  ADD COLUMN IF NOT EXISTS pausada_em    DATE;

-- As regras de tipo criadas em metas.sql não têm nome fixo: remove as que citam a coluna tipo
-- e recria com nome, incluindo o tipo dinamica.
DO $$
DECLARE
    restricao RECORD;
BEGIN
    FOR restricao IN
        SELECT pg_constraint.conname AS nome
          FROM pg_constraint
         WHERE pg_constraint.conrelid = 'metas'::regclass
           AND pg_constraint.contype = 'c'
           AND pg_get_constraintdef(pg_constraint.oid) LIKE '%tipo%'
    LOOP
        EXECUTE format('ALTER TABLE metas DROP CONSTRAINT %I', restricao.nome);
    END LOOP;
END $$;

ALTER TABLE metas
  ADD CONSTRAINT metas_tipo_valido CHECK (tipo IN ('meta', 'reserva', 'dinamica')),
  ADD CONSTRAINT metas_meta_com_valor CHECK (tipo <> 'meta' OR valor_alvo IS NOT NULL),
  ADD CONSTRAINT metas_dinamica_completa CHECK (
      tipo <> 'dinamica'
      OR (valor_inicial IS NOT NULL AND incremento IS NOT NULL AND duracao IS NOT NULL AND inicio IS NOT NULL)
  );

ALTER TABLE metas_movimentos
  ADD COLUMN IF NOT EXISTS mes_referencia SMALLINT CHECK (mes_referencia >= 1);

-- Um depósito por mês do plano.
CREATE UNIQUE INDEX IF NOT EXISTS metas_movimentos_mes_unico
    ON metas_movimentos (meta_id, mes_referencia)
 WHERE mes_referencia IS NOT NULL;
