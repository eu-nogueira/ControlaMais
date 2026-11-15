import { CATEGORIAS, capitalizar, comparavel, limparDescricao, pessoasConhecidas } from './copiloto'
import { TIPOS_DESPESA } from './dashboard'

// O que o Marcão aprende no chat. Cada item é guardado pela forma comparável do termo
// (sem acento e minúsculo), com a grafia original para exibir:
// { categorias: { "habib's": { termo: "Habib's", valor: 'Alimentação' } }, pessoas: {...}, cartoes: {...} }
export const APRENDIZADO_VAZIO = { categorias: {}, pessoas: {}, cartoes: {} }

const GRUPOS = {
  categorias: 'tipo de despesa',
  pessoas: 'pessoa',
  cartoes: 'cartão',
}

// Palavras que indicam correção da proposta ("a categoria é lazer"), não um ensinamento.
const RESERVADAS = new Set(['valor', 'o valor', 'vencimento', 'o vencimento', 'categoria', 'a categoria', 'tipo', 'o tipo', 'descricao', 'a descricao',
  'data', 'a data', 'cartao', 'o cartao', 'pagamento', 'o pagamento', 'parcela', 'parcelas', 'isso', 'ele', 'ela', 'eu', 'voce'])

const ENSINAMENTO = /^\s*(?:(?:aprende|aprenda|lembra|lembre|anota|anote|grava|grave|saiba)\s+(?:que\s+)?|sempre\s+que\s+eu\s+(?:falar|disser|escrever)\s+)?(?<termo>.+?)\s+(?:é|são|significa|quer\s+dizer|entra\s+em|vai\s+em|conta\s+como)\s+(?:sempre\s+)?(?<prefixo>(?:o\s+|a\s+)?(?:cart[aã]o\s+|categoria\s+|tipo\s+(?:de\s+despesa\s+)?)?(?:d[aoe]\s+|em\s+|o\s+|a\s+)?)(?<valor>.+?)[\s.!]*$/iu

const garantir = (aprendizado) => ({ ...APRENDIZADO_VAZIO, ...(aprendizado ?? {}) })

function categoriasConhecidas(contas) {
  const usadas = contas.map((conta) => conta.categoria?.trim()).filter(Boolean)
  return [...new Set([...TIPOS_DESPESA, ...CATEGORIAS.map(([nome]) => nome), ...usadas])]
}

// "habib's é alimentação", "roxinho é o Nubank", "mãe é a Maria". Devolve null se não for um ensinamento.
export function interpretarEnsinamento(texto, { contas = [], cartoes = [] }) {
  if (/\d/.test(texto)) return null
  const achado = texto.match(ENSINAMENTO)
  if (!achado) return null

  const termo = limparDescricao(achado.groups.termo.replace(/^\s*(?:o|a)\s+/iu, ''))
  const valor = limparDescricao(achado.groups.valor)
  const prefixo = comparavel(achado.groups.prefixo)
  if (!termo || !valor || RESERVADAS.has(comparavel(termo)) || comparavel(termo) === comparavel(valor)) return null

  const categoria = categoriasConhecidas(contas).find((nome) => comparavel(nome) === comparavel(valor))
  if (categoria || /categoria|tipo/.test(prefixo)) {
    return { grupo: 'categorias', termo, valor: categoria ?? capitalizar(valor) }
  }

  const cartao = cartoes.find((item) => comparavel(item.nome) === comparavel(valor))
  if (cartao || prefixo.includes('cartao')) {
    return { grupo: 'cartoes', termo, valor: cartao?.nome ?? capitalizar(valor) }
  }

  // Pessoa: já usada nos acertos, ou apresentada com artigo ("é a Maria").
  const pessoa = pessoasConhecidas(contas).find((nome) => comparavel(nome) === comparavel(valor))
  if (pessoa || /^(?:o|a)\b/.test(prefixo)) {
    return { grupo: 'pessoas', termo, valor: pessoa ?? valor.split(' ').map(capitalizar).join(' ') }
  }

  return null
}

export function aprender(aprendizado, { grupo, termo, valor }) {
  const atual = garantir(aprendizado)
  return { ...atual, [grupo]: { ...atual[grupo], [comparavel(termo)]: { termo, valor } } }
}

// "esquece roxinho", "esqueça o que você aprendeu sobre habib's". Devolve o termo ou null.
export function pedidoParaEsquecer(texto) {
  const achado = texto.match(/^\s*(?:esque[cç]a|esquece|apaga|apague|desaprende)\s+(?:o\s+que\s+(?:voc[eê]\s+)?(?:aprendeu|sabe)\s+(?:sobre|de)\s+|que\s+)?(?<termo>.+?)[\s.!]*$/iu)
  if (!achado) return null
  const termo = limparDescricao(achado.groups.termo.replace(/\s+(?:é|significa)\s+.*$/iu, ''))
  return termo || null
}

export function esquecer(aprendizado, termo) {
  const atual = garantir(aprendizado)
  const chave = comparavel(termo)
  const grupo = Object.keys(GRUPOS).find((nome) => atual[nome][chave])
  if (!grupo) return { aprendizado: atual, esquecido: null }
  const { [chave]: esquecido, ...resto } = atual[grupo]
  return { aprendizado: { ...atual, [grupo]: resto }, esquecido: { grupo, ...esquecido } }
}

export const pedidoDoQueAprendeu = (texto) => /^\s*(?:o\s+que\s+(?:voc[eê]\s+)?(?:aprendeu|sabe\s+de\s+mim|lembra)|o\s+que\s+(?:eu\s+)?te\s+ensinei|(?:me\s+)?mostr[ae]\s+o\s+que\s+(?:voc[eê]\s+)?aprendeu|seus\s+aprendizados)\s*\??\s*$/iu.test(texto)

// O usuário finalizou no formulário uma despesa proposta pelo Marcão com outro tipo de despesa:
// ele aprende essa descrição → tipo. Devolve o novo aprendizado, ou null se não há o que aprender.
export function aprenderComFormulario(aprendizado, proposta, salva) {
  if (!salva || salva.tipoConta !== 'Despesa') return null
  const categoria = salva.categoria?.trim()
  const termo = salva.descricao?.trim()
  if (!categoria || !termo || comparavel(proposta?.categoria) === comparavel(categoria)) return null
  return aprender(aprendizado, { grupo: 'categorias', termo, valor: categoria })
}

export function falaDoEnsinamento({ grupo, termo, valor }) {
  if (grupo === 'categorias') return `Anotado! A partir de agora, "${termo}" entra como ${valor}.`
  if (grupo === 'cartoes') return `Anotado! Quando você falar "${termo}", vou usar o cartão ${valor}.`
  return `Anotado! Quando você falar "${termo}", vou entender que é ${valor}.`
}

export function descreverAprendizado(aprendizado) {
  const atual = garantir(aprendizado)
  const linhas = Object.entries(GRUPOS)
    .flatMap(([grupo, rotulo]) => Object.values(atual[grupo]).map(({ termo, valor }) => `"${termo}" → ${valor} (${rotulo})`))
  if (linhas.length === 0) {
    return 'Ainda não aprendi nada com você. Você pode me ensinar assim: "habib\'s é alimentação", "roxinho é o Nubank" ou "mãe é a Maria".'
  }
  return `Já aprendi: ${linhas.join('; ')}. Para eu esquecer algo, diga "esquece" e o termo.`
}
