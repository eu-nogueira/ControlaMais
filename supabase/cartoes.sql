-- Cartões de crédito cadastrados pelo usuário.
-- O limite usado não é armazenado: é calculado no app a partir das despesas
-- da tabela contas cujo campo cartao tem o mesmo nome do cartão.

CREATE TABLE IF NOT EXISTS cartoes (
    id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     UUID           NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
    nome           TEXT           NOT NULL CHECK (char_length(trim(nome)) > 0),
    final          CHAR(4)        CHECK (final ~ '^[0-9]{4}$'),
    limite         NUMERIC(12, 2) NOT NULL CHECK (limite >= 0),
    dia_vencimento SMALLINT       CHECK (dia_vencimento BETWEEN 1 AND 31),
    cor            TEXT,
    criado_em      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cartoes_usuario_nome_unico
    ON cartoes (usuario_id, lower(trim(nome)));

ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cartoes_do_usuario
    ON cartoes
   FOR ALL
 USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
