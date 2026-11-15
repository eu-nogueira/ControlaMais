import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

// Transcrição de voz gratuita, feita pelo reconhecimento do próprio aparelho:
// no app Android, o serviço nativo do sistema (plugin); no navegador, a Web Speech API (Chrome e Edge).
// O WebView do app não tem a Web Speech API, por isso os dois caminhos.

const IDIOMA = 'pt-BR'
const ReconhecimentoWeb = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined

const MENSAGEM_PERMISSAO = 'Preciso de permissão para usar o microfone. Libere nas configurações do aparelho para falar comigo.'

export async function vozDisponivel() {
  if (!Capacitor.isNativePlatform()) return Boolean(ReconhecimentoWeb)
  try {
    const { available } = await SpeechRecognition.available()
    return available
  } catch {
    return false
  }
}

async function ouvirNoApp({ onParcial, onFim, onErro }) {
  let permissao = (await SpeechRecognition.checkPermissions()).speechRecognition
  if (permissao !== 'granted') permissao = (await SpeechRecognition.requestPermissions()).speechRecognition
  if (permissao !== 'granted') {
    onErro(MENSAGEM_PERMISSAO)
    return { parar() {} }
  }

  let texto = ''
  let finalizado = false
  const ouvintes = await Promise.all([
    SpeechRecognition.addListener('partialResults', ({ matches }) => {
      if (matches?.[0]) {
        texto = matches[0]
        onParcial(texto)
      }
    }),
    SpeechRecognition.addListener('listeningState', ({ status }) => {
      if (status === 'stopped') finalizar()
    }),
  ])

  function finalizar() {
    if (finalizado) return
    finalizado = true
    ouvintes.forEach((ouvinte) => ouvinte.remove())
    onFim(texto)
  }

  try {
    await SpeechRecognition.start({ language: IDIOMA, partialResults: true, popup: false, maxResults: 1 })
  } catch {
    // Silêncio ou falha do reconhecedor: entrega o que foi ouvido até aqui.
    finalizar()
  }

  return {
    parar() {
      SpeechRecognition.stop().catch(() => {})
      // O último resultado parcial pode chegar logo depois do stop; se o aviso de "parou" não vier, encerra mesmo assim.
      setTimeout(finalizar, 800)
    },
  }
}

function ouvirNoNavegador({ onParcial, onFim, onErro }) {
  const reconhecimento = new ReconhecimentoWeb()
  reconhecimento.lang = IDIOMA
  reconhecimento.interimResults = true
  reconhecimento.continuous = false

  let texto = ''
  let erro = ''
  reconhecimento.onresult = (event) => {
    texto = Array.from(event.results).map((resultado) => resultado[0].transcript).join('')
    onParcial(texto)
  }
  reconhecimento.onerror = (event) => {
    erro = event.error
  }
  reconhecimento.onend = () => {
    if (erro === 'not-allowed' || erro === 'service-not-allowed') onErro(MENSAGEM_PERMISSAO)
    else if (erro && erro !== 'no-speech' && erro !== 'aborted') onErro('Não consegui usar o microfone agora. Tente de novo ou escreva.')
    else onFim(texto)
  }
  reconhecimento.start()

  return { parar: () => reconhecimento.stop() }
}

// Começa a ouvir. `onParcial` recebe o texto enquanto a pessoa fala; `onFim`, o texto final.
// Devolve um controlador com `parar()`.
export function comecarAOuvir(callbacks) {
  return Capacitor.isNativePlatform() ? ouvirNoApp(callbacks) : Promise.resolve(ouvirNoNavegador(callbacks))
}
