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
