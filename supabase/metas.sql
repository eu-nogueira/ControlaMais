-- Metas (objetivo com valor e prazo) e reservas (dinheiro guardado sem prazo, como a de emergência).
-- O dinheiro guardado sai da sobra do mês, que fica na conta para débito: nada aqui altera a tabela
-- contas nem o saldo disponível. O valor guardado é a soma dos movimentos de cada meta.

CREATE TABLE IF NOT EXISTS metas (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID           NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
    nome        TEXT           NOT NULL CHECK (char_length(trim(nome)) > 0),
    tipo        TEXT           NOT NULL CHECK (tipo IN ('meta', 'reserva')),
    valor_alvo  NUMERIC(12, 2) CHECK (valor_alvo > 0),
    prazo       DATE,
    criado_em   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CHECK (tipo = 'reserva' OR valor_alvo IS NOT NULL)
);

-- valor positivo: dinheiro guardado; negativo: dinheiro resgatado.
CREATE TABLE IF NOT EXISTS metas_movimentos (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID           NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
    meta_id     UUID           NOT NULL REFERENCES metas (id) ON DELETE CASCADE,
    valor       NUMERIC(12, 2) NOT NULL CHECK (valor <> 0),
    data        DATE           NOT NULL DEFAULT current_date,
    criado_em   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metas_movimentos_meta
    ON metas_movimentos (meta_id);

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

ALTER TABLE metas_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY metas_do_usuario
    ON metas
   FOR ALL
 USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY metas_movimentos_do_usuario
    ON metas_movimentos
   FOR ALL
 USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid()
              AND EXISTS (
                  SELECT 1
                    FROM metas
                   WHERE metas.id = metas_movimentos.meta_id
                     AND metas.usuario_id = auth.uid()
                  ));
