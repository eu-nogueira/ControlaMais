import { describe, expect, it } from 'vitest'
import { calcularDecimoTerceiro } from './decimoTerceiro'
import { calcularInss } from './ferias'

describe('calcularDecimoTerceiro', () => {
  it('ano inteiro: 1ª parcela sem descontos, 2ª com o INSS do 13º inteiro', () => {
    const calculo = calcularDecimoTerceiro({ salarioBruto: '3.000,00' })
    const inss = calcularInss(3000)
    expect(calculo).toMatchObject({ valido: true, meses: 12, bruto: 3000, primeira: 1500, inss, segunda: 1500 - inss, liquido: 3000 - inss, aReceber: 3000 - inss, podeTerIr: false })
  })

  it('proporcional aos meses trabalhados e com média de adicionais', () => {
    expect(calcularDecimoTerceiro({ salarioBruto: '2400', mesesTrabalhados: '6', mediaAdicionais: '600' }).bruto).toBe(1500)
  })

  it('com a 1ª parcela já recebida, só a 2ª ainda vai entrar', () => {
    const calculo = calcularDecimoTerceiro({ salarioBruto: '3000', primeiraRecebida: true })
    expect(calculo.aReceber).toBe(calculo.segunda)
  })

  it('avisa possível IR acima do limite de isenção e lista o que não foi considerado', () => {
    const calculo = calcularDecimoTerceiro({ salarioBruto: '8000' })
    expect(calculo.podeTerIr).toBe(true)
    expect(calculo.desconsiderados).toEqual(['média de horas extras e adicionais'])
  })

  it('valida os campos', () => {
    expect(calcularDecimoTerceiro({ salarioBruto: '' })).toEqual({ valido: false, erros: ['Informe o salário bruto.'] })
    expect(calcularDecimoTerceiro({ salarioBruto: '3000', mesesTrabalhados: '13' }).valido).toBe(false)
  })
})
