import { useState } from 'react'
import { useSelector } from 'react-redux'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import GraficoPizza from '../GraficoPizza/GraficoPizza'
import { dadosDashboard, ultimoMesComDespesa } from '../../utils/dashboard'
import { formatarMoeda } from '../../utils/formatar'
import { PRIMEIRO_MES, deslocarMes, formatarMes } from '../../utils/mes'
import useMesAtual from '../../hooks/useMesAtual'
import './Dashboard.css'

function Dashboard({ ocultar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const cartoes = useSelector((state) => state.cartoes.lista)
  const [mesEscolhido, setMesEscolhido] = useState(null)
  const mesAtual = useMesAtual()

  // Permite avançar até o último mês com parcela prevista.
  const ultimoMesComConta = [mesAtual, ultimoMesComDespesa(contas)].sort().pop()
  const ultimoMes = ultimoMesComConta < PRIMEIRO_MES ? PRIMEIRO_MES : ultimoMesComConta
  const mesBase = mesEscolhido ?? mesAtual
  const mes = mesBase < PRIMEIRO_MES ? PRIMEIRO_MES : mesBase > ultimoMes ? ultimoMes : mesBase

  function navegarMes(quantidade) {
    const novoMes = deslocarMes(mes, quantidade)
    setMesEscolhido(novoMes === mesAtual ? null : novoMes)
  }

  const dados = dadosDashboard(contas, cartoes, mes)

  return (
    <div className='dashboard'>
      <div className='dashboard-meses'>
        <button onClick={() => navegarMes(-1)} disabled={mes <= PRIMEIRO_MES} aria-label='Mês anterior'>
          <MdChevronLeft size={24} />
        </button>
        <strong aria-live='polite'>{formatarMes(mes)}</strong>
        <button onClick={() => navegarMes(1)} disabled={mes >= ultimoMes} aria-label='Próximo mês'>
          <MdChevronRight size={24} />
        </button>
      </div>

      <div className='dashboard-total'>
        <span>Seus gastos no mês</span>
        <strong>{formatarMoeda(dados.totalMeu, ocultar)}</strong>
        <small>Despesas que você paga, com parcelados contando a parcela do mês.</small>
      </div>

      <div className='dashboard-graficos'>
        <GraficoPizza
          titulo='Para onde seus gastos estão indo'
          descricao='Despesas que você paga, pelo tipo de despesa informado.'
          fatias={dados.tipos}
          vazio='Nenhuma despesa com tipo informado neste mês. Escolha o tipo ao registrar uma despesa.'
          rodape={dados.semTipo > 0 && dados.tipos.length > 0 ? `${formatarMoeda(dados.semTipo, ocultar)} em despesas sem tipo informado não aparecem no gráfico.` : null}
          ocultar={ocultar}
        />

        <GraficoPizza
          titulo='Gastos por cartão'
          descricao='Compras no cartão que você paga.'
          fatias={dados.cartoes}
          vazio='Nenhuma compra no cartão neste mês.'
          ocultar={ocultar}
        />

        <GraficoPizza
          titulo='Para quem você está devendo'
          descricao='Despesas em que você informou que vai pagar alguém.'
          fatias={dados.pessoas}
          vazio='Você não registrou valores a pagar para outras pessoas neste mês.'
          ocultar={ocultar}
        />
      </div>
    </div>
  )
}

export default Dashboard
