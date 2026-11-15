import { describe, expect, it } from 'vitest'
import { gerarAlertasFinanceiros } from './notificacoes'

const salario = (dataCadastro, valorFormatado = 3000) => ({ id: `s${dataCadastro}`, tipoConta: 'Receita', descricao: 'Salário', valorFormatado, dataCadastro, mesSaldo: '' })
const despesa = (dados) => ({
  tipoConta: 'Despesa', selected: true, responsavel: '', anotarPara: '', parcela: '1', parcelaPaga: 0, contaFixa: false,
  categoria: '', cartao: '', mesSaldo: '', dataVencimento: '', ...dados,
})
const fechamento = { mes: '2026-10', saldo: 0 }
const salarios = [salario('2026-08-05'), salario('2026-09-05'), salario('2026-10-05'), salario('2026-11-05')]

describe('gerarAlertasFinanceiros', () => {
  it('sem aperto, não gera aviso', () => {
    const contas = [...salarios, despesa({ id: 'aluguel', descricao: 'Aluguel', valorFormatado: 1500, contaFixa: true, parcela: '', dataCadastro: '2026-01-10' })]
    expect(gerarAlertasFinanceiros(contas, fechamento, '2026-11')).toEqual([])
  })

  it('avisa o saldo negativo do mês', () => {
    const contas = [...salarios, despesa({ id: 'tv', descricao: 'TV', valorFormatado: 3500, dataCadastro: '2026-11-08' })]
    expect(gerarAlertasFinanceiros(contas, fechamento, '2026-11')).toEqual([
      { id: 'saldo-negativo:2026-11', tipo: 'saldo', valor: -500, vencida: true },
    ])
  })

  it('avisa o primeiro mês com sobra negativa na projeção', () => {
    const contas = [...salarios, despesa({ id: 'carro', descricao: 'Carro', valorFormatado: 1000, parcela: '6', dataCadastro: '2026-11-01' }),
      despesa({ id: 'aluguel', descricao: 'Aluguel', valorFormatado: 2200, contaFixa: true, parcela: '', dataCadastro: '2026-01-10' })]
    const alertas = gerarAlertasFinanceiros(contas, fechamento, '2026-11')
    expect(alertas.map((alerta) => alerta.id)).toEqual(['saldo-negativo:2026-11', 'projecao-negativa:2026-12'])
    expect(alertas[1]).toMatchObject({ tipo: 'projecao', mes: '2026-12', valor: -200, parcelas: 3200, renda: 3000 })
  })

  it('sem receita registrada não avisa (o saldo negativo não diria muito)', () => {
    expect(gerarAlertasFinanceiros([despesa({ id: 'x', descricao: 'Mercado', valorFormatado: 100, dataCadastro: '2026-11-03' })], null, '2026-11')).toEqual([])
  })
})
