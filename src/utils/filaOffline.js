// Fila de alterações feitas sem internet. Cada operação guarda o necessário para ser enviada depois:
//   { id, tipo: 'adicionar', contaId, linha }   — contaId é um id local ("local-...") até o envio
//   { id, tipo: 'editar', contaId, linha }
//   { id, tipo: 'remover', contaId }
//   { id, tipo: 'parcela', contaId, parcelaPaga, dataVencimento }
// `linha` está no formato da tabela `contas` (o mesmo enviado ao Supabase).

const PREFIXO_LOCAL = 'local-'

function idAleatorio() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export const criarIdLocal = () => `${PREFIXO_LOCAL}${idAleatorio()}`
export const ehIdLocal = (id) => typeof id === 'string' && id.startsWith(PREFIXO_LOCAL)

export const novaOperacao = (dados) => ({ id: idAleatorio(), criadoEm: new Date().toISOString(), ...dados })

// Junta operações quando possível, para enviar menos e nunca mandar ao servidor algo que ele não conhece:
// apagar uma movimentação que ainda nem foi enviada só a tira da fila; editá-la atualiza o que será criado.
export function enfileirar(fila, operacao) {
  const criacao = fila.find((item) => item.tipo === 'adicionar' && item.contaId === operacao.contaId)

  if (criacao && operacao.tipo === 'remover') return fila.filter((item) => item.contaId !== operacao.contaId)
  if (criacao && operacao.tipo === 'editar') {
    return fila.map((item) => (item === criacao ? { ...item, linha: { ...item.linha, ...operacao.linha } } : item))
  }
  return [...fila, operacao]
}

// Depois que a criação é enviada, as operações seguintes passam a usar o id definitivo.
export function trocarIdNaFila(fila, idLocal, idDefinitivo) {
  return fila.map((item) => (item.contaId === idLocal ? { ...item, contaId: idDefinitivo } : item))
}

// Aplica sobre os dados do servidor o que ainda está na fila, para a tela mostrar o estado mais recente.
// `paraConta` converte uma linha da tabela no formato usado pelo app.
export function aplicarFila(contas, fila, paraConta) {
  return fila.reduce((lista, operacao) => {
    if (operacao.tipo === 'adicionar') return [...lista, paraConta({ ...operacao.linha, id: operacao.contaId, parcela_paga: 0 })]
    if (operacao.tipo === 'remover') return lista.filter((conta) => conta.id !== operacao.contaId)
    return lista.map((conta) => {
      if (conta.id !== operacao.contaId) return conta
      if (operacao.tipo === 'editar') return { ...paraConta({ ...operacao.linha, id: conta.id, parcela_paga: conta.parcelaPaga }) }
      return { ...conta, parcelaPaga: operacao.parcelaPaga, dataVencimento: operacao.dataVencimento }
    })
  }, contas)
}

export const contasComEnvioPendente = (fila) => new Set(fila.map((operacao) => operacao.contaId))

export function descreverOperacao(operacao, contas) {
  const descricao = operacao.linha?.descricao ?? contas.find((conta) => conta.id === operacao.contaId)?.descricao ?? 'movimentação'
  const acao = { adicionar: 'registrar', editar: 'editar', remover: 'apagar', parcela: 'atualizar as parcelas de' }[operacao.tipo]
  return `${acao} "${descricao}"`
}
