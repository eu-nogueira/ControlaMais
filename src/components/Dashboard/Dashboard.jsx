import { useState } from 'react'
import { useSelector } from 'react-redux'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import ComparacaoMeses from '../ComparacaoMeses/ComparacaoMeses'
import GraficoPizza from '../GraficoPizza/GraficoPizza'
import Projecao from '../Projecao/Projecao'
import { dadosDashboard, ultimoMesComDespesa, usoCartoesPorResponsavel } from '../../utils/dashboard'
import { formatarMoeda } from '../../utils/formatar'
import { PRIMEIRO_MES, deslocarMes, formatarMes } from '../../utils/mes'
import useMesAtual from '../../hooks/useMesAtual'
import './Dashboard.css'

function Dashboard({ ocultar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const cartoes = useSelector((state) => state.cartoes.lista)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const [mesEscolhido, setMesEscolhido] = useState(null)
  const [cartaoEscolhido, setCartaoEscolhido] = useState(null)
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

  const dados = dadosDashboard(contas, mes)
  const usoCartoes = usoCartoesPorResponsavel(cartoes, contas, fechamento)
  const cartao = usoCartoes.find((item) => item.chave === cartaoEscolhido) ?? usoCartoes[0]

  function rodapeCartao() {
    if (!cartao) return null
    if (!cartao.limite) return `${cartao.nome} não está cadastrado: o limite não é controlado. Gasto em aberto: ${formatarMoeda(cartao.usado, ocultar)}.`
    const usoTexto = `${formatarMoeda(cartao.usado, ocultar)} usados de ${formatarMoeda(cartao.limite, ocultar)} de limite.`
    return cartao.usado > cartao.limite ? `${usoTexto} O limite foi ultrapassado.` : usoTexto
  }

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

      <ComparacaoMeses contas={contas} mes={mes} ocultar={ocultar} />

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
          titulo='Quem está usando cada cartão'
          descricao='Uso atual do limite, por quem fez o gasto. Não muda com o mês escolhido acima.'
          filtro={usoCartoes.length > 1 && (
            <div className='dashboard-cartoes' role='group' aria-label='Escolher cartão'>
              {usoCartoes.map((item) => (
                <button
                  key={item.chave}
                  type='button'
                  aria-pressed={item.chave === cartao.chave}
                  className={`dashboard-cartoes-opcao ${item.chave === cartao.chave ? 'dashboard-cartoes-opcao-ativa' : ''}`}
                  onClick={() => setCartaoEscolhido(item.chave)}
                >
                  {item.nome}
                </button>
              ))}
            </div>
          )}
          fatias={cartao?.fatias ?? []}
          vazio={usoCartoes.length === 0 ? 'Nenhum cartão cadastrado ou compra no cartão em aberto.' : `Nenhum gasto em aberto no ${cartao.nome}.`}
          rodape={rodapeCartao()}
          rotuloTotal={cartao?.limite ? 'Limite' : 'Total'}
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

      <Projecao contas={contas} mesAtual={mesAtual} />
    </div>
  )
}

export default Dashboard
