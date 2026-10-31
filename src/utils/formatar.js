export function formatarMoeda(valor, ocultar = false) {
  if (ocultar) return 'R$ ••••••'

  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Aceita "1.500,00", "1500,00" e "1500.00".
export function lerValor(texto) {
  const valor = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto
  return Number(valor)
}

export function formatarDataISO(dataISO) {
  if (!dataISO) return ''
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

export function iniciais(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}
