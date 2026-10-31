export const PRIMEIRO_MES = '2026-10'

export function mesAtualISO() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export function hojeISO() {
  const hoje = new Date()
  return `${mesAtualISO()}-${String(hoje.getDate()).padStart(2, '0')}`
}

export function diasEntre(deISO, ateISO) {
  const emUTC = (dataISO) => {
    const [ano, mes, dia] = dataISO.split('-').map(Number)
    return Date.UTC(ano, mes - 1, dia)
  }
  return Math.round((emUTC(ateISO) - emUTC(deISO)) / 86400000)
}

export function deslocarMes(mes, quantidade) {
  const [ano, numeroMes] = mes.split('-').map(Number)
  const data = new Date(ano, numeroMes - 1 + quantidade, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

export function mesesEntre(deMes, ateMes) {
  const [anoDe, mesDe] = deMes.split('-').map(Number)
  const [anoAte, mesAte] = ateMes.split('-').map(Number)
  return (anoAte - anoDe) * 12 + (mesAte - mesDe)
}

// Mantém o dia; se ele não existir no mês de destino, usa o último dia desse mês (31/01 → 28/02).
export function deslocarData(dataISO, quantidade) {
  const [mes, dia] = [deslocarMes(dataISO.slice(0, 7), quantidade), Number(dataISO.slice(8, 10))]
  const [ano, numeroMes] = mes.split('-').map(Number)
  const ultimoDia = new Date(ano, numeroMes, 0).getDate()
  return `${mes}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
}

export function formatarMes(mes) {
  const [ano, numeroMes] = mes.split('-').map(Number)
  const texto = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, numeroMes - 1, 1))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
