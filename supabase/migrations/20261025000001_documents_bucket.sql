-- Garante o bucket privado de documentos em instalações novas (VPS/self-hosted).
-- No ambiente antigo o bucket foi criado pelo painel; aqui fica versionado.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('jmg-documents', 'jmg-documents', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
