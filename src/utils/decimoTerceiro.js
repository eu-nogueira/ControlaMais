// Estimativa do 13º salário líquido. Ele é pago em duas parcelas: a 1ª (até 30/11) é metade do valor
// bruto, sem descontos; a 2ª (até 20/12) é a outra metade menos o INSS calculado sobre o 13º inteiro.
// É uma aproximação: não considera Imposto de Renda (só avisa quando pode haver) nem pensão ou outros descontos.
import { lerValor } from './formatar'
import { LIMITE_ISENCAO_IR, calcularInss } from './ferias'

const arredondar = (valor) => Math.round(valor * 100) / 100

// Campos como o usuário preencheu (texto). Meses trabalhados no ano: 12 se vazio. A média de horas
// extras e adicionais é opcional; vazia ou zerada fica em `desconsiderados`.
export function calcularDecimoTerceiro({ salarioBruto, mesesTrabalhados, mediaAdicionais, primeiraRecebida }) {
  const salario = lerValor(salarioBruto || '')
  const meses = mesesTrabalhados === undefined || mesesTrabalhados === '' ? 12 : Number(mesesTrabalhados)
  const media = lerValor(mediaAdicionais || '') || 0

  const erros = []
  if (!(salario > 0)) erros.push('Informe o salário bruto.')
  if (!(Number.isInteger(meses) && meses >= 1 && meses <= 12)) erros.push('Informe de 1 a 12 meses trabalhados no ano.')
  if (!(media >= 0)) erros.push('A média de horas extras e adicionais não pode ser negativa.')
  if (erros.length > 0) return { valido: false, erros }

  const bruto = arredondar(((salario + media) * meses) / 12)
  const primeira = arredondar(bruto / 2)
  const inss = calcularInss(bruto)
  const segunda = arredondar(bruto - primeira - inss)
  const liquido = arredondar(bruto - inss)

  return {
    valido: true,
    salario,
    meses,
    bruto,
    primeira,
    segunda,
    inss,
    liquido,
    primeiraRecebida: Boolean(primeiraRecebida),
    // O que ainda vai entrar: tudo, ou só a 2ª parcela se a 1ª já foi paga.
    aReceber: primeiraRecebida ? segunda : liquido,
    desconsiderados: media === 0 ? ['média de horas extras e adicionais'] : [],
    podeTerIr: bruto > LIMITE_ISENCAO_IR,
  }
}
