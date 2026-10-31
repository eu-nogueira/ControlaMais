import { useEffect, useState } from 'react'
import { hojeISO } from '../utils/mes'

function useHoje() {
  const [hoje, setHoje] = useState(hojeISO)

  useEffect(() => {
    const atualizar = () => setHoje(hojeISO())
    const intervalo = setInterval(atualizar, 60000)
    document.addEventListener('visibilitychange', atualizar)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [])

  return hoje
}

export default useHoje
