// Tema da interface. O escuro é o padrão. A escolha fica no perfil do usuário (Supabase),
// para valer em qualquer aparelho, e numa cópia local aplicada antes da primeira
// renderização, para a tela não piscar no tema errado ao abrir o app.
export const TEMAS = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
]

export const TEMA_PADRAO = 'escuro'

const CHAVE = 'controlamais-tema'

const temaValido = (tema) => (TEMAS.some((item) => item.valor === tema) ? tema : TEMA_PADRAO)

export function lerTemaLocal() {
  try {
    return temaValido(window.localStorage.getItem(CHAVE))
  } catch {
    return TEMA_PADRAO
  }
}

export function aplicarTema(tema) {
  const valido = temaValido(tema)
  document.documentElement.dataset.tema = valido
  try {
    window.localStorage.setItem(CHAVE, valido)
  } catch {
    // Navegação privada pode bloquear o armazenamento local.
  }
  return valido
}
