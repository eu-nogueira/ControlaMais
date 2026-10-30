import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import './Cabecalho.css'

function Cabecalho({ titulo, ocultar, onAlternarOcultar, children }) {
  return (
    <header className={`cabecalho ${children ? 'cabecalho-estendido' : ''}`}>
      <div className='cabecalho-topo'>
        <div className='cabecalho-marca'>
          <span className='cabecalho-logo' aria-hidden='true'>C+</span>
          <div>
            <p className='cabecalho-saudacao'>Controla+</p>
            <h1 className='cabecalho-titulo'>{titulo}</h1>
          </div>
        </div>
        <button
          className='cabecalho-botao'
          onClick={onAlternarOcultar}
          aria-pressed={ocultar}
          aria-label={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
          title={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {ocultar ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
        </button>
      </div>
      {children}
    </header>
  )
}

export default Cabecalho
