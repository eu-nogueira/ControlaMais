import { useEffect } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { App } from '@capacitor/app'
import { carregarContas, gravarCopiaLocal, sincronizarFila } from '../store/extrato'

const INTERVALO_TENTATIVAS = 30000

// Mantém o funcionamento sem internet: guarda a cópia das movimentações no aparelho e envia a fila
// quando a conexão volta, quando o app volta ao primeiro plano e periodicamente enquanto houver pendências.
function useSincronizacao(usuarioId) {
  const dispatch = useDispatch()
  const store = useStore()
  const { contasExtrato, fechamento, carregado, fila } = useSelector((state) => state.extrato)

  useEffect(() => {
    if (!usuarioId || !carregado) return
    const espera = setTimeout(() => gravarCopiaLocal(usuarioId, { contas: contasExtrato, fechamento }), 500)
    return () => clearTimeout(espera)
  }, [usuarioId, carregado, contasExtrato, fechamento])

  useEffect(() => {
    if (!usuarioId) return

    function tentar() {
      if (!navigator.onLine) return
      const { fila: pendentes, semConexao, carregando } = store.getState().extrato
      if (pendentes.length > 0) dispatch(sincronizarFila())
      // Abriu com a cópia do aparelho e não há nada a enviar: busca os dados atuais do servidor.
      else if (semConexao && !carregando) dispatch(carregarContas({ silencioso: true }))
    }

    window.addEventListener('online', tentar)
    const ouvinte = App.addListener('resume', tentar)
    const intervalo = setInterval(tentar, INTERVALO_TENTATIVAS)
    return () => {
      window.removeEventListener('online', tentar)
      ouvinte.then((handle) => handle.remove())
      clearInterval(intervalo)
    }
  }, [usuarioId, dispatch, store])

  // Fila recém-carregada do aparelho, ou alteração que não conseguiu ser enviada: tenta já.
  const temPendencias = fila.length > 0
  useEffect(() => {
    if (temPendencias && carregado && navigator.onLine) dispatch(sincronizarFila())
  }, [temPendencias, carregado, dispatch])
}

export default useSincronizacao
