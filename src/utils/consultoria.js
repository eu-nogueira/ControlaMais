import { entraNoMes, resumirAcertos } from './acertos'
import { calcularUsoCartoes } from './cartoes'
import { NUMERO, comparavel, interpretarTexto, paraNumero, termo } from './copiloto'
import { compararComMesAnterior, valorNoMes } from './dashboard'
import { formatarMoeda, juntarLista } from './formatar'
import { deslocarMes, formatarMes, mesesEntre } from './mes'
import { MESES_RESERVA } from './metas'
import { converterNumerosPorExtenso } from './numeros'
import { ehContaFixa, ehParcelado, totalParcelasDe } from './parcelas'
import { calcularSaldoExibido, mesDoSaldo, projetarProximoSalario } from './saldo'
import { ORIGENS_VALOR_FUTURO, calcularValorFuturo, descreverCombinacao, estimarRenda, listarDividas, projetarDisponivel, recomendarCombinacoes, rotuloOrigem } from './simulacao'

// Dicas financeiras do Marcão: tudo calculado com os dados do próprio app (saldo, projeção,
// parcelas, extrato, acertos, cartões e metas), por regras. Não é recomendação de investimento.

export const MESES_CONSULTORIA = 6

const moeda = (valor) => formatarMoeda(valor)
const arredondar = (valor) => Math.round(valor * 100) / 100
const percentual = (fracao) => `${Math.round(fracao * 100)}%`
const nomeMes = (mes) => formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()
const somar = (itens, campo) => itens.reduce((total, item) => total + (campo ? item[campo] : item), 0)
const primeiraMinuscula = (texto) => texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)

// ---- Conversa: pedido de dicas e valores extras a receber ----

export const ehPedidoDeDicas = (texto) => termo([
  'dicas?', 'conselhos?', 'consultoria',
  'melhorar\\s+(?:a\\s+|minha\\s+|minhas\\s+|as\\s+|meu\\s+)?(?:situa[cç][aã]o|finan[cç]as|vida\\s+financeira|saldo|or[cç]amento)',
  'analis[ae]r?\\s+(?:a\\s+|minha\\s+|minhas\\s+|meu\\s+)?(?:situa[cç][aã]o|finan[cç]as|contas|vida\\s+financeira|or[cç]amento)',
  'como\\s+(?:estou|t[oô]|est[aã]o)\\s+(?:de\\s+|nas\\s+|as\\s+|minhas\\s+)?(?:finan[cç]as|grana|dinheiro)',
  'me\\s+ajud[ae]\\s+(?:a\\s+economizar|com\\s+(?:as\\s+|minhas\\s+)?(?:finan[cç]as|contas))',
].join('|')).test(texto)

// Nome do valor extra numa frase: "o 13º salário", "as férias", "esse valor extra".
export const nomeDoExtra = (origem) => ({
  decimo_terceiro: 'o 13º salário', fgts: 'o FGTS', restituicao_ir: 'a restituição do IR', ferias: 'as férias', plr: 'a PLR',
}[origem] ?? 'esse valor extra')

export const OPCAO_SEM_EXTRAS = 'Não tenho'
export const OPCAO_ANALISAR = 'Não, pode analisar'

export const opcoesDeExtras = (jaInformados = []) => [
  ...ORIGENS_VALOR_FUTURO.filter((origem) => origem.valor === 'outro' || !jaInformados.includes(origem.valor)).map((origem) => origem.rotulo),
  jaInformados.length > 0 ? OPCAO_ANALISAR : OPCAO_SEM_EXTRAS,
]

// "13º", "décimo terceiro", "férias", "fgts", "restituição"... ou "não tenho" ('nenhum').
export function lerOrigemExtra(texto) {
  const procurado = comparavel(texto)
  if (/^(nao|nenhum|nada|so isso|pode analisar|nao tenho|nao,? pode analisar|analisa|pode)\b/.test(procurado)) return 'nenhum'
  if (/13|decimo/.test(procurado)) return 'decimo_terceiro'
  if (/fgts|fundo de garantia|saque/.test(procurado)) return 'fgts'
  if (/ferias/.test(procurado)) return 'ferias'
  if (/restitui|imposto|\bir\b/.test(procurado)) return 'restituicao_ir'
  if (/\bplr\b|\bppr\b|participacao|bonus|bonificacao/.test(procurado)) return 'plr'
  if (/outro|outra/.test(procurado)) return 'outro'
  return null
}

export function lerValorExtra(texto) {
  const achado = converterNumerosPorExtenso(texto).match(new RegExp(`(${NUMERO})(\\s*mil)?`, 'iu'))
  if (!achado) return null
  const valor = paraNumero(achado[1]) * (achado[2] ? 1000 : 1)
  return valor > 0 ? valor : null
}

const MESES_NOMES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Mês de recebimento: "dezembro", "dezembro de 2026", "12/2026", "mês que vem", "este mês".
// Precisa estar entre o mês atual e os próximos 11 meses.
export function lerMesExtra(texto, mesAtual) {
  const procurado = comparavel(texto)
  let mes = null
  if (/(este|esse) mes|agora/.test(procurado)) mes = mesAtual
  else if (/mes que vem|proximo mes/.test(procurado)) mes = deslocarMes(mesAtual, 1)
  else {
    const numerico = procurado.match(/\b(\d{1,2})\/(\d{2}|\d{4})\b/)
    const indice = MESES_NOMES.findIndex((nome) => procurado.includes(nome))
    const ano = procurado.match(/\b(20\d{2})\b/)?.[1]
    if (numerico) mes = `${numerico[2].length === 2 ? `20${numerico[2]}` : numerico[2]}-${numerico[1].padStart(2, '0')}`
    else if (indice >= 0) {
      const candidato = `${ano ?? mesAtual.slice(0, 4)}-${String(indice + 1).padStart(2, '0')}`
      mes = !ano && candidato < mesAtual ? deslocarMes(candidato, 12) : candidato
    }
  }
  if (!mes || mes < mesAtual || mesesEntre(mesAtual, mes) > 11) return null
  return mes
}

// Dias de férias e de venda (abono): "15 dias", "quinze", "20 dias e vender 10", "vender 10 dias".
// Vendendo sem dizer quantos dias tira, considera que tira o restante dos 30.
export const OPCOES_DIAS_FERIAS = ['30 dias', '20 dias e vender 10', '15 dias', '10 dias']

export function lerDiasFerias(texto) {
  const convertido = converterNumerosPorExtenso(texto)
  const venda = convertido.match(/vend\w*\s+(?:de\s+|os\s+)?(\d{1,2})/iu)
  const vendidos = venda ? Number(venda[1]) : 0
  const semVenda = venda ? convertido.replace(venda[0], ' ') : convertido
  const dias = semVenda.match(/\d{1,2}/)?.[0]
  if (dias) return { dias: Number(dias), vendidos }
  return venda ? { dias: 30 - vendidos, vendidos } : null
}

export const opcoesDeMeses = (mesAtual) => Array.from({ length: MESES_CONSULTORIA }, (_, indice) => formatarMes(deslocarMes(mesAtual, indice + 1)))

// Sugestões para facilitar a resposta: o 13º costuma ser um salário, pago até dezembro;
// das férias, o dinheiro livre é por volta de 1/3 do salário.
export function sugestaoDeExtra(origem, contas, mesAtual) {
  const { renda } = estimarRenda(contas, mesAtual)
  if (origem === 'decimo_terceiro') {
    const dezembro = `${mesAtual.slice(0, 4)}-12`
    return { valor: renda, mes: dezembro >= mesAtual ? dezembro : deslocarMes(dezembro, 12) }
  }
  if (origem === 'ferias' && renda) return { valor: arredondar(renda / 3), mes: null }
  return { valor: null, mes: null }
}

// ---- Assinaturas esquecidas ----

const SERVICOS = termo([
  'netflix', 'spotify', 'disney', 'hbo', 'max', 'prime\\s+video', 'amazon\\s+prime', 'youtube', 'globoplay', 'deezer', 'apple',
  'icloud', 'google\\s+one', 'xbox', 'game\\s+pass', 'playstation', 'ps\\s+plus', 'crunchyroll', 'paramount', 'telecine', 'star\\s*plus',
  'uber\\s+one', 'ifood\\s+club', 'rappi', 'chatgpt', 'canva', 'dropbox', 'microsoft\\s+365', 'office', 'kindle', 'audible', 'tidal',
  'twitch', 'patreon', 'academia', 'smart\\s*fit', 'gympass', 'wellhub', 'totalpass', 'assinatura', 'mensalidade',
].join('|'))

const chave = (texto) => comparavel(texto).replace(/[^\p{L}\d]+/gu, '')

// Contas essenciais nunca entram em sugestão de corte: moradia, contas da casa, veículo, saúde,
// educação, impostos, seguros e dívidas (financiamentos, empréstimos, consórcios).
const ESSENCIAIS = termo([
  'aluguel', 'condominio', 'casa', 'apartamento', 'apto', 'imovel', 'moradia', 'financiamento', 'prestacao', 'parcela\\s+da\\s+casa',
  'luz', 'energia', 'agua', 'esgoto', 'saneamento', 'gas', 'internet', 'telefone', 'celular', 'plano\\s+de\\s+celular',
  'carro', 'moto', 'veiculo', 'consorcio', 'seguro', 'ipva', 'iptu', 'licenciamento', 'combustivel', 'gasolina',
  'plano\\s+de\\s+saude', 'saude', 'convenio', 'medico', 'remedio', 'farmacia', 'terapia', 'dentista', 'odonto',
  'escola', 'faculdade', 'creche', 'curso', 'educacao', 'mensalidade\\s+escolar', 'material\\s+escolar',
  'pensao', 'emprestimo', 'consignado', 'fatura', 'imposto', 'previdencia', 'inss',
].join('|'))
const CATEGORIAS_ESSENCIAIS = ['casa', 'educacao']

export const ehEssencial = (conta) => ESSENCIAIS.test(comparavel(conta.descricao)) || CATEGORIAS_ESSENCIAIS.includes(comparavel(conta.categoria))

// Contas fixas pequenas ou de serviços conhecidos, e serviços conhecidos que se repetem nos últimos
// meses sem estar marcados como conta fixa. Contas essenciais (aluguel, luz, carro...) ficam de fora.
export function detectarAssinaturas(contas, mesAtual) {
  const minhas = contas.filter((conta) => conta.tipoConta === 'Despesa' && conta.selected && mesDoSaldo(conta) <= mesAtual && !ehEssencial(conta))
  const encontradas = new Map()

  minhas
    .filter((conta) => ehContaFixa(conta) && (conta.valorFormatado <= 150 || SERVICOS.test(comparavel(conta.descricao))))
    .forEach((conta) => encontradas.set(chave(conta.descricao), { descricao: conta.descricao, valor: conta.valorFormatado }))

  const recentes = [mesAtual, deslocarMes(mesAtual, -1), deslocarMes(mesAtual, -2)]
  const repetidas = new Map()
  minhas
    .filter((conta) => !ehContaFixa(conta) && SERVICOS.test(comparavel(conta.descricao)) && recentes.includes(mesDoSaldo(conta)))
    .forEach((conta) => {
      const grupo = repetidas.get(chave(conta.descricao)) ?? { conta, meses: new Set() }
      grupo.meses.add(mesDoSaldo(conta))
      if (conta.dataCadastro > grupo.conta.dataCadastro) grupo.conta = conta
      repetidas.set(chave(conta.descricao), grupo)
    })
  repetidas.forEach(({ conta, meses }, chaveConta) => {
    if (meses.size >= 2 && !encontradas.has(chaveConta)) encontradas.set(chaveConta, { descricao: conta.descricao, valor: conta.valorFormatado })
  })

  return [...encontradas.values()].sort((a, b) => b.valor - a.valor)
}

export function descreverAssinaturas(assinaturas) {
  if (assinaturas.length === 0) return 'Não encontrei assinaturas ou serviços recorrentes nos seus lançamentos.'
  const total = somar(assinaturas, 'valor')
  const lista = juntarLista(assinaturas.slice(0, 6).map(({ descricao, valor }) => `${descricao} (${moeda(valor)})`))
  const mais = assinaturas.length > 6 ? ` e mais ${assinaturas.length - 6}` : ''
  return `Encontrei ${assinaturas.length} ${assinaturas.length === 1 ? 'possível assinatura' : 'possíveis assinaturas'} somando ${moeda(total)} por mês `
    + `(${moeda(total * 12)} por ano): ${lista}${mais}. Você ainda usa todas? Cancelar uma de ${moeda(assinaturas[assinaturas.length - 1].valor)} `
    + `economiza ${moeda(assinaturas[assinaturas.length - 1].valor * 12)} no ano.`
}

// ---- Diagnóstico e dicas ----

// 13º calculado na conversa abre a Simulação também no "Calcular para mim", com o mesmo salário.
function entradaParaSimulacao(extra, combinacao, renda) {
  const campo = (valor) => (valor == null ? '' : valor.toFixed(2).replace('.', ','))
  return {
    tipo: 'futuro',
    origem: extra.origem,
    descricaoOrigem: '',
    mesRecebimento: extra.mes,
    valor: campo(extra.valor),
    // Férias só pelo 1/3 abrem no "Calcular para mim" (que considera o dinheiro livre); pelo total, com o valor informado.
    modoFerias: extra.origem === 'ferias' && extra.calculo && !extra.calculo.valorTotal ? 'calcular' : 'manual',
    modoDecimo: extra.origem === 'decimo_terceiro' && extra.calculo ? 'calcular' : 'manual',
    mesesTrabalhados: '12',
    primeiraRecebida: Boolean(extra.calculo?.primeiraRecebida),
    salarioBruto: extra.calculo ? campo(extra.calculo.salario) : '',
    diasFerias: String(extra.calculo?.dias ?? 30),
    diasVendidos: extra.calculo?.vendidos ? String(extra.calculo.vendidos) : '',
    mediaAdicionais: '',
    compras: [],
    renda: campo(renda),
    decisoes: combinacao?.decisoes ?? {},
    descontos: {},
  }
}

// `extras`: [{ origem, valor, mes }] informados na conversa. Devolve a situação atual e até 5 ações,
// das mais importantes para as menos, algumas com botão (simular, criar meta).
export function diagnosticar({ contas, fechamento, cartoes = [], metas = [], mesAtual, extras = [] }) {
  const { saldo, receitas, despesas } = calcularSaldoExibido(contas, fechamento, mesAtual)
  const proximo = projetarProximoSalario(contas, fechamento, mesAtual)
  const { renda, pontos } = projetarDisponivel(contas, mesAtual, MESES_CONSULTORIA)
  const dividas = listarDividas(contas, mesAtual)
  const situacao = []
  const acoes = []
  const acao = (prioridade, texto, botao = null) => acoes.push({ prioridade, texto, botao })

  // Como está agora.
  situacao.push(`Saldo disponível: ${moeda(saldo)}${receitas > 0 ? `, com ${percentual(despesas / receitas)} da renda deste período já comprometida` : ''}.`)
  if (proximo) situacao.push(`Depois de quitar o mês passado, o próximo salário fica com ${moeda(proximo.saldo)}.`)
  if (renda === null) {
    situacao.push('Ainda não há receitas registradas, então não consigo projetar os próximos meses.')
  } else {
    const piorMes = pontos.reduce((pior, ponto) => (ponto.sobra < pior.sobra ? ponto : pior), pontos[0])
    situacao.push(`Nos próximos ${MESES_CONSULTORIA} meses, da renda média de ${moeda(renda)} sobram entre ${moeda(piorMes.sobra)} e ${moeda(Math.max(...pontos.map((ponto) => ponto.sobra)))} por mês depois das parcelas e contas fixas (o mês mais apertado é ${nomeMes(piorMes.mes)}).`)
  }
  if (dividas.length > 0) {
    const maior = [...dividas].sort((a, b) => b.valorParcela - a.valorParcela)[0]
    situacao.push(`Parcelas e contas fixas somam ${moeda(somar(dividas, 'valorParcela'))} por mês; a maior é ${maior.descricao} (${moeda(maior.valorParcela)}).`)
  }
  const extrasValidos = extras.filter((extra) => extra.valor > 0 && extra.mes)
  if (extrasValidos.length > 0) {
    situacao.push(`Valores a receber: ${juntarLista(extrasValidos.map((extra) => `${rotuloOrigem(extra.origem)} (${moeda(extra.valor)} em ${nomeMes(extra.mes)}${extra.calculo?.valorTotal ? ', com o salário adiantado' : ''})`))}.`)
    if (extrasValidos.some((extra) => extra.calculo?.valorTotal)) {
      situacao.push('Nas férias você escolheu considerar o valor total: lembre que o salário dos dias de férias vem adiantado e o próximo pagamento virá menor.')
    }
  }

  // 1. Saldo atual negativo.
  if (saldo < 0) {
    acao(100, `Seu saldo atual está negativo em ${moeda(-saldo)}. Até o próximo salário, segure gastos no cartão e novas compras: o que passar disso vira dívida no mês seguinte.`)
  }

  // 2. Meses negativos na projeção.
  const negativos = renda === null ? [] : pontos.filter((ponto) => ponto.sobra < 0)
  if (negativos.length > 0) {
    const primeiro = negativos[0]
    const melhora = pontos.find((ponto) => ponto.mes > primeiro.mes && ponto.sobra >= 0)
    const cobertura = extrasValidos.filter((extra) => extra.mes <= primeiro.mes).reduce((total, extra) => total + extra.valor, 0)
    acao(90 + Math.min(negativos.length, 5), `Em ${nomeMes(primeiro.mes)} a sobra fica negativa (${moeda(primeiro.sobra)}): parcelas e contas fixas (${moeda(primeiro.parcelas)}) passam da sua renda média.`
      + `${melhora ? ` A situação melhora em ${nomeMes(melhora.mes)}.` : ''} Evite novos parcelamentos até lá.`
      + `${cobertura >= -primeiro.sobra ? ' O valor extra que você vai receber antes disso cobre essa diferença, se for guardado para isso.' : ''}`)
  }

  // 3. Melhor uso de cada valor extra: a mesma recomendação da Simulação.
  extrasValidos
    .sort((a, b) => b.valor - a.valor)
    .forEach((extra, posicao) => {
      const valorFuturo = calcularValorFuturo({ valor: extra.valor, origem: extra.origem, mes: extra.mes, mesAtual })
      if (!valorFuturo.valido) return
      const [melhor] = recomendarCombinacoes({ contas, fechamento, mesAtual, emprestimo: valorFuturo, renda: renda ?? 0, descontos: {} })
      const rotulo = rotuloOrigem(extra.origem)
      if (melhor && melhor.descricoes.length > 0) {
        acao(80 - posicao, `Com ${nomeDoExtra(extra.origem)} (${moeda(extra.valor)} em ${nomeMes(extra.mes)}): ${primeiraMinuscula(descreverCombinacao(melhor))}. `
          + `Você deixa de pagar ${moeda(melhor.economiaMensal)} por mês${melhor.restante > 0 ? ` e ainda sobram ${moeda(melhor.restante)}` : ''}.`,
        { rotulo: 'Simular isso', tipo: 'simular', dados: { nome: `${rotulo} (sugestão do Marcão)`, entrada: entradaParaSimulacao(extra, melhor, renda) } })
      } else {
        acao(50 - posicao, `Você não tem parcelamentos que valham quitar com ${nomeDoExtra(extra.origem)}: guardar esse valor numa reserva te protege de imprevistos.`,
          { rotulo: 'Criar reserva', tipo: 'meta', dados: { tipo: 'reserva', nome: 'Reserva de emergência', valorAlvo: arredondar(despesas * MESES_RESERVA) || null } })
      }
    })

  // 4. Renda muito comprometida e parcelas que vão terminar.
  if (receitas > 0 && despesas / receitas > 0.7) {
    acao(70, `${percentual(despesas / receitas)} da renda deste período já está comprometida. Antes de assumir qualquer parcela nova, espere algum parcelamento terminar.`)
  }
  const termino = pontos.find((ponto) => ponto.encerrados.length > 0)
  if (termino) {
    const liberado = somar(termino.encerrados, 'valorParcela')
    acao(25, `Boa notícia: em ${nomeMes(termino.mes)} termina ${juntarLista(termino.encerrados.map((divida) => divida.descricao))}, liberando ${moeda(liberado)} por mês. Guardar esse valor em vez de parcelar outra compra acelera a sua folga.`)
  }

  // 5. Cartões perto do limite.
  calcularUsoCartoes(cartoes, contas, fechamento)
    .filter((cartao) => cartao.limite > 0 && cartao.usado / cartao.limite >= 0.8)
    .forEach((cartao) => acao(55, `O cartão ${cartao.nome} está com ${percentual(cartao.usado / cartao.limite)} do limite usado (${moeda(cartao.usado)} de ${moeda(cartao.limite)}). Evite novas compras nele até liberar.`))

  // 6. Tipo de despesa que mais cresceu (meses completos: o passado contra o anterior a ele).
  const mesPassado = deslocarMes(mesAtual, -1)
  const crescimento = compararComMesAnterior(contas, mesPassado).tipos
    .filter((tipo) => tipo.rotulo !== 'Sem tipo' && tipo.anterior > 0)
    .map((tipo) => ({ ...tipo, diferenca: tipo.atual - tipo.anterior }))
    .filter((tipo) => tipo.diferenca >= Math.max(50, tipo.anterior * 0.2))
    .sort((a, b) => b.diferenca - a.diferenca)[0]
  if (crescimento) {
    acao(45, `${crescimento.rotulo} subiu ${moeda(crescimento.diferenca)} em ${nomeMes(mesPassado)} em relação a ${nomeMes(deslocarMes(mesPassado, -1))} (${moeda(crescimento.anterior)} → ${moeda(crescimento.atual)}). Vale olhar o que mudou nesses gastos.`)
  }

  // 7. Dinheiro a receber de outras pessoas.
  const { meDevem } = resumirAcertos(contas.filter((conta) => entraNoMes(conta, mesAtual)))
  if (meDevem.length > 0) {
    acao(40, `Há ${moeda(somar(meDevem, 'valor'))} para receber de ${juntarLista(meDevem.map((item) => item.pessoa))} neste mês. Cobrar ajuda a fechar o mês com folga.`)
  }

  // 8. Assinaturas esquecidas.
  const assinaturas = detectarAssinaturas(contas, mesAtual)
  if (assinaturas.length > 0) acao(35, descreverAssinaturas(assinaturas))

  // 9. Reserva de emergência.
  const temReserva = metas.some((meta) => meta.tipo === 'reserva')
  const sobraMedia = renda === null ? saldo : somar(pontos, 'sobra') / pontos.length
  if (!temReserva && sobraMedia > 0 && despesas > 0) {
    const alvo = arredondar(despesas * MESES_RESERVA)
    const porMes = Math.max(10, Math.floor((sobraMedia * 0.2) / 10) * 10)
    acao(30, `Você ainda não tem uma reserva de emergência. O ideal é juntar ${MESES_RESERVA} meses das suas despesas (${moeda(alvo)}); começar guardando ${moeda(porMes)} por mês já faz diferença.`,
      { rotulo: 'Criar reserva', tipo: 'meta', dados: { tipo: 'reserva', nome: 'Reserva de emergência', valorAlvo: alvo } })
  }

  // Tudo em ordem.
  if (acoes.every((item) => item.prioridade < 45) && renda !== null && negativos.length === 0) {
    acao(20, `Sua situação está equilibrada: sobram em média ${moeda(sobraMedia)} por mês depois das parcelas. Defina um destino para essa sobra (uma meta) para ela não se perder em gastos do dia a dia.`,
      { rotulo: 'Criar meta', tipo: 'meta', dados: { tipo: 'meta', nome: '', valorAlvo: null } })
  }

  return {
    situacao,
    acoes: acoes.sort((a, b) => b.prioridade - a.prioridade).slice(0, 5).map(({ texto, botao }) => ({ texto, botao })),
  }
}

// ---- Posso comprar? ----

export const ehPerguntaDeCompra = (texto) => termo([
  'posso\\s+comprar', 'consigo\\s+comprar', 'd[aá]\\s+(?:pra|para)\\s+(?:eu\\s+)?comprar', 'cabe\\s+no\\s+(?:meu\\s+)?(?:bolso|or[cç]amento)',
  'vale\\s+a\\s+pena\\s+comprar', 'posso\\s+gastar', 'posso\\s+parcelar', 'devo\\s+comprar',
].join('|')).test(texto)

// Simula a compra: à vista sai do saldo atual; parcelada, as parcelas começam no mês seguinte
// e são comparadas com a sobra projetada de cada mês.
export function avaliarCompra(texto, { contas, cartoes = [], fechamento, mesAtual, hoje, aprendizado }) {
  const limpo = texto
    .replace(new RegExp(termo('posso|consigo|d[aá]\\s+(?:pra|para)(?:\\s+eu)?|cabe\\s+no\\s+(?:meu\\s+)?(?:bolso|or[cç]amento)|vale\\s+a\\s+pena|devo|marc[aã]o|comprar|gastar|parcelar').source, 'giu'), ' ')
    .replace(/[?!]/g, ' ')
  const { conta, detectados } = interpretarTexto(limpo, { contas, cartoes, hoje, aprendizado })
  if (!detectados.valor) {
    return { texto: 'Me diga o valor e, se for parcelado, em quantas vezes. Ex.: "posso comprar uma TV de 2.000 em 10x?"' }
  }

  const parcelas = conta.contaFixa ? Infinity : Number(conta.parcela) || 1
  const parcela = conta.valorFormatado
  const oQue = conta.descricao ? `${conta.descricao} ` : ''
  const registrar = { rotulo: 'Registrar a compra', tipo: 'registrar', dados: conta }
  const aviso = ' Lembre que gastos do dia a dia também saem dessa sobra.'
  const { saldo } = calcularSaldoExibido(contas, fechamento, mesAtual)

  if (parcelas === 1) {
    const depois = arredondar(saldo - parcela)
    const { renda } = estimarRenda(contas, mesAtual)
    const folga = renda ? renda * 0.1 : 0
    if (depois >= folga) return { texto: `Pode. Comprando ${oQue}à vista por ${moeda(parcela)}, o saldo até o próximo salário fica em ${moeda(depois)}.`, botao: registrar }
    if (depois >= 0) return { texto: `Cabe, mas fica apertado: depois da compra sobram só ${moeda(depois)} até o próximo salário.`, botao: registrar }
    return { texto: `Melhor não agora: à vista, o saldo ficaria negativo em ${moeda(-depois)}. Parcelar ou esperar o próximo salário evita entrar no vermelho.`, botao: registrar }
  }

  const { renda, pontos } = projetarDisponivel(contas, mesAtual, 12)
  if (renda === null) return { texto: 'Para avaliar uma compra parcelada eu preciso da sua renda: registre as suas receitas e pergunte de novo.' }

  const meses = Math.min(parcelas, pontos.length)
  const comCompra = pontos.slice(0, meses).map((ponto) => ({ ...ponto, depois: arredondar(ponto.sobra - parcela) }))
  const pior = comCompra.reduce((menor, ponto) => (ponto.depois < menor.depois ? ponto : menor), comCompra[0])
  const folga = renda * 0.1
  const descricaoCompra = `${oQue}em ${Number.isFinite(parcelas) ? `${parcelas}x` : 'mensalidades'} de ${moeda(parcela)}`
  const alem = Number.isFinite(parcelas) && parcelas > pontos.length ? ` A análise cobre os próximos ${pontos.length} meses.` : ''

  if (pior.depois >= folga) {
    return { texto: `Pode. Com ${descricaoCompra}, ainda sobram pelo menos ${moeda(pior.depois)} por mês (o mês mais apertado é ${nomeMes(pior.mes)}).${aviso}${alem}`, botao: registrar }
  }
  if (pior.depois >= 0) {
    return { texto: `Cabe, mas fica apertado: com ${descricaoCompra}, em ${nomeMes(pior.mes)} sobram só ${moeda(pior.depois)}.${aviso}${alem}`, botao: registrar }
  }

  // Quando caberia: primeiro mês de início em que todas as parcelas cabem na sobra.
  const inicioQueCabe = Number.isFinite(parcelas)
    ? pontos.findIndex((_, inicio) => inicio > 0 && inicio + meses <= pontos.length && pontos.slice(inicio, inicio + meses).every((ponto) => ponto.sobra - parcela >= 0))
    : -1
  const esperar = inicioQueCabe > 0 ? ` Se a primeira parcela for em ${nomeMes(pontos[inicioQueCabe].mes)}, cabe.` : ''
  return { texto: `Melhor não agora: com ${descricaoCompra}, em ${nomeMes(pior.mes)} a sobra ficaria negativa (${moeda(pior.depois)}).${esperar}${alem}`, botao: registrar }
}

// ---- Resumo do mês ----

// Mostrado ao quitar o mês: quanto sobrou, o que mais pesou, comparação com o mês anterior
// e parcelamentos que terminaram.
export function resumirMes(contas, mes, fechamento) {
  const comparacao = compararComMesAnterior(contas, mes)
  const anterior = deslocarMes(mes, -1)
  const receitas = contas.filter((conta) => conta.tipoConta === 'Receita' && mesDoSaldo(conta) === mes).reduce((total, conta) => total + conta.valorFormatado, 0)
  const sobra = fechamento?.mes === mes ? fechamento.saldo : arredondar(receitas - comparacao.atual)
  const linhas = []

  linhas.push(sobra >= 0
    ? `Em ${nomeMes(mes)} sobraram ${moeda(sobra)} do salário.`
    : `Em ${nomeMes(mes)} faltaram ${moeda(-sobra)}: as despesas passaram das receitas.`)

  const diferenca = arredondar(comparacao.atual - comparacao.anterior)
  linhas.push(`Você recebeu ${moeda(receitas)} e teve ${moeda(comparacao.atual)} em despesas`
    + `${comparacao.anterior > 0 ? `, ${moeda(Math.abs(diferenca))} ${diferenca >= 0 ? 'a mais' : 'a menos'} que em ${nomeMes(anterior)}` : ''}.`)

  const maiores = comparacao.tipos.filter((tipo) => tipo.atual > 0).slice(0, 3)
  const maiorGasto = contas
    .filter((conta) => conta.tipoConta === 'Despesa' && conta.selected)
    .map((conta) => ({ conta, valor: valorNoMes(conta, mes) }))
    .filter(({ valor }) => valor > 0)
    .sort((a, b) => b.valor - a.valor)[0]
  if (maiores.length > 0) {
    linhas.push(`O que mais pesou: ${juntarLista(maiores.map((tipo) => `${tipo.rotulo} (${moeda(tipo.atual)})`))}.`
      + `${maiorGasto ? ` O maior gasto foi ${maiorGasto.conta.descricao} (${moeda(maiorGasto.valor)}).` : ''}`)
  }

  const subiu = comparacao.tipos
    .filter((tipo) => tipo.rotulo !== 'Sem tipo' && tipo.anterior > 0 && tipo.atual - tipo.anterior >= Math.max(50, tipo.anterior * 0.2))
    .sort((a, b) => (b.atual - b.anterior) - (a.atual - a.anterior))[0]
  if (subiu) linhas.push(`${subiu.rotulo} subiu ${moeda(subiu.atual - subiu.anterior)} em relação a ${nomeMes(anterior)}.`)

  const terminaram = contas.filter((conta) => conta.tipoConta === 'Despesa' && conta.selected && ehParcelado(conta) && !ehContaFixa(conta)
    && deslocarMes(mesDoSaldo(conta), totalParcelasDe(conta) - 1) === mes)
  if (terminaram.length > 0) {
    linhas.push(`Terminaram as parcelas de ${juntarLista(terminaram.map((conta) => conta.descricao))}: a partir de ${nomeMes(deslocarMes(mes, 1))} sobram mais ${moeda(somar(terminaram, 'valorFormatado'))} por mês.`)
  }

  return linhas
}
