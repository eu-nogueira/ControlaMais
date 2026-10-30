export const PRIMEIRO_MES = '2026-10'

export function mesAtualISO() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export function deslocarMes(mes, quantidade) {
  const [ano, numeroMes] = mes.split('-').map(Number)
  const data = new Date(ano, numeroMes - 1 + quantidade, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

export function formatarMes(mes) {
  const [ano, numeroMes] = mes.split('-').map(Number)
  const texto = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, numeroMes - 1, 1))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
