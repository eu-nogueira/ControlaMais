import { diasEntre } from './mes'
import { ehParcelado, parcelasRestantes } from './parcelas'
import { calcularSaldoExibido } from './saldo'
import { projetarDisponivel } from './simulacao'

export const DIAS_AVISO = 3

// Parcelas (e contas fixas) em aberto que vencem em até DIAS_AVISO dias ou já venceram sem serem pagas.
// O id inclui o vencimento: ao pagar a parcela, o vencimento avança e a próxima gera um aviso novo.
export function gerarNotificacoes(contas, hoje) {
  return contas
    .filter((conta) => ehParcelado(conta) && parcelasRestantes(conta) > 0 && conta.dataVencimento)
    .map((conta) => ({ conta, dias: diasEntre(hoje, conta.dataVencimento) }))
    .filter(({ dias }) => dias <= DIAS_AVISO)
    .sort((a, b) => a.dias - b.dias)
    .map(({ conta, dias }) => ({
      id: `${conta.id}:${conta.dataVencimento}`,
      conta,
      dias,
      vencida: dias < 0,
      aReceber: !conta.selected
    }))
}

// Movimentações do Copiloto com campos assumidos por padrão, enquanto não forem revisadas.
export function gerarNotificacoesRevisao(contas, revisoes) {
  return contas
    .filter((conta) => revisoes[conta.id]?.length > 0)
    .map((conta) => ({
      id: `revisar:${conta.id}`,
      tipo: 'revisar',
      conta,
      campos: revisoes[conta.id]
    }))
}

export const MESES_ALERTA = 6

// Avisos no sino sobre a situação financeira (não geram notificação no celular): saldo atual negativo
// e o primeiro mês com sobra negativa na projeção. Somem quando a situação se resolve; o id inclui
// o mês, então o aviso volta como novo se o problema continuar no mês seguinte.
export function gerarAlertasFinanceiros(contas, fechamento, mesAtual) {
  const alertas = []

  // Sem nenhuma receita registrada o saldo negativo não diz muito: o aviso fica para quando houver renda.
  const { saldo, receitas } = calcularSaldoExibido(contas, fechamento, mesAtual)
  if (receitas > 0 && saldo < 0) {
    alertas.push({ id: `saldo-negativo:${mesAtual}`, tipo: 'saldo', valor: saldo, vencida: true })
  }

  const { renda, pontos } = projetarDisponivel(contas, mesAtual, MESES_ALERTA)
  const negativo = renda === null ? null : pontos.find((ponto) => ponto.sobra < 0)
  if (negativo) {
    alertas.push({ id: `projecao-negativa:${negativo.mes}`, tipo: 'projecao', mes: negativo.mes, valor: negativo.sobra, parcelas: negativo.parcelas, renda })
  }

  return alertas
}

