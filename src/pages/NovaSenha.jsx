import './Login.css'
import { useState } from 'react'
import supabase from '../services/supabase'

const MENSAGENS_ERRO = {
  'New password should be different from the old password.': 'A nova senha precisa ser diferente da anterior.',
  'Password should be at least 6 characters.': 'A senha deve ter pelo menos 6 caracteres.',
}

function NovaSenha({ onConcluir }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.')
      return
    }

    setEnviando(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)

    if (error) {
      setErro(MENSAGENS_ERRO[error.message] || error.message)
    } else {
      onConcluir()
    }
  }

  return (
    <main className='login'>
      <form className='login-cartao' onSubmit={handleSubmit}>
        <div className='login-marca'>
          <span className='login-logo' aria-hidden='true'>C+</span>
          <h1>Controla+</h1>
        </div>
        <p className='login-subtitulo'>Crie uma nova senha</p>

        <label className='login-campo'>
          <span>Nova senha</span>
          <input type='password' autoComplete='new-password' minLength={6} required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>

        <label className='login-campo'>
          <span>Confirme a nova senha</span>
          <input type='password' autoComplete='new-password' minLength={6} required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </label>

        {erro && <p className='login-erro' role='alert'>{erro}</p>}

        <button type='submit' className='botao botao-primario' disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  )
}

export default NovaSenha
