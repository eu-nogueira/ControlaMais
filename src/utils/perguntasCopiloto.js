import { entraNoMes, resumirAcertos } from './acertos'
import { ARTIGO, CATEGORIAS, MESES, NOME, PALAVRAS_SOLTAS, PARA, comparavel, limparDescricao, opcoesDeCartao, pessoasConhecidas, resolverPessoa, termo } from './copiloto'
import { valorNoMes } from './dashboard'
import { formatarDataISO, formatarMoeda, juntarLista } from './formatar'
import { deslocarMes, diasEntre, formatarMes } from './mes'
import { converterNumerosPorExtenso } from './numeros'
import { descreverAssinaturas, detectarAssinaturas, resumirMes } from './consultoria'
import { ehContaFixa, ehParcelado, parcelasRestantes } from './parcelas'
import { calcularSaldoExibido, mesDoSaldo, projetarProximoSalario } from './saldo'

// Perguntas que o Marcão responde com os dados já carregados no app, sem alterar nada.

export const ehPergunta = (texto) => /\?\s*$/.test(texto)
  || /^\s*(?:quanto|quantos|quantas|qual|quais|quem|o\s+que|tenho|mostra|me\s+mostra|resumo|como\s+(?:est[aá]|t[aá]|ficou|fica|foi)|minhas\s+assinaturas)(?![\p{L}])/iu.test(texto)

const AJUDA_PERGUNTAS = 'Ainda não sei responder isso. Posso te dizer: quanto você gastou (no mês ou por tipo), '
  + 'quanto recebeu, seu saldo, quem te deve, quanto você deve, o que vai vencer, quanto falta pagar de um parcelamento, '
  + 'suas assinaturas e o resumo do mês. Também dou dicas ("me dá dicas") e digo se uma compra cabe ("posso comprar...?").'

const nomeMes = (mes) => formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()

// "este mês" (padrão), "mês passado", "mês que vem" ou o nome do mês (o mais recente com esse nome).
function lerMes(texto, mesAtual) {
  if (termo('m[eê]s\\s+passado|m[eê]s\\s+anterior|[uú]ltimo\\s+m[eê]s').test(texto)) return deslocarMes(mesAtual, -1)
  if (termo('m[eê]s\\s+que\\s+vem|pr[oó]ximo\\s+m[eê]s').test(texto)) return deslocarMes(mesAtual, 1)
  const nome = MESES.find((mes) => termo(mes.replace('marco', 'mar[cç]o')).test(texto))
  if (!nome) return mesAtual
  const [ano] = mesAtual.split('-').map(Number)
  const candidato = `${ano}-${String(MESES.indexOf(nome) + 1).padStart(2, '0')}`
  return candidato > mesAtual ? deslocarMes(candidato, -12) : candidato
}

// Despesas que você paga (as que outra pessoa paga ficam de fora), como no Dashboard.
const minhasDespesas = (contas) => contas.filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)

// Palavras que aparecem depois de "devo"/"me deve" e não são nomes de pessoa.
const NAO_SAO_PESSOAS = new Set(['quanto', 'quem', 'eu', 'voce', 'este', 'esse', 'esta', 'essa', 'mes', 'ainda', 'hoje', ...MESES])

function procurarPessoa(texto, padroes, contas, apelidos) {
  for (const padrao of padroes) {
    const achado = texto.match(termo(padrao))
    const nome = comparavel(achado?.groups?.nome)
    if (nome && !NAO_SAO_PESSOAS.has(nome) && !PALAVRAS_SOLTAS.has(nome)) {
      return resolverPessoa(achado.groups.nome, pessoasConhecidas(contas), apelidos)
    }
  }
  return null
}

function responderAcertos(texto, { contas, mesAtual, aprendizado }, direcao) {
  const mes = lerMes(texto, mesAtual)
  const { euDevo, meDevem } = resumirAcertos(contas.filter((conta) => entraNoMes(conta, mes)))
  const lista = direcao === 'meDevem' ? meDevem : euDevo
  const quando = mes === mesAtual ? 'neste mês' : `em ${nomeMes(mes)}`

  const pessoa = direcao === 'meDevem'
    ? procurarPessoa(texto, [`(?:quanto|o\\s+que)\\s+${ARTIGO}(?<nome>${NOME})\\s+(?:ainda\\s+)?me\\s+deve`, `(?<nome>${NOME})\\s+(?:ainda\\s+)?me\\s+deve`], contas, aprendizado?.pessoas)
    : procurarPessoa(texto, [`devo\\s+${PARA}\\s+${ARTIGO}(?<nome>${NOME})`], contas, aprendizado?.pessoas)

  if (pessoa) {
    const valor = lista.find((item) => comparavel(item.pessoa) === comparavel(pessoa))?.valor ?? 0
    if (!valor) return direcao === 'meDevem' ? `${pessoa} não te deve nada ${quando}.` : `Você não deve nada para ${pessoa} ${quando}.`
    return direcao === 'meDevem' ? `${pessoa} te deve ${formatarMoeda(valor)} ${quando}.` : `Você deve ${formatarMoeda(valor)} para ${pessoa} ${quando}.`
  }

  if (lista.length === 0) return direcao === 'meDevem' ? `Ninguém te deve nada ${quando}.` : `Você não deve nada para ninguém ${quando}.`
  const total = lista.reduce((soma, item) => soma + item.valor, 0)
  const detalhes = juntarLista(lista.map((item) => `${item.pessoa} (${formatarMoeda(item.valor)})`))
  return direcao === 'meDevem'
    ? `${quando.charAt(0).toUpperCase()}${quando.slice(1)} te devem ${formatarMoeda(total)}: ${detalhes}.`
    : `${quando.charAt(0).toUpperCase()}${quando.slice(1)} você deve ${formatarMoeda(total)}: ${detalhes}.`
}

// Parcelamentos em andamento cuja descrição contém o termo.
function procurarParcelamentos(contas, termoBuscado) {
  const procurado = comparavel(termoBuscado)
  return contas.filter((conta) => ehParcelado(conta) && !ehContaFixa(conta) && parcelasRestantes(conta) > 0
    && (!procurado || comparavel(conta.descricao).includes(procurado)))
}

function responderFaltaPagar(texto, { contas }) {
  const alvo = texto.match(/(?:d[aoe]s?|n[ao]s?)\s+(.+?)\s*\??$/iu)
  const termoBuscado = alvo ? limparDescricao(alvo[1].replace(termo('parcelas?|parcelamentos?|compras?'), ' ')) : ''
  const encontrados = procurarParcelamentos(contas, termoBuscado)

  if (encontrados.length === 0) {
    return termoBuscado ? `Não encontrei parcelamento em aberto com "${termoBuscado}".` : 'Você não tem parcelamentos em aberto.'
  }

  if (termoBuscado && encontrados.length <= 3) {
    return encontrados.map((conta) => {
      const restantes = parcelasRestantes(conta)
      return `${conta.descricao}: faltam ${restantes} de ${conta.parcela} parcelas (${formatarMoeda(restantes * conta.valorFormatado)}).`
    }).join(' ')
  }

  const total = encontrados.reduce((soma, conta) => soma + parcelasRestantes(conta) * conta.valorFormatado, 0)
  return `Falta pagar ${formatarMoeda(total)} em ${encontrados.length} ${encontrados.length === 1 ? 'parcelamento' : 'parcelamentos'}. Contas fixas não entram nessa soma.`
}

function responderSaldo({ contas, fechamento, mesAtual }) {
  const { saldo, mediaSalarial } = calcularSaldoExibido(contas, fechamento, mesAtual)
  const estimativa = mediaSalarial ? ' (usando a média do seu salário, porque ainda não há receita registrada neste período)' : ''
  const projecao = projetarProximoSalario(contas, fechamento, mesAtual)
  const depois = projecao ? ` Depois de quitar as contas do mês passado, o próximo salário fica com ${formatarMoeda(projecao.saldo)}.` : ''
  return `Seu saldo agora é ${formatarMoeda(saldo)}${estimativa}.${depois}`
}

function responderRecebido(texto, { contas, mesAtual }) {
  const mes = lerMes(texto, mesAtual)
  const receitas = contas.filter((conta) => conta.tipoConta === 'Receita' && mesDoSaldo(conta) === mes)
  const total = receitas.reduce((soma, conta) => soma + conta.valorFormatado, 0)
  const quando = mes === mesAtual ? 'neste mês' : `em ${nomeMes(mes)}`
  if (receitas.length === 0) return `Você não registrou nenhuma receita ${quando}.`
  return `Você recebeu ${formatarMoeda(total)} ${quando}, em ${receitas.length} ${receitas.length === 1 ? 'receita' : 'receitas'}.`
}

// Despesas suas com vencimento nos próximos dias (ou até o fim do mês) que ainda não foram pagas.
function responderVencimentos(texto, { contas, fechamento, hoje }) {
  const ateFimDoMes = termo('(?:est|ess)e\\s+m[eê]s|no\\s+m[eê]s').test(texto)
  const fim = ateFimDoMes ? `${hoje.slice(0, 7)}-31` : null
  const dias = 7

  const emAberto = minhasDespesas(contas).filter((conta) => {
    if (!conta.dataVencimento) return false
    if (ehParcelado(conta)) return parcelasRestantes(conta) > 0
    return !fechamento || mesDoSaldo(conta) > fechamento.mes
  })
  const proximas = emAberto
    .filter((conta) => conta.dataVencimento >= hoje && (fim ? conta.dataVencimento <= fim : diasEntre(hoje, conta.dataVencimento) <= dias))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))

  const periodo = ateFimDoMes ? 'até o fim do mês' : `nos próximos ${dias} dias`
  if (proximas.length === 0) return `Nada vence ${periodo}.`
  const total = proximas.reduce((soma, conta) => soma + conta.valorFormatado, 0)
  const itens = proximas.slice(0, 5).map((conta) => `${conta.descricao} (${formatarMoeda(conta.valorFormatado)}, ${formatarDataISO(conta.dataVencimento).slice(0, 5)})`)
  const mais = proximas.length > 5 ? ` e mais ${proximas.length - 5}` : ''
  return `Vence ${periodo}: ${juntarLista(itens)}${mais}. Total de ${formatarMoeda(total)}.`
}

// `aPagar`: pergunta feita com "devo" ("quanto devo de alimentação?"), respondida com as despesas do filtro.
function responderGastos(texto, { contas, cartoes, mesAtual, aprendizado }, { aPagar = false } = {}) {
  const mes = lerMes(texto, mesAtual)
  const quando = mes === mesAtual ? 'neste mês' : `em ${nomeMes(mes)}`
  const doMes = minhasDespesas(contas).map((conta) => ({ conta, valor: valorNoMes(conta, mes) })).filter(({ valor }) => valor > 0)

  // Filtro opcional: "com alimentação", "no Uber", "no Nubank".
  const filtro = texto.match(/(?:com|de|em|no|na|nos|nas)\s+(?!(?:est|ess)e\s+m[eê]s|m[eê]s)(.+?)(?:\s+(?:n?est[ea]|n?ess[ea]|no|em|de)\s+(?:m[eê]s|janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro).*)?\s*\??$/iu)
  const termoBuscado = filtro ? limparDescricao(filtro[1].replace(/\b(?:o|a|os|as)\b/giu, ' ')) : ''

  if (termoBuscado) {
    const procurado = comparavel(termoBuscado)
    const categoria = CATEGORIAS.map(([nome]) => nome).find((nome) => comparavel(nome).startsWith(procurado))
    const cartao = opcoesDeCartao(cartoes, aprendizado).find((item) => comparavel(item.termo) === procurado)
    const filtrados = doMes.filter(({ conta }) => (categoria ? comparavel(conta.categoria) === comparavel(categoria)
      : cartao ? comparavel(conta.cartao) === procurado
        : comparavel(conta.descricao).includes(procurado) || comparavel(conta.categoria) === procurado))
    const rotulo = cartao ? `no cartão ${cartao.nome}` : `com ${categoria ?? termoBuscado}`
    const total = filtrados.reduce((soma, { valor }) => soma + valor, 0)
    if (filtrados.length === 0) return `Não encontrei despesas ${rotulo} ${quando}.`
    const quantidade = `${filtrados.length} ${filtrados.length === 1 ? 'lançamento' : 'lançamentos'}`
    return aPagar
      ? `Você tem ${formatarMoeda(total)} em despesas ${rotulo} ${quando} (${quantidade}).`
      : `Você gastou ${formatarMoeda(total)} ${rotulo} ${quando} (${quantidade}).`
  }

  if (doMes.length === 0) return `Você não tem gastos registrados ${quando}.`
  const total = doMes.reduce((soma, { valor }) => soma + valor, 0)
  const porTipo = {}
  doMes.forEach(({ conta, valor }) => {
    const tipo = conta.categoria?.trim() || 'Sem tipo'
    porTipo[tipo] = (porTipo[tipo] || 0) + valor
  })
  const maiores = Object.entries(porTipo).sort((a, b) => b[1] - a[1]).slice(0, 3)
  return `Você gastou ${formatarMoeda(total)} ${quando}. Os maiores: ${juntarLista(maiores.map(([tipo, valor]) => `${tipo} (${formatarMoeda(valor)})`))}.`
}

// Resumo do último mês quitado (o mesmo mostrado automaticamente ao quitar).
function responderResumoDoMes({ contas, fechamento }) {
  if (!fechamento) return 'Ainda não há mês quitado. O resumo aparece quando você quita as contas de um mês.'
  return resumirMes(contas, fechamento.mes, fechamento).join(' ')
}

// Devolve o texto da resposta, ou null quando a mensagem não é uma pergunta.
export function responderPergunta(textoDigitado, contexto) {
  const texto = converterNumerosPorExtenso(textoDigitado)
  if (!ehPergunta(texto)) return null

  if (termo('assinaturas?|servi[cç]os\\s+recorrentes|streamings?').test(texto)) return descreverAssinaturas(detectarAssinaturas(contexto.contas, contexto.mesAtual))
  if (termo('resumo\\s+do\\s+m[eê]s|como\\s+foi\\s+(?:o\\s+)?(?:meu\\s+)?m[eê]s|fechamento\\s+do\\s+m[eê]s').test(texto)) return responderResumoDoMes(contexto)
  if (termo('me\\s+deve(?:m)?|me\\s+devendo|a\\s+receber|tenho\\s+(?:pra|para|a)\\s+receber').test(texto)) return responderAcertos(texto, contexto, 'meDevem')
  // "quanto devo de alimentação/no Nubank/com mercado" pergunta das despesas, não de uma pessoa.
  if (/devo\s+(?:de|com|no|na|nos|nas|em)\s+(?!(?:est|ess)[ea]\s+m[eê]s|m[eê]s)/iu.test(texto)) return responderGastos(texto, contexto, { aPagar: true })
  if (termo('devo|a\\s+pagar\\s+(?:pra|para)|estou\\s+devendo|t[oô]\\s+devendo').test(texto)) return responderAcertos(texto, contexto, 'euDevo')
  if (termo('falta(?:m)?\\s+pagar|faltam|parcelas?\\s+(?:restantes|faltando)').test(texto)) return responderFaltaPagar(texto, contexto)
  if (termo('vence(?:m)?|vencimentos?|vencendo|contas?\\s+a\\s+pagar|pr[oó]ximas?\\s+contas?').test(texto)) return responderVencimentos(texto, contexto)
  if (termo('saldo|sobra|sobrando|sobrou|tenho\\s+dispon[ií]vel|posso\\s+gastar').test(texto)) return responderSaldo(contexto)
  if (termo('recebi|receitas?|ganhei|entrou|entradas?').test(texto)) return responderRecebido(texto, contexto)
  if (termo('gastei|gastos?|despesas?|gastando|gastamos').test(texto)) return responderGastos(texto, contexto)

  return AJUDA_PERGUNTAS
}
