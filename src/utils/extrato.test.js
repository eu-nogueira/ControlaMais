import { describe, expect, it } from 'vitest'
import { detalheRepeticao, itensDoMes } from './extrato'

const conta = (dados) => ({
  tipoConta: 'Despesa', selected: true, parcela: '1', parcelaPaga: 0, contaFixa: false, mesSaldo: '', valorFormatado: 10, ...dados,
})

describe('itensDoMes', () => {
  const tv = conta({ id: 1, descricao: 'TV', parcela: '10', dataCadastro: '2026-10-30' })
  const aluguel = conta({ id: 2, descricao: 'Aluguel', contaFixa: true, parcela: '', dataCadastro: '2026-09-10' })
  const mercado = conta({ id: 3, descricao: 'Mercado', dataCadastro: '2026-11-15' })
  const salario = conta({ id: 4, tipoConta: 'Receita', descricao: 'Salário', dataCadastro: '2026-11-05' })
  const lanche = conta({ id: 5, descricao: 'Lanche', dataCadastro: '2026-10-20' })

  it('compras do mês ficam nas datas reais; parcelas de meses anteriores vão para o grupo do fim', () => {
    const { doMes, repeticoes } = itensDoMes([aluguel, lanche, tv, salario, mercado], '2026-11')
    expect(doMes.map((item) => [item.conta.descricao, item.data])).toEqual([['Mercado', '2026-11-15'], ['Salário', '2026-11-05']])
    expect(repeticoes.map((item) => [item.conta.descricao, item.numero])).toEqual([['TV', 2], ['Aluguel', 3]])
  })

  it('no mês da compra, o parcelado aparece na data real', () => {
    const { doMes, repeticoes } = itensDoMes([tv], '2026-10')
    expect(doMes.map((item) => item.data)).toEqual(['2026-10-30'])
    expect(repeticoes).toEqual([])
  })

  it('o parcelado some depois da última parcela', () => {
    expect(itensDoMes([tv], '2027-07').repeticoes.map((item) => item.numero)).toEqual([10])
    expect(itensDoMes([tv], '2027-08').repeticoes).toEqual([])
  })

  it('com vencimento distante, a parcela 1 é a do mês em que as parcelas começam', () => {
    const geladeira = conta({ id: 6, descricao: 'Geladeira', parcela: '3', dataCadastro: '2026-11-15', mesSaldo: '2026-12' })
    expect(itensDoMes([geladeira], '2026-11').doMes).toHaveLength(1)
    expect(itensDoMes([geladeira], '2026-12').repeticoes.map((item) => item.numero)).toEqual([1])
    expect(itensDoMes([geladeira], '2027-02').repeticoes.map((item) => item.numero)).toEqual([3])
    expect(itensDoMes([geladeira], '2027-03').repeticoes).toEqual([])
  })

  it('descreve a repetição', () => {
    expect(detalheRepeticao({ conta: tv, numero: 2 })).toBe('Parcela 2 de 10 · comprada em 30/10/2026')
    expect(detalheRepeticao({ conta: aluguel, numero: 3 })).toBe('Conta fixa · desde 10/09/2026')
  })
})
