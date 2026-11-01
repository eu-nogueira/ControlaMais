-- Versões do aplicativo Android distribuídas por APK (fora da Play Store).
-- Ao abrir, o app compara o versionCode instalado com codigo_versao e, se houver versão maior,
-- avisa o usuário e baixa o APK de url_apk para instalar.
-- codigo_versao: o versionCode do android/app/build.gradle (precisa crescer a cada versão).
-- obrigatoria: o aviso não pode ser dispensado enquanto essa versão (ou uma posterior) não for instalada.
--
-- Para publicar uma versão:
--   1. Aumentar versionCode e versionName em android/app/build.gradle e gerar o APK assinado
--      (sempre com a mesma chave, ou o Android recusa a atualização).
--   2. Enviar o APK para o bucket apk do Storage.
--   3. Registrar a versão:
--      INSERT INTO versoes_app (codigo_versao, nome_versao, url_apk, notas, obrigatoria)
--      VALUES (2, '1.1', 'https://<projeto>.supabase.co/storage/v1/object/public/apk/controlamais-1.1.apk', 'Correções na simulação.', false);

CREATE TABLE IF NOT EXISTS versoes_app (
    codigo_versao INTEGER     PRIMARY KEY CHECK (codigo_versao > 0),
    nome_versao   TEXT        NOT NULL CHECK (char_length(trim(nome_versao)) > 0),
    url_apk       TEXT        NOT NULL,
    notas         TEXT,
    obrigatoria   BOOLEAN     NOT NULL DEFAULT false,
    publicada_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE versoes_app ENABLE ROW LEVEL SECURITY;

-- Somente leitura para usuários autenticados; versões são cadastradas pelo painel do Supabase.
CREATE POLICY versoes_app_leitura
    ON versoes_app
   FOR SELECT
    TO authenticated
 USING (true);

-- Bucket público com os APKs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('apk', 'apk', true)
    ON CONFLICT (id) DO NOTHING;
