import { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import store from './store/configureStore'
import { carregarContas, limparExtrato } from './store/extrato'
import { carregarCartoes, limparCartoes } from './store/cartoes'
import { limparSimulacoes } from './store/simulacoes'
import NovaSenha from './pages/NovaSenha'
import supabase, { chegouPorRecuperacao, erroLinkAutenticacao } from './services/supabase'

function App() {
  const [sessao, setSessao] = useState(undefined)
  const [redefinindoSenha, setRedefinindoSenha] = useState(chegouPorRecuperacao)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))

    const { data } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      if (evento === 'PASSWORD_RECOVERY') setRedefinindoSenha(true)
      setSessao(novaSessao)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = sessao?.user.id
  const nomeUsuario = sessao?.user.user_metadata?.nome || sessao?.user.email?.split('@')[0]
  const ehLarissa = /larissa/i.test(`${sessao?.user.user_metadata?.nome ?? ''} ${sessao?.user.email ?? ''}`)
  const saudacao = ehLarissa ? 'Olá, minha vida!' : `Olá, ${nomeUsuario}`

  useEffect(() => {
    if (usuarioId) {
      store.dispatch(carregarContas())
      store.dispatch(carregarCartoes())
    } else {
      store.dispatch(limparExtrato())
      store.dispatch(limparCartoes())
      store.dispatch(limparSimulacoes())
    }
  }, [usuarioId])

  if (sessao === undefined) {
    return <p className='app-carregando'>Carregando...</p>
  }

  if (sessao && redefinindoSenha) {
    return <NovaSenha onConcluir={() => setRedefinindoSenha(false)} />
  }

  return (
    <Provider store={store}>
      {sessao ? <Home saudacao={saudacao} usuario={sessao.user} /> : <Login erroInicial={erroLinkAutenticacao} />}
    </Provider>
  )
}

export default App
