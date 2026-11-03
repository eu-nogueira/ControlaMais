import { PRIMEIRO_MES, deslocarData, deslocarMes } from './mes'
import { ehParcelado, parcelasRestantes } from './parcelas'

// Mês cujo saldo a movimentação afeta: o da data de cadastro, salvo despesas do mês atual
// registradas antes de quitar o mês passado, que guardam o mês escolhido (passado ou atual).
export const mesDoSaldo = (conta) => conta.mesSaldo || conta.dataCadastro.slice(0, 7)
const mesDa = mesDoSaldo

const somar = (contas) => contas.reduce((total, conta) => total + conta.valorFormatado, 0)

// Contas fixas nunca terminam, então seguem ativas em todos os meses.
function ehParcelamentoAtivo(conta) {
  return conta.tipoConta === 'Despesa'
    && conta.selected
    && ehParcelado(conta)
    && parcelasRestantes(conta) > 0
}

// Período aberto: movimentações posteriores ao último mês fechado, mais a parcela
// do mês de cada parcelamento que ainda está em andamento.
// O saldo de um mês fechado não passa para o seguinte: o que sobra fica na conta para gastos
// no débito, que não são registrados. `fechamento.saldo` é só o histórico do que sobrou.
export function calcularPeriodo(contas, fechamento, ateMes = null) {
  const novas = contas.filter((conta) => (!fechamento || mesDa(conta) > fechamento.mes) && (!ateMes || mesDa(conta) <= ateMes))
  const carregadas = fechamento
    ? contas.filter((conta) => mesDa(conta) <= fechamento.mes && ehParcelamentoAtivo(conta))
    : []

  const receitas = somar(novas.filter((conta) => conta.tipoConta === 'Receita'))
  const despesas = somar(novas.filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)) + somar(carregadas)

  return { receitas, despesas, saldo: receitas - despesas }
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

// Até as contas do mês passado serem quitadas, despesas marcadas para o próximo salário
// ficam fora do saldo exibido. As demais movimentações seguem o período aberto normalmente.
export function calcularSaldoExibido(contas, fechamento, mesAtual) {
  const abertos = mesesParaFechar(contas, fechamento, mesAtual)
  const mesPassado = abertos[abertos.length - 1]
  const doSaldo = mesPassado ? contas.filter((conta) => !conta.mesSaldo || conta.mesSaldo <= mesPassado) : contas
  const periodo = calcularPeriodo(doSaldo, fechamento)
  if (periodo.receitas > 0 || !fechamento) return { ...periodo, mediaSalarial: null }

  // Sem receita registrada no período, o próximo salário é estimado pela média salarial.
  const mediaSalarial = estimarMediaSalarial(contas, fechamento.mes)
  if (!mediaSalarial) return { ...periodo, mediaSalarial: null }
  return { ...periodo, receitas: mediaSalarial.valor, saldo: mediaSalarial.valor - periodo.despesas, mediaSalarial }
}

// Receita com "salário" na descrição, ignorando acentos e maiúsculas.
const ehSalario = (conta) => (conta.descricao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('salario')

// Média dos salários dos 3 últimos meses com salário até `ateMes`; com menos de 3, usa só o último.
export function estimarMediaSalarial(contas, ateMes) {
  const receitas = contas.filter((conta) => conta.tipoConta === 'Receita' && ehSalario(conta) && mesDa(conta) <= ateMes)
  const comReceita = [...new Set(receitas.map(mesDa))].sort()
  if (comReceita.length === 0) return null

  const meses = comReceita.length >= 3 ? comReceita.slice(-3) : comReceita.slice(-1)
  const total = somar(receitas.filter((conta) => meses.includes(mesDa(conta))))
  return { valor: Math.round((total / meses.length) * 100) / 100, meses }
}

// A parcela de um mês é paga com o próximo salário, então vence até o mês seguinte. Vencimento depois
// disso indica que ela já foi registrada como paga na aba Parcelas e o fechamento não deve somar de novo.
const parcelaDoMesPaga = (conta, mes) => Boolean(conta.dataVencimento) && conta.dataVencimento.slice(0, 7) > deslocarMes(mes, 1)

// Fecha os meses em ordem: registra o que sobrou em cada um (só histórico) e +1 parcela paga
// nos parcelamentos em andamento, levando o vencimento para o mês seguinte.
export function simularFechamento(contas, fechamento, meses) {
  let atual = fechamento
  let lista = contas
  const fechamentos = []

  meses.forEach((mes) => {
    const { saldo } = calcularPeriodo(lista, atual, mes)
    atual = { mes, saldo: Math.round(saldo * 100) / 100 }
    fechamentos.push(atual)
    lista = lista.map((conta) => (
      mesDa(conta) <= mes && ehParcelamentoAtivo(conta) && !parcelaDoMesPaga(conta, mes)
        ? {
          ...conta,
          parcelaPaga: (conta.parcelaPaga || 0) + 1,
          dataVencimento: conta.dataVencimento && deslocarData(conta.dataVencimento, 1)
        }
        : conta
    ))
  })

  const alteradas = lista
    .filter((conta, indice) => conta.parcelaPaga !== contas[indice].parcelaPaga)
    .map((conta) => ({ id: conta.id, parcelaPaga: conta.parcelaPaga, dataVencimento: conta.dataVencimento }))

  return { fechamentos, alteradas }
}

// Enquanto houver meses a fechar, mostra como ficará o saldo do próximo salário depois da quitação:
// simula o fechamento (sem gravar) e calcula o saldo exibido com o resultado.
export function projetarProximoSalario(contas, fechamento, mesAtual) {
  const meses = mesesParaFechar(contas, fechamento, mesAtual)
  if (meses.length === 0) return null

  const { fechamentos, alteradas } = simularFechamento(contas, fechamento, meses)
  const porId = new Map(alteradas.map((conta) => [conta.id, conta]))
  const contasQuitadas = contas.map((conta) => (porId.has(conta.id) ? { ...conta, ...porId.get(conta.id) } : conta))
  return calcularSaldoExibido(contasQuitadas, fechamentos[fechamentos.length - 1], mesAtual)
}
