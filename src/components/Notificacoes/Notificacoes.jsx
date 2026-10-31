import { MdCallReceived, MdChevronRight, MdErrorOutline, MdEvent, MdNotificationsNone } from 'react-icons/md'
import { DIAS_AVISO } from '../../utils/notificacoes'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { ehContaFixa } from '../../utils/parcelas'
import './Notificacoes.css'

function prazo(dias) {
  if (dias < -1) return `venceu há ${-dias} dias`
  if (dias === -1) return 'venceu ontem'
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  return `vence em ${dias} dias`
}

function textos({ conta, dias, aReceber }, ocultar) {
  const fixa = ehContaFixa(conta)
  const numero = `${(conta.parcelaPaga || 0) + 1} de ${conta.parcela}`
  const valor = formatarMoeda(conta.valorFormatado, ocultar)
  const data = formatarDataISO(conta.dataVencimento)

  if (aReceber) {
    return {
      titulo: `${fixa ? 'Conta fixa' : 'Parcela'} a receber ${prazo(dias)}`,
      texto: fixa
        ? `${conta.responsavel || 'Outra pessoa'} deve pagar a conta fixa ${conta.descricao} (${valor}) em ${data}.`
        : `${conta.responsavel || 'Outra pessoa'} deve pagar a parcela ${numero} de ${conta.descricao} (${valor}) em ${data}.`
    }
  }

  return {
    titulo: `${fixa ? 'Conta fixa' : 'Parcela'} ${prazo(dias)}`,
    texto: fixa ? `${conta.descricao}: conta fixa de ${valor} em ${data}.` : `${conta.descricao}: parcela ${numero} de ${valor} em ${data}.`
  }
}

function icone(notificacao) {
  if (notificacao.vencida) return <MdErrorOutline size={22} />
  if (notificacao.aReceber) return <MdCallReceived size={22} />
  return <MdEvent size={22} />
}

function Notificacoes({ notificacoes, novas, ocultar, onVerParcelas }) {
  if (notificacoes.length === 0) {
    return (
      <div className='notificacoes-vazio'>
        <MdNotificationsNone size={40} />
        <p>Nenhuma notificação.</p>
        <span>Você será avisado {DIAS_AVISO} dias antes do vencimento de cada parcela.</span>
      </div>
    )
  }

  return (
    <ul className='notificacoes'>
      {notificacoes.map((notificacao) => {
        const { titulo, texto } = textos(notificacao, ocultar)

        return (
          <li key={notificacao.id}>
            <button
              className={`notificacao ${notificacao.vencida ? 'notificacao-vencida' : ''}`}
              onClick={onVerParcelas}
            >
              <span className='notificacao-icone'>{icone(notificacao)}</span>
              <span className='notificacao-conteudo'>
                <strong>
                  {titulo}
                  {novas.includes(notificacao.id) && <span className='notificacao-nova'>Nova</span>}
                </strong>
                <span>{texto}</span>
              </span>
              <MdChevronRight size={20} className='notificacao-seta' aria-hidden='true' />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default Notificacoes
