import { deslocarMes, mesesEntre } from './mes'

// Reserva de emergência recomendada: alguns meses das despesas do mês.
export const MESES_RESERVA = 6

const arredondar = (valor) => Math.round(valor * 100) / 100

// Meta dinâmica: as contas são feitas em centavos inteiros para não acumular erro de arredondamento.
const paraCentavos = (valor) => Math.round(valor * 100)

// Valor do mês = valor inicial + incremento × (número do mês - 1).
// Total = (duração / 2) × (valor inicial + último depósito), sempre um número inteiro de centavos.
export function planejarMetaDinamica(valorInicial, incremento, duracao) {
  const inicial = paraCentavos(valorInicial)
  const passo = paraCentavos(incremento)
  const ultimo = inicial + passo * (duracao - 1)
  const total = (duracao * (inicial + ultimo)) / 2

  return {
    valorDoMes: (numero) => (inicial + passo * (numero - 1)) / 100,
    ultimo: ultimo / 100,
    total: total / 100
  }
}

// Situação de uma meta dinâmica no mês atual. Só depósitos registrados contam como guardados:
// um mês que passou sem registro fica atrasado (ou pendente, se a meta está pausada ou encerrada).
// estado de cada mês: concluido, atrasado, atual ou pendente.
export function calcularMetaDinamica(meta, mesAtual) {
  const plano = planejarMetaDinamica(meta.valorInicial, meta.incremento, meta.duracao)
  const inicio = meta.inicio.slice(0, 7)
  const ativa = meta.status === 'ativa'

  const meses = Array.from({ length: meta.duracao }, (_, indice) => {
    const numero = indice + 1
    const mes = deslocarMes(inicio, indice)
    const deposito = meta.movimentos.find((movimento) => movimento.mesReferencia === numero) ?? null
    const estado = deposito ? 'concluido'
      : mes < mesAtual && ativa ? 'atrasado'
        : mes === mesAtual && ativa ? 'atual'
          : 'pendente'
    return { numero, mes, valor: plano.valorDoMes(numero), deposito, estado }
  })

  const guardadoCentavos = meta.movimentos.reduce((total, movimento) => total + paraCentavos(movimento.valor), 0)
  const totalCentavos = paraCentavos(plano.total)
  const guardado = guardadoCentavos / 100
  const mesesConcluidos = meses.filter((item) => item.deposito).length
  const proximo = meses.find((item) => !item.deposito) ?? null
  const atingida = !proximo
  const guardadoNoMes = meta.movimentos
    .filter((movimento) => movimento.data.slice(0, 7) === mesAtual)
    .reduce((total, movimento) => total + paraCentavos(movimento.valor), 0) / 100

  return {
    meses,
    alvo: plano.total,
    ultimo: plano.ultimo,
    guardado,
    restante: Math.max(totalCentavos - guardadoCentavos, 0) / 100,
    percentual: totalCentavos > 0 ? Math.min((guardadoCentavos / totalCentavos) * 100, 100) : 0,
    mesesConcluidos,
    atrasados: meses.filter((item) => item.estado === 'atrasado').length,
    proximo,
    porMes: proximo?.valor ?? null,
    atingida,
    atrasada: false,
    foraDoPrazo: false,
    guardadoNoMes,
    ultimoMesRegistrado: Math.max(0, ...meta.movimentos.map((movimento) => movimento.mesReferencia || 0))
  }
}

// Situação de uma meta ou reserva no mês atual.
// porMes: quanto guardar por mês, contando o mês atual e o do prazo, para chegar ao valor no prazo.
export function calcularMeta(meta, mesAtual) {
  if (meta.tipo === 'dinamica') return calcularMetaDinamica(meta, mesAtual)

  const guardado = arredondar(meta.movimentos.reduce((total, movimento) => total + movimento.valor, 0))
  const alvo = meta.valorAlvo || 0
  const restante = alvo > 0 ? arredondar(Math.max(alvo - guardado, 0)) : 0
  const percentual = alvo > 0 ? Math.min((guardado / alvo) * 100, 100) : null
  const atingida = alvo > 0 && guardado >= alvo

  const mesesRestantes = meta.prazo ? mesesEntre(mesAtual, meta.prazo.slice(0, 7)) + 1 : null
  const atrasada = !atingida && mesesRestantes !== null && mesesRestantes <= 0
  const porMes = !atingida && mesesRestantes > 0 ? arredondar(restante / mesesRestantes) : null

  const guardadoNoMes = arredondar(meta.movimentos
    .filter((movimento) => movimento.data.slice(0, 7) === mesAtual)
    .reduce((total, movimento) => total + movimento.valor, 0))

  return {
    alvo: meta.valorAlvo, guardado, restante, percentual, atingida, atrasada, mesesRestantes, porMes, guardadoNoMes,
    ...avaliarRitmo(meta, { guardado, restante, atingida, atrasada, guardadoNoMes }, mesAtual)
  }
}

// Ritmo: média guardada por mês completo desde a criação (o mês atual ainda está em andamento).
// previsao: mês em que a meta seria alcançada nesse ritmo, contando o mês atual.
// foraDoPrazo: o prazo passou ou, no ritmo atual, a meta não chega ao valor até o prazo.
function avaliarRitmo(meta, situacao, mesAtual) {
  const semAvaliacao = { ritmo: null, previsao: null, foraDoPrazo: false }
  if (!meta.valorAlvo || !meta.prazo || situacao.atingida) return semAvaliacao

  const mesesCompletos = mesesEntre(meta.criadoEm.slice(0, 7), mesAtual)
  if (mesesCompletos < 1) return { ...semAvaliacao, foraDoPrazo: situacao.atrasada }

  const ritmo = arredondar(Math.max(situacao.guardado - situacao.guardadoNoMes, 0) / mesesCompletos)
  const mesesNecessarios = ritmo > 0 ? Math.ceil(Math.round((situacao.restante / ritmo) * 1000) / 1000) : null
  const previsao = mesesNecessarios ? deslocarMes(mesAtual, mesesNecessarios - 1) : null
  const foraDoPrazo = situacao.atrasada || !previsao || previsao > meta.prazo.slice(0, 7)

  return { ritmo, previsao, foraDoPrazo }
}
