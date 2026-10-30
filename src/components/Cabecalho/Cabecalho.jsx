import { MdLogout, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import './Cabecalho.css'

function Cabecalho({ titulo, ocultar, onAlternarOcultar, onSair, children }) {
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
        <div className='cabecalho-acoes'>
          <button
            className='cabecalho-botao'
            onClick={onAlternarOcultar}
            aria-pressed={ocultar}
            aria-label={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
            title={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {ocultar ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
          </button>
          <button className='cabecalho-botao' onClick={onSair} aria-label='Sair' title='Sair'>
            <MdLogout size={22} />
          </button>
        </div>
      </div>
      {children}
    </header>
  )
}

export default Cabecalho
