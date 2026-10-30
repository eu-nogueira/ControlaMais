import './Login.css'
import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import supabase from '../services/supabase'
import { definirLembrar, deveLembrar, emailLembrado } from '../services/armazenamentoSessao'

const MENSAGENS_ERRO = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Já existe uma conta com este e-mail.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'Password should be at least 6 characters.': 'A senha deve ter pelo menos 6 caracteres.',
  'Email link is invalid or has expired': 'O link de redefinição expirou ou já foi usado. Peça um novo.',
}

const SUBTITULOS = {
  entrar: 'Entre na sua conta',
  cadastrar: 'Crie sua conta',
  recuperar: 'Informe seu e-mail para receber o link de redefinição de senha',
}

// No APK o endereço do app (https://localhost) não abre fora dele, então o link
// do e-mail aponta para o site publicado.
function enderecoRedefinicao() {
  if (import.meta.env.VITE_SITE_URL) return import.meta.env.VITE_SITE_URL
  return Capacitor.isNativePlatform() ? undefined : window.location.origin
}

function Login({ erroInicial = '' }) {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState(emailLembrado)
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(deveLembrar)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(MENSAGENS_ERRO[erroInicial] || erroInicial)
  const [aviso, setAviso] = useState('')

  const cadastro = modo === 'cadastrar'
  const recuperacao = modo === 'recuperar'

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    setErro('')
    setAviso('')

    if (recuperacao) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoRedefinicao() })
      setEnviando(false)
      if (error) setErro(MENSAGENS_ERRO[error.message] || error.message)
      else setAviso('Se existir uma conta com este e-mail, você vai receber um link para criar uma nova senha.')
      return
    }

    definirLembrar(lembrar, email.trim())

    const { data, error } = cadastro
      ? await supabase.auth.signUp({ email, password: senha, options: { data: { nome: nome.trim() } } })
      : await supabase.auth.signInWithPassword({ email, password: senha })

    setEnviando(false)
    if (error) {
      setErro(MENSAGENS_ERRO[error.message] || error.message)
    } else if (cadastro && !data.session) {
      setAviso('Conta criada. Confirme o cadastro pelo link enviado ao seu e-mail.')
    }
  }

  function alterarModo(novoModo) {
    setModo(novoModo)
    setErro('')
    setAviso('')
  }

  return (
    <main className='login'>
      <form className='login-cartao' onSubmit={handleSubmit}>
        <div className='login-marca'>
          <span className='login-logo' aria-hidden='true'>C+</span>
          <h1>Controla+</h1>
        </div>
        <p className='login-subtitulo'>{SUBTITULOS[modo]}</p>

        {cadastro && (
          <label className='login-campo'>
            <span>Nome</span>
            <input type='text' autoComplete='given-name' required value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
        )}

        <label className='login-campo'>
          <span>E-mail</span>
          <input type='email' autoComplete='email' required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        {!recuperacao && (
          <label className='login-campo'>
            <span>Senha</span>
            <input
              type='password'
              autoComplete={cadastro ? 'new-password' : 'current-password'}
              minLength={6}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
        )}

        {!recuperacao && (
          <div className='login-opcoes'>
            <label className='login-lembrar'>
              <input type='checkbox' checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              <span>Lembrar de mim</span>
            </label>
            {!cadastro && (
              <button type='button' className='login-esqueci' onClick={() => alterarModo('recuperar')}>
                Esqueci minha senha
              </button>
            )}
          </div>
        )}

        {erro && <p className='login-erro' role='alert'>{erro}</p>}
        {aviso && <p className='login-aviso' role='status'>{aviso}</p>}

        <button type='submit' className='botao botao-primario' disabled={enviando}>
          {enviando ? 'Aguarde...' : recuperacao ? 'Enviar link' : cadastro ? 'Criar conta' : 'Entrar'}
        </button>

        <button type='button' className='login-alternar' onClick={() => alterarModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}>
          {modo === 'entrar' ? 'Não tem conta? Cadastre-se' : 'Voltar para o login'}
        </button>
      </form>
    </main>
  )
}

export default Login
