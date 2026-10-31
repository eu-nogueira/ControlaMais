-- Simulações financeiras salvas pelo usuário.
-- Totalmente independentes das movimentações: nada aqui altera a tabela contas.
-- entrada: campos como o usuário preencheu (para reabrir a simulação).
-- resultado: resumo da análise no momento em que foi salva (histórico).

CREATE TABLE IF NOT EXISTS simulacoes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
    nome          TEXT        NOT NULL CHECK (char_length(trim(nome)) > 0),
    entrada       JSONB       NOT NULL,
    resultado     JSONB       NOT NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE simulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY simulacoes_do_usuario
    ON simulacoes
   FOR ALL
 USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
