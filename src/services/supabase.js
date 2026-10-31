import { createClient } from '@supabase/supabase-js'
import armazenamentoSessao from './armazenamentoSessao'

// Lido antes de o cliente limpar a URL ao processar o link recebido por e-mail.
const parametrosLink = new URLSearchParams(window.location.hash.slice(1))
export const chegouPorRecuperacao = parametrosLink.get('type') === 'recovery'
export const erroLinkAutenticacao = parametrosLink.get('error_description')

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            storage: armazenamentoSessao,
            persistSession: true,
            autoRefreshToken: true
        }
    }
)

const MENSAGENS_ERRO_SENHA = {
    'New password should be different from the old password.': 'A nova senha precisa ser diferente da anterior.',
    'Password should be at least 6 characters.': 'A senha deve ter pelo menos 6 caracteres.',
}

export function traduzirErroSenha(error) {
    return MENSAGENS_ERRO_SENHA[error.message] || error.message
}

export default supabase
