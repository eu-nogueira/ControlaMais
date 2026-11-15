// Converte números por extenso em algarismos ("trinta e cinco reais" → "35 reais"),
// comum quando a frase vem do reconhecimento de voz.

const VALORES = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
}

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR')

const PALAVRA = `(?:${[...Object.keys(VALORES), 'mil'].sort((a, b) => b.length - a.length).join('|').replace('tres', 'tr[eê]s')})`
const SEQUENCIA = new RegExp(`(?<![\\p{L}\\d])${PALAVRA}(?:\\s+(?:e\\s+)?${PALAVRA})*(?![\\p{L}\\d])`, 'giu')

// Depois do número, indica que ele é valor, quantidade ou dia.
const CONTEXTO_DEPOIS = /^\s*(?:reais|real|conto|contos|pila|mil|centavos?|vezes|x|parcelas?)(?![\p{L}])/iu
const CONTEXTO_ANTES = /(?:dia|valor(?:\s+(?:de|é|e))?|r\$|em|de)\s*$/iu

function calcular(sequencia) {
  let total = 0
  let atual = 0
  sequencia.split(/\s+/).filter((parte) => semAcento(parte) !== 'e').forEach((parte) => {
    const palavra = semAcento(parte)
    if (palavra === 'mil') {
      total += (atual || 1) * 1000
      atual = 0
    } else {
      atual += VALORES[palavra]
    }
  })
  return total + atual
}

export function converterNumerosPorExtenso(texto) {
  // Frases com algarismos só convertem números com contexto claro, para não estragar
  // descrições como "Pizza quatro queijos 50".
  const temAlgarismos = /\d/.test(texto)

  const convertido = texto.replace(SEQUENCIA, (sequencia, posicao) => {
    const depois = texto.slice(posicao + sequencia.length)
    const antes = texto.slice(0, posicao)
    const soArtigo = /^(um|uma)$/i.test(sequencia.trim())
    const temContexto = CONTEXTO_DEPOIS.test(depois) || (!soArtigo && CONTEXTO_ANTES.test(antes))
    if (soArtigo ? !CONTEXTO_DEPOIS.test(depois) : temAlgarismos && !temContexto) return sequencia
    return String(calcular(sequencia))
  })

  // "35 reais e 50 centavos" → "35,50 reais".
  return convertido.replace(/(\d+)(\s*(?:reais|real))?\s+e\s+(\d{1,2})\s+centavos?/giu, (_, reais, moeda, centavos) => `${reais},${centavos.padStart(2, '0')}${moeda ? ' reais' : ''}`)
}
