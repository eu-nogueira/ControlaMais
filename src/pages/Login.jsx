import './Login.css'
import { useState } from 'react'
import supabase from '../services/supabase'

const MENSAGENS_ERRO = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Já existe uma conta com este e-mail.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'Password should be at least 6 characters.': 'A senha deve ter pelo menos 6 caracteres.',
}

function Login() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const cadastro = modo === 'cadastrar'

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    setErro('')
    setAviso('')

    const { data, error } = cadastro
      ? await supabase.auth.signUp({ email, password: senha })
      : await supabase.auth.signInWithPassword({ email, password: senha })

    setEnviando(false)
    if (error) {
      setErro(MENSAGENS_ERRO[error.message] || error.message)
    } else if (cadastro && !data.session) {
      setAviso('Conta criada. Confirme o cadastro pelo link enviado ao seu e-mail.')
    }
  }

  function alternarModo() {
    setModo(cadastro ? 'entrar' : 'cadastrar')
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
        <p className='login-subtitulo'>{cadastro ? 'Crie sua conta' : 'Entre na sua conta'}</p>

        <label className='login-campo'>
          <span>E-mail</span>
          <input type='email' autoComplete='email' required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

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

        {erro && <p className='login-erro' role='alert'>{erro}</p>}
        {aviso && <p className='login-aviso' role='status'>{aviso}</p>}

        <button type='submit' className='botao botao-primario' disabled={enviando}>
          {enviando ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar'}
        </button>

        <button type='button' className='login-alternar' onClick={alternarModo}>
          {cadastro ? 'Já tenho conta. Entrar' : 'Não tem conta? Cadastre-se'}
        </button>
      </form>
    </main>
  )
}

export default Login
