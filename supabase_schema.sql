-- ==============================================================================
-- MAG Seguros / Capitalização - Tabela de Controle de Formulários de Propostas
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Criação da tabela de formulários de propostas
CREATE TABLE IF NOT EXISTS public.form_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Controle de Status e Etapas
    status VARCHAR(50) DEFAULT 'pendente' NOT NULL, -- 'pendente', 'completo', 'cancelado'
    current_step INTEGER DEFAULT 1 NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    finish_date TIMESTAMP WITH TIME ZONE,
    
    -- Dados do Produto Selecionado
    product_id TEXT,
    product_name TEXT,
    offer_name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_value NUMERIC(15, 2) DEFAULT 0,
    total_value NUMERIC(15, 2) DEFAULT 0,
    month_term INTEGER DEFAULT 0,
    rescue_value NUMERIC(15, 2) DEFAULT 0,
    
    -- Dados do Parceiro / Origem
    partner_cnpj TEXT,
    partner_name TEXT,
    
    -- Etapa 1: Identificação do Cliente
    client_type VARCHAR(20) DEFAULT 'fisica', -- 'fisica' ou 'juridica'
    document_number TEXT,                      -- CPF ou CNPJ
    
    -- Etapa 2: Dados de Cadastro (Pessoa Física ou Jurídica)
    form_data JSONB DEFAULT '{}'::jsonb,
    
    -- Etapa 3: Dados de Pagamento (Banco, Agência, Conta)
    payment_data JSONB DEFAULT '{}'::jsonb,
    
    -- Etapa 5: Assinatura por Token
    token_method VARCHAR(20),                 -- 'sms' ou 'email'
    token_code VARCHAR(10),
    
    -- Etapa 6: Proposta Gerada
    proposal_number TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criação de índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_form_proposals_status ON public.form_proposals (status);
CREATE INDEX IF NOT EXISTS idx_form_proposals_partner_cnpj ON public.form_proposals (partner_cnpj);
CREATE INDEX IF NOT EXISTS idx_form_proposals_document_number ON public.form_proposals (document_number);
CREATE INDEX IF NOT EXISTS idx_form_proposals_created_at ON public.form_proposals (created_at DESC);

-- 3. Trigger para atualização automática da coluna updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_form_proposals_updated_at ON public.form_proposals;

CREATE TRIGGER trigger_update_form_proposals_updated_at
BEFORE UPDATE ON public.form_proposals
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. Configuração de Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.form_proposals ENABLE ROW LEVEL SECURITY;

-- Permite leitura anônima/pública (para o fluxo da aplicação)
CREATE POLICY "Permitir leitura de propostas"
ON public.form_proposals FOR SELECT
USING (true);

-- Permite inserção de novos formulários
CREATE POLICY "Permitir insercao de propostas"
ON public.form_proposals FOR INSERT
WITH CHECK (true);

-- Permite atualização do formulário etapa por etapa
CREATE POLICY "Permitir atualizacao de propostas"
ON public.form_proposals FOR UPDATE
USING (true)
WITH CHECK (true);
