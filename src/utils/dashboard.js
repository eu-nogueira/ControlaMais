import { calcularUsoCartoes, cartoesSemCadastro, comprasEmAberto, mesmoCartao, normalizarNomeCartao } from './cartoes'
import { ehContaFixa, totalParcelasDe } from './parcelas'
import { deslocarMes } from './mes'

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

// Entre grafias do mesmo nome, prefere a mais caprichada: com acentos e iniciando em maiúscula.
function capricho(rotulo) {
  const acentos = rotulo.normalize('NFD').length - rotulo.length
  return acentos + (rotulo.charAt(0) !== rotulo.charAt(0).toLocaleLowerCase('pt-BR') ? 1 : 0)
}

function escolherGrafia(atual, nova) {
  return capricho(nova) > capricho(atual) ? nova : atual
}

// Soma por nome, sem diferenciar acentos, maiúsculas e espaços.
function agrupar(itens) {
  const grupos = new Map()
  itens.forEach(({ rotulo, valor }) => {
    const chave = normalizarNomeCartao(rotulo)
    const grupo = grupos.get(chave) ?? { chave, rotulo: rotulo.trim(), valor: 0 }
    grupo.rotulo = escolherGrafia(grupo.rotulo, rotulo.trim())
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

const VOCE = 'Você'

// "Você" sempre primeiro, para manter a mesma cor em todos os cartões.
const porResponsavel = (a, b) => (b.rotulo === VOCE) - (a.rotulo === VOCE) || porNome(a, b)

// Uso atual do limite de cada cartão por quem fez o gasto: você ou a pessoa que vai te reembolsar.
// Cartões cadastrados mostram também o limite disponível; os não cadastrados, só o que foi gasto.
export function usoCartoesPorResponsavel(cartoes, contas, fechamento) {
  const semCadastro = cartoesSemCadastro(cartoes, contas, fechamento).map((nome) => ({
    nome,
    limite: null,
    compras: comprasEmAberto(contas, fechamento).filter((compra) => mesmoCartao(compra.conta.cartao, nome))
  }))

  return [...calcularUsoCartoes(cartoes, contas, fechamento), ...semCadastro].map((cartao) => {
    const gastos = cartao.compras.map(({ conta, emAberto }) => ({
      rotulo: conta.selected ? VOCE : conta.responsavel?.trim() || 'Outra pessoa',
      valor: emAberto
    }))
    const usado = gastos.reduce((total, gasto) => total + gasto.valor, 0)
    const disponivel = cartao.limite ? cartao.limite - usado : 0
    const fatias = montarFatias(agrupar(gastos), porResponsavel)
    if (disponivel > 0) fatias.push({ chave: 'disponivel', rotulo: 'Disponível', valor: disponivel, cor: 'var(--serie-disponivel)' })

    return { chave: normalizarNomeCartao(cartao.nome), nome: cartao.nome, limite: cartao.limite, usado, fatias }
  })
}

// Gastos que você paga no mês e no mês anterior, no total e por tipo de despesa.
export function compararComMesAnterior(contas, mes) {
  const anterior = deslocarMes(mes, -1)
  const grupos = new Map()

  contas
    .filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)
    .forEach((conta) => {
      const valores = { atual: valorNoMes(conta, mes), anterior: valorNoMes(conta, anterior) }
      if (valores.atual === 0 && valores.anterior === 0) return

      const rotulo = conta.categoria?.trim() || 'Sem tipo'
      const chave = normalizarNomeCartao(rotulo)
      const grupo = grupos.get(chave) ?? { chave, rotulo, atual: 0, anterior: 0 }
      grupo.rotulo = escolherGrafia(grupo.rotulo, rotulo)
      grupo.atual += valores.atual
      grupo.anterior += valores.anterior
      grupos.set(chave, grupo)
    })

  const tipos = [...grupos.values()].sort((a, b) => b.atual - a.atual || b.anterior - a.anterior)
  const somar = (campo) => tipos.reduce((total, tipo) => total + tipo[campo], 0)
  return { mesAnterior: anterior, atual: somar('atual'), anterior: somar('anterior'), tipos }
}

// Considera apenas as despesas que o usuário paga; as que outra pessoa vai pagar ficam de fora.
export function dadosDashboard(contas, mes) {
  const minhas = contas
    .filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)
    .map((conta) => ({ conta, valor: valorNoMes(conta, mes) }))
    .filter(({ valor }) => valor > 0)

  const soma = (itens) => itens.reduce((total, { valor }) => total + valor, 0)

  const porPessoa = minhas
    .filter(({ conta }) => conta.anotarPara?.trim())
    .map(({ conta, valor }) => ({ rotulo: conta.anotarPara, valor }))

  const comTipo = minhas.filter(({ conta }) => conta.categoria?.trim())

  return {
    semTipo: soma(minhas) - soma(comTipo),
    tipos: montarFatias(agrupar(comTipo.map(({ conta, valor }) => ({ rotulo: conta.categoria, valor }))), porTipo),
    pessoas: montarFatias(agrupar(porPessoa), porNome),
  }
}
