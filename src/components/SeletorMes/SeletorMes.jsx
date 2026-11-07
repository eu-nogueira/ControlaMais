import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { formatarMes } from '../../utils/mes'
import './SeletorMes.css'

function SeletorMes({ mes, primeiroMes, ultimoMes, onNavegar, legenda, legendaPositiva = false }) {
  return (
    <div className='seletor-mes'>
      <button onClick={() => onNavegar(-1)} disabled={mes <= primeiroMes} aria-label='Mês anterior'>
        <MdChevronLeft size={24} />
      </button>
      <div className='seletor-mes-titulo' aria-live='polite'>
        <strong>{formatarMes(mes)}</strong>
        {legenda && <small className={legendaPositiva ? 'seletor-mes-legenda-positiva' : ''}>{legenda}</small>}
      </div>
      <button onClick={() => onNavegar(1)} disabled={mes >= ultimoMes} aria-label='Próximo mês'>
        <MdChevronRight size={24} />
      </button>
    </div>
  )
}

export default SeletorMes
