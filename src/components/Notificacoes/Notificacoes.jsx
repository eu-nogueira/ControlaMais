import { MdAndroid, MdCallReceived, MdChevronRight, MdEditNote, MdErrorOutline, MdEvent, MdNotificationsNone, MdTrendingDown } from 'react-icons/md'
import { DIAS_AVISO } from '../../utils/notificacoes'
import { formatarDataISO, formatarMoeda, juntarLista } from '../../utils/formatar'
import { ehContaFixa } from '../../utils/parcelas'
import { formatarMes } from '../../utils/mes'
import './Notificacoes.css'

function prazo(dias) {
  if (dias < -1) return `venceu há ${-dias} dias`
  if (dias === -1) return 'venceu ontem'
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  return `vence em ${dias} dias`
}

function textos({ tipo, conta, dias, aReceber, campos, valor: valorAlerta, mes, parcelas }, ocultar) {
  if (tipo === 'saldo') {
    return {
      titulo: 'Seu saldo está negativo',
      texto: `Faltam ${formatarMoeda(-valorAlerta, ocultar)} até o próximo salário. Toque para o Marcão sugerir o que fazer.`
    }
  }

  if (tipo === 'projecao') {
    const nome = formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()
    return {
      titulo: `Sobra negativa em ${nome}`,
      texto: `Pela projeção, em ${nome} as parcelas e contas fixas (${formatarMoeda(parcelas, ocultar)}) passam da sua renda média e faltam ${formatarMoeda(-valorAlerta, ocultar)}. Toque para pedir dicas ao Marcão.`
    }
  }

  if (tipo === 'app') {
    return {
      titulo: 'Baixe o app para Android',
      texto: 'Use o Controla+ como app no celular. Toque aqui e, em Minha conta, use "Baixar app para Android" na seção Ajuda.'
    }
  }

  if (tipo === 'revisar') {
    return {
      titulo: 'Revise a movimentação registrada pelo Marcão',
      texto: `${conta.descricao} (${formatarMoeda(conta.valorFormatado, ocultar)}): confira ${juntarLista(campos)}, preenchido${campos.length > 1 ? 's' : ''} por padrão.`
    }
  }

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
  if (notificacao.tipo === 'app') return <MdAndroid size={22} />
  if (notificacao.tipo === 'revisar') return <MdEditNote size={22} />
  if (notificacao.tipo === 'projecao') return <MdTrendingDown size={22} />
  if (notificacao.vencida) return <MdErrorOutline size={22} />
  if (notificacao.aReceber) return <MdCallReceived size={22} />
  return <MdEvent size={22} />
}

function Notificacoes({ notificacoes, novas, ocultar, onVerParcelas, onAbrirConta, onRevisar, onPedirDicas }) {
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
              onClick={() => {
                if (notificacao.tipo === 'app') onAbrirConta()
                else if (notificacao.tipo === 'revisar') onRevisar(notificacao.conta)
                else if (notificacao.tipo === 'saldo' || notificacao.tipo === 'projecao') onPedirDicas()
                else onVerParcelas()
              }}
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
