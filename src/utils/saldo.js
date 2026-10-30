import { PRIMEIRO_MES, deslocarMes } from './mes'

const mesDa = (conta) => conta.dataCadastro.slice(0, 7)

const somar = (contas) => contas.reduce((total, conta) => total + conta.valorFormatado, 0)

function ehParcelamentoAtivo(conta) {
  return conta.tipoConta === 'Despesa'
    && conta.selected
    && Number(conta.parcela) > 1
    && (conta.parcelaPaga || 0) < Number(conta.parcela)
}

// Período aberto: movimentações posteriores ao último mês fechado, mais a parcela
// do mês de cada parcelamento que ainda está em andamento.
export function calcularPeriodo(contas, fechamento, ateMes = null) {
  const novas = contas.filter((conta) => (!fechamento || mesDa(conta) > fechamento.mes) && (!ateMes || mesDa(conta) <= ateMes))
  const carregadas = fechamento
    ? contas.filter((conta) => mesDa(conta) <= fechamento.mes && ehParcelamentoAtivo(conta))
    : []

  const saldoInicial = fechamento ? fechamento.saldo : 0
  const receitas = somar(novas.filter((conta) => conta.tipoConta === 'Receita'))
  const despesas = somar(novas.filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)) + somar(carregadas)

  return { saldoInicial, receitas, despesas, saldo: saldoInicial + receitas - despesas }
}

export function mesesParaFechar(contas, fechamento, mesAtual) {
  let inicio = fechamento ? deslocarMes(fechamento.mes, 1) : null

  if (!inicio) {
    const mesesAnteriores = contas.map(mesDa).filter((mes) => mes < mesAtual).sort()
    if (mesesAnteriores.length === 0) return []
    inicio = mesesAnteriores[0]
  }
  if (inicio < PRIMEIRO_MES) inicio = PRIMEIRO_MES

  const meses = []
  for (let mes = inicio; mes < mesAtual; mes = deslocarMes(mes, 1)) {
    meses.push(mes)
  }
  return meses
}

// Fecha os meses em ordem: cada um gera a sobra para o seguinte e registra
// +1 parcela paga nos parcelamentos em andamento.
export function simularFechamento(contas, fechamento, meses) {
  let atual = fechamento
  let lista = contas
  const fechamentos = []

  meses.forEach((mes) => {
    const { saldo } = calcularPeriodo(lista, atual, mes)
    atual = { mes, saldo: Math.round(saldo * 100) / 100 }
    fechamentos.push(atual)
    lista = lista.map((conta) => (
      mesDa(conta) <= mes && ehParcelamentoAtivo(conta)
        ? { ...conta, parcelaPaga: (conta.parcelaPaga || 0) + 1 }
        : conta
    ))
  })

  const alteradas = lista
    .filter((conta, indice) => conta.parcelaPaga !== contas[indice].parcelaPaga)
    .map((conta) => ({ id: conta.id, parcelaPaga: conta.parcelaPaga }))

  return { fechamentos, alteradas }
}
