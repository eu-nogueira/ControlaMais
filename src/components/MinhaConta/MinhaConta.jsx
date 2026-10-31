import { useState } from 'react'
import supabase, { traduzirErroSenha } from '../../services/supabase'
import './MinhaConta.css'

function MinhaConta({ usuario }) {
  const nomeAtual = usuario.user_metadata?.nome ?? ''
  const [nome, setNome] = useState(nomeAtual)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [retornoNome, setRetornoNome] = useState(null)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [retornoSenha, setRetornoSenha] = useState(null)

  async function handleSalvarNome(event) {
    event.preventDefault()
    setSalvandoNome(true)
    setRetornoNome(null)
    const { error } = await supabase.auth.updateUser({ data: { nome: nome.trim() } })
    setSalvandoNome(false)

    setRetornoNome(error
      ? { erro: true, mensagem: error.message }
      : { erro: false, mensagem: 'Nome atualizado.' })
  }

  async function handleSalvarSenha(event) {
    event.preventDefault()
    if (senha !== confirmacao) {
      setRetornoSenha({ erro: true, mensagem: 'As senhas não conferem.' })
      return
    }

    setSalvandoSenha(true)
    setRetornoSenha(null)

    // O Supabase não valida a senha atual no updateUser, então ela é conferida com um novo login.
    const { error: erroSenhaAtual } = await supabase.auth.signInWithPassword({ email: usuario.email, password: senhaAtual })
    if (erroSenhaAtual) {
      setSalvandoSenha(false)
      setRetornoSenha({ erro: true, mensagem: 'Senha atual incorreta.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvandoSenha(false)

    if (error) {
      setRetornoSenha({ erro: true, mensagem: traduzirErroSenha(error) })
    } else {
      setSenhaAtual('')
      setSenha('')
      setConfirmacao('')
      setRetornoSenha({ erro: false, mensagem: 'Senha alterada.' })
    }
  }

  return (
    <div className='minha-conta'>
      <p className='minha-conta-email'>{usuario.email}</p>

      <form className='minha-conta-secao' onSubmit={handleSalvarNome}>
        <h3>Nome</h3>
        <label className='minha-conta-campo'>
          <span>Como quer ser chamado?</span>
          <input type='text' autoComplete='name' required value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        {retornoNome && (
          <p className={retornoNome.erro ? 'minha-conta-erro' : 'minha-conta-aviso'} role='alert'>{retornoNome.mensagem}</p>
        )}

        <button type='submit' className='botao botao-primario' disabled={salvandoNome || !nome.trim() || nome.trim() === nomeAtual}>
          {salvandoNome ? 'Salvando...' : 'Salvar nome'}
        </button>
      </form>

      <form className='minha-conta-secao' onSubmit={handleSalvarSenha}>
        <h3>Senha</h3>
        <label className='minha-conta-campo'>
          <span>Senha atual</span>
          <input type='password' autoComplete='current-password' required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
        </label>

        <label className='minha-conta-campo'>
          <span>Nova senha</span>
          <input type='password' autoComplete='new-password' minLength={6} required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>

        <label className='minha-conta-campo'>
          <span>Confirme a nova senha</span>
          <input type='password' autoComplete='new-password' minLength={6} required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </label>

        {retornoSenha && (
          <p className={retornoSenha.erro ? 'minha-conta-erro' : 'minha-conta-aviso'} role='alert'>{retornoSenha.mensagem}</p>
        )}

        <button type='submit' className='botao botao-primario' disabled={salvandoSenha}>
          {salvandoSenha ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </div>
  )
}

export default MinhaConta
