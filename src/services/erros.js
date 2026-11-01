// Sem internet, o fetch falha com mensagens técnicas que variam por navegador
// ("Failed to fetch" no Chrome/Android, "NetworkError..." no Firefox, "Load failed" no Safari).
const ERROS_CONEXAO = /failed to fetch|networkerror|load failed|network request failed|network error/i

export const MENSAGEM_SEM_CONEXAO = 'Sem conexão com a internet. Verifique sua conexão e tente novamente.'

export const ehErroConexao = (error) => !navigator.onLine || ERROS_CONEXAO.test(error?.message || '')

// Mensagem para exibir ao usuário: falta de internet ganha um texto claro; os demais erros seguem como vieram.
export function mensagemErro(error) {
  if (ehErroConexao(error)) return MENSAGEM_SEM_CONEXAO
  return error?.message || 'Erro inesperado. Tente novamente.'
}
