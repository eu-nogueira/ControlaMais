import { useEffect, useState } from 'react'
import { mesAtualISO } from '../utils/mes'

function useMesAtual() {
  const [mesAtual, setMesAtual] = useState(mesAtualISO)

  useEffect(() => {
    const atualizar = () => setMesAtual(mesAtualISO())
    const intervalo = setInterval(atualizar, 60000)
    document.addEventListener('visibilitychange', atualizar)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [])

  return mesAtual
}

export default useMesAtual
