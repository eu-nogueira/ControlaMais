import { deslocarMes } from './mes'
import { mesSaldoPeloVencimento, mesesParaFechar } from './saldo'
import { converterNumerosPorExtenso } from './numeros'

// Copiloto: interpreta frases como "devo pagar para o João 98 reais do Habib's" por regras
// (expressões regulares e dicionários), sem serviço externo. Cada trecho reconhecido é retirado
// do texto; o que sobra vira a descrição.

// `\b` só entende ASCII; estes limites também funcionam com letras acentuadas.
export const termo = (padrao) => new RegExp(`(?<![\\p{L}\\d])(?:${padrao})(?![\\p{L}\\d])`, 'iu')

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
export const comparavel = (texto) => semAcento(texto || '').toLocaleLowerCase('pt-BR').trim()
export const capitalizar = (texto) => texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)

export const NUMERO = '\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?'
const QUANTIDADE = '\\d{1,3}|uma|duas|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze'
export const NOME = "[\\p{L}'’]+"
export const ARTIGO = '(?:o\\s+|a\\s+)?'
export const PARA = '(?:para|pro|pra|ao|[àa])'

const QUANTIDADES = { uma: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12 }
export const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Palavras que não podem ser nome de pessoa nem sobrar na descrição.
export const PALAVRAS_SOLTAS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com', 'o', 'a', 'os', 'as', 'e',
  'para', 'pra', 'pro', 'por', 'pelo', 'pela', 'um', 'uma', 'ao', 'que', 'eu', 'me', 'mim', 'valor', 'referente', 'ref'
])

export const CATEGORIAS = [
  ['Alimentação', 'habib|habibs|mcdonalds?|mc donalds?|burger|burguer|bk|ifood|mercado|supermercado|atacadao|assai|padaria|restaurante|lanche|lanchonete|pizza|pizzaria|acai|sorvete|cafe|almoco|jantar|janta|comida|feira|hortifruti|acougue|subway|outback|giraffas|spoleto|marmita|delivery|hamburguer|churrasco'],
  ['Transporte', 'uber|99|taxi|gasolina|combustivel|etanol|posto|onibus|metro|estacionamento|pedagio|oficina|ipva|passagem|mecanico|pneu'],
  ['Lazer', 'cinema|netflix|spotify|show|bar|balada|viagem|jogo|steam|playstation|xbox|disney|hbo|prime video|ingresso|festa|parque|hotel'],
  ['Saúde', 'farmacia|drogaria|remedio|medico|consulta|exame|dentista|hospital|academia|plano de saude'],
  ['Casa', 'aluguel|condominio|luz|energia|agua|internet|gas|iptu|moveis|reforma'],
  ['Educação', 'escola|faculdade|curso|livro|mensalidade escolar|material escolar'],
].map(([categoria, palavras]) => [categoria, termo(palavras)])

export function paraNumero(texto) {
  if (texto.includes(',')) return Number(texto.replace(/\./g, '').replace(',', '.'))
  if (/^\d{1,3}(\.\d{3})+$/.test(texto)) return Number(texto.replace(/\./g, ''))
  return Number(texto)
}

const paraQuantidade = (texto) => QUANTIDADES[comparavel(texto)] ?? Number(texto)

function dataISO(ano, mes, dia) {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
}

function somarDias(iso, dias) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias))
  return data.toISOString().slice(0, 10)
}

// Próximo dia 5 depois do mês atual: o vencimento padrão quando a frase não informa um.
export function vencimentoPadrao(hoje) {
  const [ano, mes] = deslocarMes(hoje.slice(0, 7), 1).split('-').map(Number)
  return dataISO(ano, mes, 5)
}

// Retira do texto o primeiro trecho aceito pela expressão e devolve o que foi encontrado.
function extrair(estado, regex, aceitar = () => true) {
  const achado = estado.resto.match(regex)
  if (!achado || !aceitar(achado)) return null
  estado.resto = `${estado.resto.slice(0, achado.index)} ${estado.resto.slice(achado.index + achado[0].length)}`
  return achado
}

const DATA = [
  '(?<d1>\\d{1,2})[/-](?<m1>\\d{1,2})(?:[/-](?<a1>\\d{2,4}))?',
  `(?:dia\\s+)?(?<d2>\\d{1,2})\\s+de\\s+(?<m2>${MESES.join('|').replace('marco', 'mar[cç]o')})(?:\\s+de\\s+(?<a2>\\d{4}))?`,
  'dia\\s+(?<d3>\\d{1,2})(?<proximo>\\s+(?:do\\s+m[eê]s\\s+que\\s+vem|do\\s+pr[oó]ximo\\s+m[eê]s))?',
  '(?<relativo>hoje|amanh[aã]|anteontem|ontem)',
].join('|')

// Data sem ano que já passou vai para o ano seguinte; "dia 10" é o próximo dia 10.
function lerData(grupos, hoje) {
  const [ano, mes, dia] = hoje.split('-').map(Number)

  if (grupos.relativo) {
    const deslocamento = { hoje: 0, amanha: 1, ontem: -1, anteontem: -2 }[comparavel(grupos.relativo)]
    return somarDias(hoje, deslocamento)
  }

  if (grupos.d3) {
    const diaEscolhido = Number(grupos.d3)
    const proximoMes = grupos.proximo || diaEscolhido < dia
    const [anoAlvo, mesAlvo] = (proximoMes ? deslocarMes(hoje.slice(0, 7), 1) : hoje.slice(0, 7)).split('-').map(Number)
    return dataISO(anoAlvo, mesAlvo, diaEscolhido)
  }

  const diaEscolhido = Number(grupos.d1 ?? grupos.d2)
  const mesEscolhido = grupos.m1 ? Number(grupos.m1) : MESES.indexOf(comparavel(grupos.m2)) + 1
  const anoInformado = grupos.a1 ?? grupos.a2
  if (mesEscolhido < 1 || mesEscolhido > 12 || diaEscolhido < 1 || diaEscolhido > 31) return null

  if (anoInformado) return dataISO(Number(anoInformado.length === 2 ? `20${anoInformado}` : anoInformado), mesEscolhido, diaEscolhido)
  const candidata = dataISO(ano, mesEscolhido, diaEscolhido)
  return candidata < `${ano}-${String(mes).padStart(2, '0')}-01` ? dataISO(ano + 1, mesEscolhido, diaEscolhido) : candidata
}

function distancia(a, b) {
  const linha = Array.from({ length: b.length + 1 }, (_, indice) => indice)
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j++) {
      const atual = linha[j]
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1))
      anterior = atual
    }
  }
  return linha[b.length]
}

// Nomes já usados nos acertos. O Acerto entre pessoas agrupa pelo texto exato,
// então "joao" e "joão" precisam virar o "João" já cadastrado.
export function pessoasConhecidas(contas) {
  const nomes = contas.flatMap((conta) => [conta.responsavel, conta.anotarPara]).map((nome) => (nome || '').trim()).filter(Boolean)
  return [...new Set(nomes)]
}

// `apelidos`: ensinados no chat ("mãe é a Maria"), têm prioridade sobre os nomes parecidos.
export function resolverPessoa(nome, conhecidas, apelidos = {}) {
  const procurado = comparavel(nome)
  if (apelidos[procurado]) return apelidos[procurado].valor
  const exata = conhecidas.find((pessoa) => comparavel(pessoa) === procurado)
    ?? conhecidas.find((pessoa) => comparavel(pessoa).split(/\s+/)[0] === procurado)
  if (exata) return exata
  if (procurado.length >= 4) {
    const parecida = conhecidas.find((pessoa) => distancia(comparavel(pessoa).split(/\s+/)[0], procurado) <= 1)
    if (parecida) return parecida
  }
  return capitalizar(nome)
}

// Junta o sobrenome quando "Nome Sobrenome" é uma pessoa já cadastrada.
function extrairPessoa(estado, regex, conhecidas, apelidos) {
  const achado = extrair(estado, regex, (resultado) => !PALAVRAS_SOLTAS.has(comparavel(resultado.groups.nome)))
  if (!achado) return null

  const fim = achado.index + 1
  const seguinte = estado.resto.slice(fim).match(/^\s*(\p{Lu}[\p{L}'’]*)/u)
  if (seguinte) {
    const completo = `${achado.groups.nome} ${seguinte[1]}`
    const conhecida = conhecidas.find((pessoa) => comparavel(pessoa) === comparavel(completo))
    if (conhecida) {
      estado.resto = estado.resto.slice(0, fim) + estado.resto.slice(fim + seguinte[0].length)
      return conhecida
    }
  }
  return resolverPessoa(achado.groups.nome, conhecidas, apelidos)
}

// Categoria ensinada no chat cujo termo aparece no texto (o termo mais longo vence).
export function categoriaAprendida(aprendizado, texto) {
  const procurado = ` ${comparavel(texto).replace(/[^\p{L}\d'’ ]+/gu, ' ').replace(/\s+/g, ' ')} `
  const encontrado = Object.entries(aprendizado?.categorias ?? {})
    .sort(([a], [b]) => b.length - a.length)
    .find(([chave]) => procurado.includes(` ${chave} `))
  return encontrado?.[1].valor ?? ''
}

// Ordem: o que foi ensinado (no chat ou corrigindo no formulário), o histórico do Extrato
// e, por fim, o dicionário de palavras.
const escapar = (texto) => texto.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Cartões que podem aparecer na frase: apelidos ensinados no chat ("roxinho" → Nubank) e os cadastrados.
export function opcoesDeCartao(cartoes, aprendizado) {
  return [
    ...Object.values(aprendizado?.cartoes ?? {}).map(({ termo, valor }) => ({ termo, nome: valor })),
    ...cartoes.map((item) => ({ termo: item.nome, nome: item.nome })),
  ]
}

// Tipo mais usado nas despesas do Extrato com a mesma descrição, sem diferenciar acentos e pontuação
// ("habibs" = "Habib's"). Em caso de empate vale o mais recente (as contas vêm em ordem de cadastro).
export function categoriaDoHistorico(descricao, contas) {
  const chave = (texto) => comparavel(texto).replace(/[^\p{L}\d]+/gu, '')
  const procurada = chave(descricao)
  if (!procurada) return ''

  const votos = new Map()
  contas.forEach((conta, posicao) => {
    const categoria = conta.categoria?.trim()
    if (!categoria || chave(conta.descricao) !== procurada) return
    const voto = votos.get(comparavel(categoria)) ?? { categoria, quantidade: 0, ultimo: -1 }
    voto.quantidade += 1
    voto.ultimo = posicao
    voto.categoria = categoria
    votos.set(comparavel(categoria), voto)
  })

  const [maisUsada] = [...votos.values()].sort((a, b) => b.quantidade - a.quantidade || b.ultimo - a.ultimo)
  return maisUsada?.categoria ?? ''
}

function lerCategoria(descricao, textoOriginal, contas, aprendizado) {
  const aprendida = categoriaAprendida(aprendizado, `${descricao} ${textoOriginal}`)
  if (aprendida) return aprendida

  const doHistorico = categoriaDoHistorico(descricao, contas)
  if (doHistorico) return doHistorico

  const texto = comparavel(`${descricao} ${textoOriginal}`).replace(/['’]/g, '')
  return CATEGORIAS.find(([, regex]) => regex.test(texto))?.[0] ?? ''
}

export function limparDescricao(texto) {
  const palavras = texto
    .replace(/[,;:.!?]+(?=\s|$)/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  while (palavras.length && PALAVRAS_SOLTAS.has(comparavel(palavras[0]))) palavras.shift()
  while (palavras.length && PALAVRAS_SOLTAS.has(comparavel(palavras[palavras.length - 1]))) palavras.pop()

  return capitalizar(palavras.join(' '))
}

export function interpretarTexto(textoDigitado, { contas = [], cartoes = [], hoje, aprendizado }) {
  const texto = converterNumerosPorExtenso(textoDigitado)
  const estado = { resto: ` ${texto.trim()} ` }
  const conhecidas = pessoasConhecidas(contas)
  const apelidos = aprendizado?.pessoas ?? {}
  const observacoes = []
  // O que a frase informou de fato (e não veio de padrão): usado para aplicar correções.
  const detectados = {}
  detectados.tipo = termo('receita|entrada|recebi|ganhei|sal[aá]rio|rendimento|reembolso|despesa|gasto|gastei|comprei|paguei|devo|deve').test(texto)

  // Tipo da movimentação: a palavra explícita vale mais que o verbo.
  const ehReceita = termo('receita|entrada').test(texto)
    || (!termo('despesa|gasto|gastei|comprei|paguei|devo|deve|cobrar|receber').test(texto) && termo('recebi|ganhei|sal[aá]rio|rendimento|reembolso').test(texto))
  const tipoConta = ehReceita ? 'Receita' : 'Despesa'
  const despesa = !ehReceita

  const contaFixa = despesa && Boolean(extrair(estado, termo('conta\\s+fixa|todo\\s+m[eê]s|todos\\s+os\\s+meses|mensal(?:mente)?')))
  detectados.contaFixa = contaFixa

  // Parcelas: "3x de 50" informa o valor da parcela; "150 em 3x", o total.
  let parcelas = null
  let valorParcela = null
  if (extrair(estado, termo('[àa]\\s+vista'))) parcelas = 1
  const parcelasComValor = extrair(estado, termo(`(?:em\\s+)?(${QUANTIDADE})\\s*(?:x|vezes|parcelas?)\\s+de\\s+(?:r\\$\\s*)?(${NUMERO})(?:\\s*(?:reais|real))?`))
  if (parcelasComValor) {
    parcelas = paraQuantidade(parcelasComValor[1])
    valorParcela = paraNumero(parcelasComValor[2])
  } else {
    const soParcelas = extrair(estado, termo(`(?:parcelad[oa]\\s+)?(?:em\\s+)?(${QUANTIDADE})\\s*(?:x|vezes|parcelas?)`))
    if (soParcelas) parcelas = paraQuantidade(soParcelas[1])
  }
  detectados.parcelas = parcelas !== null
  detectados.valorEhParcela = valorParcela !== null

  // Datas: com "vence"/"vencimento" é sempre vencimento; "ontem" e "hoje" soltos são a data da movimentação.
  let dataVencimento = ''
  let dataCadastro = hoje
  const comPrefixo = extrair(estado, termo(`(?:com\\s+)?(?:vencimento|vence(?:ndo)?|pagar\\s+at[eé]|at[eé])\\s+(?:(?:em|no|na|dia|para|pra|pro|o)\\s+)*(?:${DATA})`))
  if (comPrefixo) dataVencimento = lerData(comPrefixo.groups, hoje) ?? ''
  const relativa = extrair(estado, termo('hoje|anteontem|ontem'))
  if (relativa) dataCadastro = lerData({ relativo: relativa[0] }, hoje)
  const solta = extrair(estado, termo(`(?:(?:em|no|na|para|o)\\s+)*(?:${DATA})`))
  if (solta) {
    const data = lerData(solta.groups, hoje)
    if (data && despesa && !dataVencimento) dataVencimento = data
    else if (data && !despesa) dataCadastro = data
  }
  detectados.vencimento = Boolean(dataVencimento)
  detectados.dataCadastro = dataCadastro !== hoje

  // Cartão: de outra pessoa ("no cartão da Ana"), cadastrado ("no Nubank") ou só "no cartão".
  let ehCartao = false
  let cartao = ''
  let anotarPara = ''
  let cartaoAdivinhado = false
  if (despesa) {
    const cartaoTerceiro = termo(`(?:n[oa]|pelo|com\\s+o)\\s+cart[aã]o\\s+d[oae]\\s+(?<nome>${NOME})`)
    const pessoaCartao = extrairPessoa(estado, cartaoTerceiro, conhecidas, apelidos)
    if (pessoaCartao) {
      ehCartao = true
      anotarPara = pessoaCartao
    }

    const cadastrado = !ehCartao && opcoesDeCartao(cartoes, aprendizado)
      .find((item) => extrair(estado, termo(`(?:(?:n[oa]|pelo)\\s+)?(?:cart[aã]o\\s+)?(?:${escapar(item.termo)}|${escapar(semAcento(item.termo))})`)))
    if (cadastrado) {
      ehCartao = true
      cartao = cadastrado.nome
    } else if (!ehCartao) {
      const generico = extrair(estado, termo(`(?:(?:n[oa]|pelo)\\s+)?cart[aã]o(?:\\s+de\\s+cr[eé]dito)?(?:\\s+(?<nome>\\p{Lu}[\\p{L}]*))?|(?:n[oa]\\s+)?cr[eé]dito`))
      if (generico) {
        ehCartao = true
        cartao = generico.groups?.nome ?? ''
        if (!cartao && cartoes.length === 1) {
          cartao = cartoes[0].nome
          cartaoAdivinhado = true
        }
      }
    }
    detectados.pix = Boolean(extrair(estado, termo('(?:n[oa]\\s+|pelo\\s+|via\\s+)?(?:pix|d[eé]bito|dinheiro)')))
  }
  detectados.cartao = ehCartao

  // Valor: prefere o número com "R$", "reais" ou "valor de"; senão, o primeiro número que sobrou.
  let valor = valorParcela
  if (valor === null) {
    const achado = extrair(estado, termo(`(?:o\\s+|no\\s+)?valor\\s+(?:(?:de|é|e|para|pra|foi)\\s+)?(?:r\\$\\s*)?(${NUMERO})(\\s*mil)?(?:\\s*(?:reais|real))?`))
      ?? extrair(estado, new RegExp(`r\\$\\s*(${NUMERO})(\\s*mil)?(?:\\s*(?:reais|real))?`, 'iu'))
      ?? extrair(estado, termo(`(${NUMERO})(\\s*mil)?\\s*(?:reais|real|conto|contos|pila|r\\$)`))
      ?? extrair(estado, termo(`(${NUMERO})(\\s*mil)?`))
    if (achado) {
      const total = paraNumero(achado[1]) * (achado[2] ? 1000 : 1)
      if (parcelas > 1 && !contaFixa) {
        valor = Math.round((total / parcelas) * 100) / 100
        observacoes.push(`Total de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} dividido em ${parcelas} parcelas.`)
      } else {
        valor = total
      }
    }
  }

  detectados.valor = valor !== null

  // Acerto entre pessoas.
  let selected = despesa
  let responsavel = ''
  if (despesa) {
    const primeiraPessoa = (padroes) => padroes.reduce((achada, padrao) => achada ?? extrairPessoa(estado, termo(padrao), conhecidas, apelidos), null)

    const devoA = primeiraPessoa([
      `(?:devo|deverei|tenho\\s+que|preciso)\\s+(?:pagar\\s+|dar\\s+|devolver\\s+|transferir\\s+|passar\\s+)?${PARA}\\s+${ARTIGO}(?<nome>${NOME})`,
      `(?:pagar|devolver|transferir)\\s+${PARA}\\s+${ARTIGO}(?<nome>${NOME})`,
    ])
    if (devoA) {
      anotarPara = devoA
    } else {
      const devedor = primeiraPessoa([
        `${ARTIGO}(?<nome>${NOME})\\s+(?:me\\s+deve|vai\\s+me\\s+(?:pagar|reembolsar|devolver)|me\\s+paga|vai\\s+pagar|paga\\s+depois)`,
        `(?:cobrar|receber|reembolso)\\s+(?:d[oa]\\s+|o\\s+|a\\s+)?(?<nome>${NOME})`,
        `emprestei\\s+${PARA}\\s+${ARTIGO}(?<nome>${NOME})`,
      ])
      if (devedor) {
        selected = false
        responsavel = devedor
        anotarPara = ''
      }
    }
  }
  detectados.pessoa = Boolean(anotarPara || responsavel)

  // Sobra do texto: comandos e palavras de ligação saem; o resto é a descrição.
  extrair(estado, termo('registr(?:e|ar|a)|lan[cç](?:e|ar|a)|adicion(?:e|ar|a)|anot(?:e|ar|a)|cadastr(?:e|ar|a)|cri(?:e|ar)|coloqu?(?:e|ar|a)|inclu(?:a|ir|i)'))
  for (const filler of ['uma\\s+(?:nova\\s+)?(?:despesa|receita)', 'despesa|receita|entrada', 'que\\s+(?:eu\\s+)?devo\\s+pagar', 'devo', 'gastei|comprei|paguei|recebi|ganhei|reais|real']) {
    while (extrair(estado, termo(filler)));
  }
  const descricao = limparDescricao(estado.resto) || (termo('emprest(?:ei|imo|ar)').test(texto) ? 'Empréstimo' : '')

  const categoria = despesa ? lerCategoria(descricao, texto, contas, aprendizado) : ''

  const conta = {
    tipoConta,
    valorFormatado: valor ?? 0,
    descricao,
    parcela: despesa && !contaFixa ? String(parcelas ?? 1) : '',
    contaFixa,
    dataVencimento: despesa ? dataVencimento || vencimentoPadrao(hoje) : '',
    dataCadastro,
    selected,
    responsavel,
    anotarPara: selected ? anotarPara : '',
    ehCartao,
    cartao,
    categoria,
  }

  // Campos preenchidos por padrão: viram notificação para revisar depois.
  const assumidos = []
  if (despesa && !dataVencimento) assumidos.push('vencimento')
  if (despesa && !categoria) assumidos.push('tipo de despesa')
  if (cartaoAdivinhado) assumidos.push('cartão')

  return { conta, assumidos, faltando: camposFaltando(conta), observacoes, detectados }
}

// Sem estes, nem o formulário deixa salvar: precisam ser preenchidos antes.
function camposFaltando(conta) {
  const despesa = conta.tipoConta === 'Despesa'
  return [
    !(conta.valorFormatado > 0) && 'valor',
    !conta.descricao && 'descrição',
    despesa && !conta.selected && !conta.responsavel && 'quem vai te pagar',
    despesa && conta.ehCartao && !conta.cartao && 'cartão usado',
  ].filter(Boolean)
}

export function perguntaPara(campo, conta) {
  const parcelado = Number(conta.parcela) > 1 && !conta.contaFixa
  return {
    valor: parcelado ? `Qual foi o valor total? Vou dividir em ${conta.parcela} parcelas.` : 'Qual foi o valor?',
    'descrição': conta.tipoConta === 'Receita' ? 'De onde veio esse dinheiro? (ex.: salário, freela)' : 'Com o que foi esse gasto? (ex.: mercado, Uber)',
    'quem vai te pagar': 'Quem vai te pagar?',
    'cartão usado': 'Qual cartão foi usado?',
  }[campo]
}

const nomeProprio = (texto) => limparDescricao(texto).split(' ').filter(Boolean).map(capitalizar).join(' ')

// Preenche, com a resposta do usuário, o campo que o Marcão perguntou.
// Devolve null quando a resposta não serve para o campo (ex.: valor sem número).
export function completarCampo(interpretacao, campo, resposta, { contas = [], cartoes = [], aprendizado }) {
  const conta = { ...interpretacao.conta }
  let assumidos = [...interpretacao.assumidos]
  const observacoes = [...interpretacao.observacoes]

  if (campo === 'valor') {
    const achado = converterNumerosPorExtenso(resposta).match(new RegExp(`(${NUMERO})(\\s*mil)?`, 'iu'))
    if (!achado) return null
    const total = paraNumero(achado[1]) * (achado[2] ? 1000 : 1)
    if (!(total > 0)) return null
    const parcelas = Number(conta.parcela) || 1
    if (parcelas > 1 && !conta.contaFixa) {
      conta.valorFormatado = Math.round((total / parcelas) * 100) / 100
      observacoes.push(`Total de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} dividido em ${parcelas} parcelas.`)
    } else {
      conta.valorFormatado = total
    }
  } else if (campo === 'descrição') {
    conta.descricao = limparDescricao(resposta)
    if (!conta.descricao) return null
    if (conta.tipoConta === 'Despesa' && !conta.categoria) {
      conta.categoria = lerCategoria(conta.descricao, resposta, contas, aprendizado)
      if (conta.categoria) assumidos = assumidos.filter((item) => item !== 'tipo de despesa')
    }
  } else if (campo === 'quem vai te pagar') {
    const nome = nomeProprio(resposta)
    if (!nome) return null
    conta.responsavel = resolverPessoa(nome, pessoasConhecidas(contas), aprendizado?.pessoas)
  } else if (campo === 'cartão usado') {
    const cadastrado = opcoesDeCartao(cartoes, aprendizado).find((item) => ` ${comparavel(resposta)} `.includes(` ${comparavel(item.termo)} `))
    conta.cartao = cadastrado?.nome ?? nomeProprio(resposta.replace(termo('(?:n[oa]\\s+)?cart[aã]o'), ''))
    if (!conta.cartao) return null
  }

  return { conta, assumidos, faltando: camposFaltando(conta), observacoes, detectados: interpretacao.detectados }
}

const emReais = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const arredondar = (valor) => Math.round(valor * 100) / 100

// Mensagens que corrigem a proposta aberta: "muda o vencimento pra dia 10", "na verdade foram 3x",
// "o valor é 120", "foi no Nubank", "categoria lazer", "descrição pizza".
export const ehCorrecao = (texto) => (
  /^\s*(?:muda|mude|mudar|altera|altere|alterar|troca|troque|trocar|corrige|corrija|corrigir|na\s+verdade|foi|foram|era|eram|é|o\s+valor|a\s+data|o\s+vencimento|vencimento|valor|categoria|tipo|descri[cç][aã]o|n[oa]\s+cart[aã]o|n[oa]\s+pix|pelo\s+pix)(?![\p{L}])/iu.test(texto)
  // "no Nubank": nome com inicial maiúscula logo depois de "no"/"na".
  || /^\s*n[oa]\s+\p{Lu}/u.test(texto)
)

function nomeDaCategoria(texto) {
  const procurado = comparavel(limparDescricao(texto))
  const conhecida = CATEGORIAS.map(([nome]) => nome).find((nome) => comparavel(nome) === procurado)
  return conhecida ?? capitalizar(limparDescricao(texto))
}

const sem = (lista, item) => lista.filter((atual) => atual !== item)

// Aplica a correção na proposta. Devolve null quando não reconhece nada para mudar.
export function corrigirProposta(interpretacao, texto, contexto) {
  let conta = { ...interpretacao.conta }
  let assumidos = [...interpretacao.assumidos]
  let observacoes = [...interpretacao.observacoes]
  const limpo = texto.replace(/^\s*(?:(?:muda|mude|mudar|altera|altere|alterar|troca|troque|trocar|corrige|corrija|corrigir|na\s+verdade)\s+)*(?:(?:o|a)\s+)?/iu, '').trim()

  const descricao = limpo.match(/^descri[cç][aã]o\s+(?:(?:para|pra|é|e|:)\s+)?(.+)$/iu)
  if (descricao) {
    conta.descricao = limparDescricao(descricao[1])
    return conta.descricao ? { ...interpretacao, conta, faltando: camposFaltando(conta) } : null
  }

  const categoria = limpo.match(/^(?:categoria|tipo(?:\s+de\s+despesa)?)\s+(?:(?:para|pra|é|e|:)\s+)?(.+)$/iu)
    ?? limpo.match(/^(?:foi|é|era)\s+(.+)$/iu)
  if (categoria && conta.tipoConta === 'Despesa') {
    const nome = nomeDaCategoria(categoria[1])
    const ehCategoriaConhecida = CATEGORIAS.some(([conhecida]) => conhecida === nome)
    // "foi lazer" só vale para categorias conhecidas; "categoria X" aceita qualquer nome.
    if (ehCategoriaConhecida || !/^(?:foi|é|era)\s/iu.test(limpo)) {
      return { ...interpretacao, conta: { ...conta, categoria: nome }, assumidos: sem(assumidos, 'tipo de despesa') }
    }
  }

  // "é pro Fulano": numa correção, quer dizer que você vai pagar essa despesa para ele.
  const paraPessoa = limpo.match(new RegExp(`^(?:(?:foi|é|era)\\s+)?(?:pra|pro|para)\\s+${ARTIGO}(${NOME})\\s*$`, 'iu'))
  if (paraPessoa && conta.tipoConta === 'Despesa' && !PALAVRAS_SOLTAS.has(comparavel(paraPessoa[1]))) {
    const pessoa = resolverPessoa(paraPessoa[1], pessoasConhecidas(contexto.contas ?? []), contexto.aprendizado?.pessoas)
    const corrigida = { ...conta, selected: true, anotarPara: pessoa, responsavel: '' }
    return { ...interpretacao, conta: corrigida, faltando: camposFaltando(corrigida) }
  }

  const parcial = interpretarTexto(limpo, contexto)
  const { detectados } = parcial
  const novo = parcial.conta
  let mudou = false

  if (detectados.tipo && novo.tipoConta !== conta.tipoConta) {
    mudou = true
    if (novo.tipoConta === 'Receita') {
      conta = { ...conta, tipoConta: 'Receita', parcela: '', contaFixa: false, dataVencimento: '', selected: false, responsavel: '', anotarPara: '', ehCartao: false, cartao: '', categoria: '' }
      assumidos = []
    } else {
      conta = { ...conta, tipoConta: 'Despesa', parcela: '1', dataVencimento: vencimentoPadrao(contexto.hoje), selected: true, categoria: lerCategoria(conta.descricao, conta.descricao, contexto.contas ?? [], contexto.aprendizado) }
      assumidos = ['vencimento', ...(conta.categoria ? [] : ['tipo de despesa'])]
    }
  }

  const despesa = conta.tipoConta === 'Despesa'
  const parcelasAntes = Number(conta.parcela) || 1
  const parcelasDepois = despesa && detectados.parcelas ? Number(novo.parcela) || 1 : parcelasAntes

  if (detectados.valor) {
    mudou = true
    if (!detectados.parcelas && parcelasAntes > 1 && !conta.contaFixa) {
      conta.valorFormatado = arredondar(novo.valorFormatado / parcelasAntes)
      observacoes = [`Total de ${emReais(novo.valorFormatado)} dividido em ${parcelasAntes} parcelas.`]
    } else {
      conta.valorFormatado = novo.valorFormatado
      observacoes = parcial.observacoes
    }
  } else if (despesa && detectados.parcelas && !conta.contaFixa && parcelasDepois !== parcelasAntes) {
    // Mudou só o número de parcelas: mantém o total e recalcula a parcela.
    const total = conta.valorFormatado * parcelasAntes
    conta.valorFormatado = arredondar(total / parcelasDepois)
    observacoes = parcelasDepois > 1 ? [`Total de ${emReais(total)} dividido em ${parcelasDepois} parcelas.`] : []
  }
  if (despesa && detectados.parcelas) {
    mudou = true
    conta.parcela = String(parcelasDepois)
    conta.contaFixa = false
  }
  if (despesa && detectados.contaFixa) {
    mudou = true
    conta.contaFixa = true
    conta.parcela = ''
  }
  if (despesa && detectados.vencimento) {
    mudou = true
    conta.dataVencimento = novo.dataVencimento
    assumidos = sem(assumidos, 'vencimento')
  }
  if (detectados.dataCadastro) {
    mudou = true
    conta.dataCadastro = novo.dataCadastro
  }
  if (despesa && detectados.cartao) {
    mudou = true
    conta.ehCartao = true
    conta.cartao = novo.cartao
    if (novo.anotarPara) conta.anotarPara = novo.anotarPara
    assumidos = parcial.assumidos.includes('cartão') ? [...sem(assumidos, 'cartão'), 'cartão'] : sem(assumidos, 'cartão')
  } else if (despesa && detectados.pix) {
    mudou = true
    conta.ehCartao = false
    conta.cartao = ''
    assumidos = sem(assumidos, 'cartão')
  }
  if (despesa && detectados.pessoa && !(detectados.cartao && novo.anotarPara)) {
    mudou = true
    conta.selected = novo.selected
    conta.anotarPara = novo.anotarPara
    conta.responsavel = novo.responsavel
  }

  if (!mudou) return null
  return { conta, assumidos, faltando: camposFaltando(conta), observacoes, detectados: interpretacao.detectados }
}

// Vários lançamentos na mesma mensagem: "Uber 20 e mercado 150", "uber 20, farmácia 35".
// Só separa quando cada parte é um lançamento completo; senão trata a frase inteira como um só
// (assim "pão e leite 15" continua sendo um lançamento). Partes que começam com número
// continuam o anterior: "Recebi 500 de salário e 200 de freela" são duas receitas.
export function interpretarMensagem(texto, contexto) {
  const partes = converterNumerosPorExtenso(texto).split(/\s*(?:;|\n|,\s+|\s+e\s+(?:tamb[eé]m\s+)?)\s*/iu).filter(Boolean)
  const inteira = () => [interpretarTexto(texto, contexto)]
  if (partes.length < 2) return inteira()

  const resultados = []
  for (const parte of partes) {
    let resultado = interpretarTexto(parte, contexto)
    const anterior = resultados[resultados.length - 1]
    if (anterior && /^\s*(?:r\$\s*)?\d/iu.test(parte)) {
      if (!resultado.detectados.tipo && anterior.conta.tipoConta === 'Receita') resultado = interpretarTexto(`receita ${parte}`, contexto)
      const pessoaAnterior = anterior.conta.anotarPara || anterior.conta.responsavel
      if (resultado.conta.tipoConta === 'Despesa' && !resultado.detectados.pessoa && pessoaAnterior) {
        const conta = { ...resultado.conta, selected: anterior.conta.selected, anotarPara: anterior.conta.anotarPara, responsavel: anterior.conta.responsavel }
        resultado = { ...resultado, conta, faltando: camposFaltando(conta) }
      }
    }
    resultados.push(resultado)
  }

  const todasCompletas = resultados.every((resultado) => resultado.detectados.valor && resultado.conta.descricao && resultado.faltando.length === 0)
  return todasCompletas ? resultados : inteira()
}

// Mesma regra do formulário quando o mês passado ainda não foi quitado:
// despesa do mês atual sai do saldo atual se vencer até este mês; senão, do próximo salário.
export function paraNovaConta(conta, { contas, fechamento, mesAtual }) {
  const despesa = conta.tipoConta === 'Despesa'
  const mesesAbertos = mesesParaFechar(contas, fechamento, mesAtual)
  const mesPassado = mesesAbertos[mesesAbertos.length - 1]
  // Vencimento a partir de dois meses à frente: sai do saldo do mês anterior ao vencimento.
  const mesFuturo = despesa ? mesSaldoPeloVencimento(conta.dataVencimento, mesAtual, conta.dataCadastro) : ''
  const decidirPeloVencimento = despesa && conta.selected && !mesFuturo && Boolean(mesPassado) && conta.dataCadastro.slice(0, 7) === mesAtual
  const mesSaldo = mesFuturo || (decidirPeloVencimento ? (conta.dataVencimento.slice(0, 7) <= mesAtual ? mesPassado : mesAtual) : '')

  return {
    descricao: conta.descricao,
    dataCadastro: conta.dataCadastro,
    valorFormatado: conta.valorFormatado,
    tipoConta: conta.tipoConta,
    responsavel: despesa ? conta.responsavel : '',
    parcela: despesa && !conta.contaFixa ? conta.parcela : '',
    contaFixa: despesa && conta.contaFixa,
    dataVencimento: despesa ? conta.dataVencimento : '',
    selected: despesa && conta.selected,
    anotarPara: despesa && conta.selected ? conta.anotarPara : '',
    cartao: despesa && conta.ehCartao ? conta.cartao : '',
    categoria: despesa ? conta.categoria : '',
    mesSaldo
  }
}
