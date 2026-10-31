import { MdLogout, MdNotifications, MdNotificationsNone, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import './Cabecalho.css'

function Cabecalho({ titulo, saudacao, ocultar, notificacoesNovas = 0, onAlternarOcultar, onAbrirNotificacoes, onAbrirConta, onSair, children }) {
  const rotuloNotificacoes = notificacoesNovas > 0
    ? `Notificações (${notificacoesNovas} ${notificacoesNovas === 1 ? 'nova' : 'novas'})`
    : 'Notificações'

  return (
    <header className={`cabecalho ${children ? 'cabecalho-estendido' : ''}`}>
      <div className='cabecalho-topo'>
        <div className='cabecalho-marca'>
          <button className='cabecalho-logo' onClick={onAbrirConta} aria-label='Minha conta' title='Minha conta'>C+</button>
          <div>
            <button className='cabecalho-saudacao' onClick={onAbrirConta}>{saudacao || 'Controla+'}</button>
            <h1 className='cabecalho-titulo'>{titulo}</h1>
          </div>
        </div>
        <div className='cabecalho-acoes'>
          <button className='cabecalho-botao' onClick={onAbrirNotificacoes} aria-label={rotuloNotificacoes} title={rotuloNotificacoes}>
            {notificacoesNovas > 0 ? <MdNotifications size={22} /> : <MdNotificationsNone size={22} />}
            {notificacoesNovas > 0 && (
              <span className='cabecalho-badge' aria-hidden='true'>{notificacoesNovas > 9 ? '9+' : notificacoesNovas}</span>
            )}
          </button>
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
