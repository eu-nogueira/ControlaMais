const chave = (usuarioId) => `controlamais-notificacoes-lidas:${usuarioId}`

export function lerNotificacoesLidas(usuarioId) {
  try {
    return JSON.parse(window.localStorage.getItem(chave(usuarioId))) || []
  } catch {
    return []
  }
}

export function gravarNotificacoesLidas(usuarioId, ids) {
  try {
    window.localStorage.setItem(chave(usuarioId), JSON.stringify(ids))
  } catch {
    // Navegação privada pode bloquear o armazenamento local.
  }
}

// Quem pula o tutorial geral recebe no sino o aviso de como baixar o app para Android.
// Ao tocar no aviso, ele é marcado como visto e não volta a aparecer.
const chaveTutorialPulado = (usuarioId) => `controlamais-tutorial-pulado:${usuarioId}`

export function lerTutorialPulado(usuarioId) {
  try {
    return window.localStorage.getItem(chaveTutorialPulado(usuarioId)) === '1'
  } catch {
    return false
  }
}

function gravarAvisoApp(usuarioId, valor) {
  try {
    window.localStorage.setItem(chaveTutorialPulado(usuarioId), valor)
  } catch {
    // Navegação privada pode bloquear o armazenamento local.
  }
}

export function gravarTutorialPulado(usuarioId) {
  gravarAvisoApp(usuarioId, '1')
}

export function gravarAvisoAppVisto(usuarioId) {
  gravarAvisoApp(usuarioId, 'visto')
}
