// Estimativa de quanto das férias é dinheiro livre. O recibo de férias antecipa o salário dos
// dias de descanso, que vem a menos no pagamento seguinte; o extra real é o 1/3 constitucional
// (menos o INSS a mais que ele gera) e, se houver venda de dias, o abono com o seu 1/3.
// É uma aproximação: não considera Imposto de Renda nem férias divididas entre dois meses.
import { lerValor } from './formatar'

// Tabela progressiva do INSS (vigência 2025). Atualizar a cada reajuste anual.
export const TABELA_INSS = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
]
export const ANO_TABELA_INSS = 2025

// Acima deste valor por mês as férias podem ter Imposto de Renda, que a estimativa não desconta.
export const LIMITE_ISENCAO_IR = 5000

export const DIAS_FERIAS_MINIMO = 5
export const DIAS_FERIAS_MAXIMO = 30
// A venda (abono pecuniário) é limitada a 1/3 dos 30 dias de direito.
export const DIAS_VENDA_MAXIMO = 10

const arredondar = (valor) => Math.round(valor * 100) / 100

export function calcularInss(remuneracao) {
  let anterior = 0
  let total = 0
  for (const faixa of TABELA_INSS) {
    if (remuneracao <= anterior) break
    total += (Math.min(remuneracao, faixa.ate) - anterior) * faixa.aliquota
    anterior = faixa.ate
  }
  return arredondar(total)
}

// Campos como o usuário preencheu (texto). Venda de dias e média de adicionais são opcionais:
// vazios ou zerados não entram no cálculo e são listados em `desconsiderados`.
export function calcularFerias({ salarioBruto, diasFerias, diasVendidos, mediaAdicionais }) {
  const salario = lerValor(salarioBruto || '')
  const dias = Number(diasFerias)
  const vendidos = Number(diasVendidos || 0)
  const media = lerValor(mediaAdicionais || '') || 0

  const erros = []
  if (!(salario > 0)) erros.push('Informe o salário bruto.')
  if (!(Number.isInteger(dias) && dias >= DIAS_FERIAS_MINIMO && dias <= DIAS_FERIAS_MAXIMO)) {
    erros.push(`Informe de ${DIAS_FERIAS_MINIMO} a ${DIAS_FERIAS_MAXIMO} dias de férias.`)
  }
  if (!(Number.isInteger(vendidos) && vendidos >= 0 && vendidos <= DIAS_VENDA_MAXIMO)) {
    erros.push(`É possível vender de 0 a ${DIAS_VENDA_MAXIMO} dias.`)
  } else if (dias + vendidos > DIAS_FERIAS_MAXIMO) {
    erros.push(`Dias de férias e dias vendidos somam no máximo ${DIAS_FERIAS_MAXIMO}.`)
  }
  if (!(media >= 0)) erros.push('A média de horas extras e adicionais não pode ser negativa.')
  if (erros.length > 0) return { valido: false, erros }

  const base = salario + media
  const diaria = base / 30
  const ferias = arredondar(diaria * dias)
  const terco = arredondar(ferias / 3)
  const abono = arredondar(diaria * vendidos)
  const tercoAbono = arredondar(abono / 3)

  // No mês das férias a remuneração é a base mais o 1/3; o abono não tem INSS.
  const inssExtra = arredondar(calcularInss(base + terco) - calcularInss(base))
  const inssRecibo = calcularInss(ferias + terco)
  const reciboLiquido = arredondar(ferias + terco + abono + tercoAbono - inssRecibo)
  const livre = arredondar(terco - inssExtra + abono + tercoAbono)

  const desconsiderados = []
  if (vendidos === 0) desconsiderados.push('venda de dias')
  if (media === 0) desconsiderados.push('média de horas extras e adicionais')

  return {
    valido: true,
    dias,
    vendidos,
    ferias,
    terco,
    abono,
    tercoAbono,
    inssExtra,
    inssRecibo,
    reciboLiquido,
    adiantamento: arredondar(reciboLiquido - livre),
    livre,
    desconsiderados,
    podeTerIr: base + terco > LIMITE_ISENCAO_IR
  }
}
