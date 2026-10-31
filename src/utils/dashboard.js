import { encontrarCartao, normalizarNomeCartao } from './cartoes'
import { ehContaFixa, totalParcelasDe } from './parcelas'

export const TIPOS_DESPESA = ['Alimentação', 'Transporte', 'Lazer']

const MAXIMO_FATIAS = 6

const indiceMes = (mes) => {
  const [ano, numeroMes] = mes.split('-').map(Number)
  return ano * 12 + numeroMes
}

// Parcelados contam o valor da parcela em cada mês do parcelamento; contas fixas, em todos
// os meses a partir do cadastro; à vista, só no mês da compra.
export function valorNoMes(conta, mes) {
  const parcelas = totalParcelasDe(conta)
  const deslocamento = indiceMes(mes) - indiceMes(conta.dataCadastro.slice(0, 7))
  return deslocamento >= 0 && deslocamento < parcelas ? conta.valorFormatado : 0
}

// Contas fixas não têm último mês e ficam de fora para não estender a navegação sem fim.
export function ultimoMesComDespesa(contas) {
  return contas
    .filter((conta) => conta.tipoConta === 'Despesa' && !ehContaFixa(conta))
    .reduce((maior, conta) => {
      const parcelas = Number(conta.parcela) || 1
      const indice = indiceMes(conta.dataCadastro.slice(0, 7)) + parcelas - 1
      const mes = `${Math.floor((indice - 1) / 12)}-${String(((indice - 1) % 12) + 1).padStart(2, '0')}`
      return mes > maior ? mes : maior
    }, '')
}

// Soma por nome, sem diferenciar maiúsculas e espaços; mantém a primeira grafia encontrada.
function agrupar(itens) {
  const grupos = new Map()
  itens.forEach(({ rotulo, valor }) => {
    const chave = normalizarNomeCartao(rotulo)
    const grupo = grupos.get(chave) ?? { chave, rotulo: rotulo.trim(), valor: 0 }
    grupo.valor += valor
    grupos.set(chave, grupo)
  })
  return [...grupos.values()]
}

const porNome = (a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')

function porTipo(a, b) {
  const posicao = (grupo) => {
    const indice = TIPOS_DESPESA.indexOf(grupo.rotulo)
    return indice === -1 ? TIPOS_DESPESA.length : indice
  }
  return posicao(a) - posicao(b) || porNome(a, b)
}

// As fatias seguem uma ordem fixa ao redor do anel (não a do valor) e recebem as cores
// em sequência: assim cores vizinhas são sempre pares validados para daltonismo.
// Acima de MAXIMO_FATIAS, as menores são somadas em "Demais".
function montarFatias(grupos, ordenar) {
  let lista = grupos.filter((grupo) => grupo.valor > 0)
  let demais = 0

  if (lista.length > MAXIMO_FATIAS) {
    const maiores = [...lista].sort((a, b) => b.valor - a.valor)
    lista = maiores.slice(0, MAXIMO_FATIAS - 1)
    demais = maiores.slice(MAXIMO_FATIAS - 1).reduce((total, grupo) => total + grupo.valor, 0)
  }

  const fatias = lista.sort(ordenar).map((grupo, indice) => ({ ...grupo, cor: `var(--serie-${indice + 1})` }))
  if (demais > 0) fatias.push({ chave: 'demais', rotulo: 'Demais', valor: demais, cor: 'var(--serie-demais)' })
  return fatias
}

// Considera apenas as despesas que o usuário paga; as que outra pessoa vai pagar ficam de fora.
export function dadosDashboard(contas, cartoes, mes) {
  const minhas = contas
    .filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)
    .map((conta) => ({ conta, valor: valorNoMes(conta, mes) }))
    .filter(({ valor }) => valor > 0)

  const soma = (itens) => itens.reduce((total, { valor }) => total + valor, 0)

  const porCartao = minhas
    .filter(({ conta }) => conta.cartao?.trim())
    .map(({ conta, valor }) => ({ rotulo: encontrarCartao(cartoes, conta.cartao)?.nome ?? conta.cartao, valor }))

  const porPessoa = minhas
    .filter(({ conta }) => conta.anotarPara?.trim())
    .map(({ conta, valor }) => ({ rotulo: conta.anotarPara, valor }))

  const comTipo = minhas.filter(({ conta }) => conta.categoria?.trim())

  return {
    totalMeu: soma(minhas),
    semTipo: soma(minhas) - soma(comTipo),
    tipos: montarFatias(agrupar(comTipo.map(({ conta, valor }) => ({ rotulo: conta.categoria, valor }))), porTipo),
    cartoes: montarFatias(agrupar(porCartao), porNome),
    pessoas: montarFatias(agrupar(porPessoa), porNome),
  }
}
