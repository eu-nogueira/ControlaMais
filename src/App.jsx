import { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import store from './store/configureStore'
import { carregarContas, limparExtrato } from './store/extrato'
import supabase from './services/supabase'

function App() {
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))

    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = sessao?.user.id
  const nomeUsuario = sessao?.user.user_metadata?.nome || sessao?.user.email?.split('@')[0]

  useEffect(() => {
    if (usuarioId) {
      store.dispatch(carregarContas())
    } else {
      store.dispatch(limparExtrato())
    }
  }, [usuarioId])

  if (sessao === undefined) {
    return <p className='app-carregando'>Carregando...</p>
  }

  return (
    <Provider store={store}>
      {sessao ? <Home nomeUsuario={nomeUsuario} /> : <Login />}
    </Provider>
  )
}

export default App
