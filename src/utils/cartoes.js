import { ehContaFixa } from './parcelas'

export const CORES_CARTAO = [
  { valor: '#0b7a4b', rotulo: 'Verde' },
  { valor: '#1d4ed8', rotulo: 'Azul' },
  { valor: '#7c3aed', rotulo: 'Roxo' },
  { valor: '#db2777', rotulo: 'Rosa' },
  { valor: '#ea580c', rotulo: 'Laranja' },
  { valor: '#1f2937', rotulo: 'Preto' },
]

export const normalizarNomeCartao = (nome) => (nome || '').trim().toLocaleLowerCase('pt-BR')

export const mesmoCartao = (nomeA, nomeB) => normalizarNomeCartao(nomeA) !== '' && normalizarNomeCartao(nomeA) === normalizarNomeCartao(nomeB)

export function encontrarCartao(cartoes, nome) {
  return cartoes.find((cartao) => mesmoCartao(cartao.nome, nome))
}

// Valor do gasto que ainda ocupa o limite: parcelados liberam uma parcela a cada
// parcela paga; à vista liberam tudo quando o mês da compra é fechado; conta fixa
// ocupa sempre o valor de uma cobrança mensal.
export function valorEmAberto(conta, fechamento) {
  if (ehContaFixa(conta)) return conta.valorFormatado

  const parcelas = Number(conta.parcela) || 1
  if (parcelas > 1) return conta.valorFormatado * Math.max(parcelas - (conta.parcelaPaga || 0), 0)

  const mesAberto = !fechamento || conta.dataCadastro.slice(0, 7) > fechamento.mes
  return mesAberto ? conta.valorFormatado : 0
}

function comprasEmAberto(contas, fechamento) {
  return contas
    .filter((conta) => conta.tipoConta === 'Despesa' && conta.cartao)
    .map((conta) => ({ conta, emAberto: valorEmAberto(conta, fechamento) }))
    .filter((compra) => compra.emAberto > 0)
}

export function calcularUsoCartoes(cartoes, contas, fechamento) {
  const compras = comprasEmAberto(contas, fechamento)

  return cartoes.map((cartao) => {
    const doCartao = compras.filter((compra) => mesmoCartao(compra.conta.cartao, cartao.nome))
    const usado = doCartao.reduce((total, compra) => total + compra.emAberto, 0)
    return { ...cartao, compras: doCartao, usado, disponivel: cartao.limite - usado }
  })
}

// Nomes digitados em gastos em aberto que não correspondem a nenhum cartão cadastrado.
export function cartoesSemCadastro(cartoes, contas, fechamento) {
  const nomes = new Map()
  comprasEmAberto(contas, fechamento)
    .filter((compra) => !encontrarCartao(cartoes, compra.conta.cartao))
    .forEach((compra) => {
      const chave = normalizarNomeCartao(compra.conta.cartao)
      if (!nomes.has(chave)) nomes.set(chave, compra.conta.cartao.trim())
    })
  return [...nomes.values()]
}
