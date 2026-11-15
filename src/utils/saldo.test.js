import { describe, expect, it } from 'vitest'
import { calcularPeriodo, calcularSaldoExibido, mesSaldoPeloVencimento, simularFechamento } from './saldo'
import { valorNoMes } from './dashboard'
import { listarDividas } from './simulacao'
import { entraNoMes } from './acertos'
import { paraNovaConta } from './copiloto'

const despesa = (dados) => ({
  tipoConta: 'Despesa', selected: true, responsavel: '', anotarPara: '', parcela: '1', parcelaPaga: 0, contaFixa: false,
  categoria: '', cartao: '', mesSaldo: '', dataCadastro: '2026-11-15', dataVencimento: '', ...dados,
})
const salario = (dataCadastro, valorFormatado = 3000) => ({ tipoConta: 'Receita', descricao: 'Salário', dataCadastro, valorFormatado, mesSaldo: '' })

describe('mesSaldoPeloVencimento', () => {
  it('vencimento a partir de dois meses à frente: mês anterior ao vencimento', () => {
    expect(mesSaldoPeloVencimento('2027-01-05', '2026-11', '2026-11-15')).toBe('2026-12')
    expect(mesSaldoPeloVencimento('2027-02-05', '2026-11', '2026-11-15')).toBe('2027-01')
  })

  it('vencimento até o mês seguinte segue a regra de sempre', () => {
    expect(mesSaldoPeloVencimento('2026-12-05', '2026-11', '2026-11-15')).toBe('')
    expect(mesSaldoPeloVencimento('2026-11-20', '2026-11', '2026-11-15')).toBe('')
    expect(mesSaldoPeloVencimento('', '2026-11', '2026-11-15')).toBe('')
  })

  it('não antecipa para antes do mês do cadastro', () => {
    expect(mesSaldoPeloVencimento('2027-01-05', '2026-11', '2026-12-10')).toBe('')
  })
})

describe('despesa registrada em 15/11 com vencimento em 05/01', () => {
  const fechamentoOutubro = { mes: '2026-10', saldo: 0 }
  const mercado = despesa({ id: 1, descricao: 'Mercado', valorFormatado: 100 })
  const presente = despesa({ id: 2, descricao: 'Presente', valorFormatado: 500, dataVencimento: '2027-01-05', mesSaldo: '2026-12' })
  const contas = [salario('2026-11-05'), mercado, presente]

  it('não sai do saldo atual (novembro)', () => {
    expect(calcularSaldoExibido(contas, fechamentoOutubro, '2026-11').saldo).toBe(2900)
  })

  it('o fechamento de novembro não a leva junto', () => {
    expect(simularFechamento(contas, fechamentoOutubro, ['2026-11']).fechamentos[0].saldo).toBe(2900)
  })

  it('sai do saldo de dezembro quando dezembro chegar', () => {
    const emDezembro = [...contas, salario('2026-12-05')]
    expect(calcularSaldoExibido(emDezembro, { mes: '2026-11', saldo: 2900 }, '2026-12').saldo).toBe(2500)
  })

  it('Dashboard e Acertos contam em dezembro', () => {
    expect(valorNoMes(presente, '2026-11')).toBe(0)
    expect(valorNoMes(presente, '2026-12')).toBe(500)
    expect(entraNoMes({ ...presente, anotarPara: 'Ana' }, '2026-11')).toBe(false)
    expect(entraNoMes({ ...presente, anotarPara: 'Ana' }, '2026-12')).toBe(true)
  })
})

describe('parcelado que começa num mês futuro', () => {
  const tv = despesa({ id: 3, descricao: 'TV', valorFormatado: 120, parcela: '10', dataVencimento: '2027-01-05', mesSaldo: '2026-12' })
  const contas = [salario('2026-11-05'), tv]

  it('a primeira parcela sai do saldo de dezembro, não do de novembro', () => {
    expect(calcularSaldoExibido(contas, { mes: '2026-10', saldo: 0 }, '2026-11').saldo).toBe(3000)
    expect(calcularPeriodo([...contas, salario('2026-12-05')], { mes: '2026-11', saldo: 3000 }).despesas).toBe(120)
  })

  it('o fechamento de novembro não marca parcela paga', () => {
    expect(simularFechamento(contas, { mes: '2026-10', saldo: 0 }, ['2026-11']).alteradas).toEqual([])
  })

  it('na projeção e na simulação, as 10 parcelas são futuras', () => {
    const comum = despesa({ id: 4, descricao: 'Sofá', valorFormatado: 200, parcela: '5' })
    const [doTv, doSofa] = listarDividas([tv, comum], '2026-11')
    expect(doTv.futuras).toBe(10)
    expect(doSofa.futuras).toBe(4)
  })
})

describe('Marcão', () => {
  it('registra com o mesmo mês do saldo', () => {
    const conta = { tipoConta: 'Despesa', selected: true, descricao: 'Presente', valorFormatado: 500, parcela: '1', contaFixa: false,
      dataCadastro: '2026-11-15', dataVencimento: '2027-01-05', responsavel: '', anotarPara: '', ehCartao: false, cartao: '', categoria: '' }
    expect(paraNovaConta(conta, { contas: [], fechamento: { mes: '2026-10' }, mesAtual: '2026-11' }).mesSaldo).toBe('2026-12')
  })
})
