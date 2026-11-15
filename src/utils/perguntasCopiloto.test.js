import { describe, expect, it } from 'vitest'
import { ehPergunta, responderPergunta } from './perguntasCopiloto'

const conta = (dados) => ({
  tipoConta: 'Despesa', selected: true, responsavel: '', anotarPara: '', parcela: '1', parcelaPaga: 0,
  contaFixa: false, cartao: '', categoria: '', mesSaldo: '', dataVencimento: '', dataCadastro: '2026-11-03', ...dados,
})

const contas = [
  conta({ id: 1, descricao: 'Mercado', valorFormatado: 200, categoria: 'Alimentação', cartao: 'Nubank', dataVencimento: '2026-11-18' }),
  conta({ id: 2, descricao: 'Uber', valorFormatado: 30, categoria: 'Transporte' }),
  conta({ id: 3, descricao: 'TV', valorFormatado: 120, parcela: '10', parcelaPaga: 2, dataCadastro: '2026-10-01', dataVencimento: '2026-11-20' }),
  conta({ id: 4, descricao: 'Lanche', valorFormatado: 40, anotarPara: 'Fulano' }),
  conta({ id: 5, descricao: 'Almoço', valorFormatado: 45, selected: false, responsavel: 'Ana Paula' }),
  conta({ id: 6, tipoConta: 'Receita', descricao: 'Salário', valorFormatado: 3000, parcela: '' }),
  conta({ id: 7, descricao: 'Cinema', valorFormatado: 60, categoria: 'Lazer', dataCadastro: '2026-10-10' }),
  conta({ id: 8, descricao: 'Internet', valorFormatado: 100, categoria: 'Casa', dataVencimento: '2026-11-28' }),
]

const contexto = { contas, cartoes: [{ nome: 'Nubank' }], fechamento: { mes: '2026-10', saldo: 0 }, hoje: '2026-11-14', mesAtual: '2026-11' }
// O formato de moeda usa espaço não separável depois de "R$".
const responder = (texto) => responderPergunta(texto, contexto)?.replace(/\u00a0/g, ' ') ?? null

describe('ehPergunta', () => {
  it('reconhece perguntas e ignora lançamentos', () => {
    expect(ehPergunta('quanto gastei este mês')).toBe(true)
    expect(ehPergunta('meu saldo?')).toBe(true)
    expect(ehPergunta('Uber 20')).toBe(false)
    expect(ehPergunta('devo 50 pro Fulano')).toBe(false)
  })
})

describe('responderPergunta', () => {
  it('não responde o que não é pergunta', () => {
    expect(responder('mercado 50')).toBeNull()
  })

  it('gastos do mês, por tipo, por descrição e por cartão', () => {
    expect(responder('quanto gastei este mês?')).toContain('R$ 490,00')
    expect(responder('quanto gastei com alimentação?')).toBe('Você gastou R$ 200,00 com Alimentação neste mês (1 lançamento).')
    expect(responder('quanto gastei no uber?')).toContain('R$ 30,00')
    expect(responder('quanto gastei no nubank?')).toBe('Você gastou R$ 200,00 no cartão Nubank neste mês (1 lançamento).')
    expect(responder('quanto gastei mês passado?')).toContain('R$ 180,00')
    expect(responder('quanto gastei com lazer em outubro?')).toContain('R$ 60,00')
  })

  it('acertos entre pessoas', () => {
    expect(responder('quanto a Ana me deve?')).toBe('Ana Paula te deve R$ 45,00 neste mês.')
    expect(responder('quem me deve?')).toContain('Ana Paula (R$ 45,00)')
    expect(responder('quanto devo pro Fulano?')).toBe('Você deve R$ 40,00 para Fulano neste mês.')
    expect(responder('quanto devo pra Julia?')).toBe('Você não deve nada para Julia neste mês.')
    expect(responder('quanto devo este mês?')).toBe('Neste mês você deve R$ 40,00: Fulano (R$ 40,00).')
    expect(responder('quanto devo?')).toBe('Neste mês você deve R$ 40,00: Fulano (R$ 40,00).')
  })

  it('"quanto devo de/com/no" pergunta das despesas, não de uma pessoa', () => {
    expect(responder('quanto devo de alimentação?')).toBe('Você tem R$ 200,00 em despesas com Alimentação neste mês (1 lançamento).')
    expect(responder('quanto devo com mercado?')).toBe('Você tem R$ 200,00 em despesas com Mercado neste mês (1 lançamento).')
    expect(responder('quanto devo no nubank?')).toBe('Você tem R$ 200,00 em despesas no cartão Nubank neste mês (1 lançamento).')
    expect(responder('quanto devo de lazer?')).toBe('Não encontrei despesas com Lazer neste mês.')
  })

  it('parcelamentos', () => {
    expect(responder('quanto falta pagar da TV?')).toBe('TV: faltam 8 de 10 parcelas (R$ 960,00).')
    expect(responder('quanto falta pagar?')).toContain('R$ 960,00 em 1 parcelamento')
    expect(responder('quanto falta pagar do carro?')).toBe('Não encontrei parcelamento em aberto com "Carro".')
  })

  it('vencimentos, receitas e saldo', () => {
    expect(responder('o que vence essa semana?')).toBe('Vence nos próximos 7 dias: Mercado (R$ 200,00, 18/11) e TV (R$ 120,00, 20/11). Total de R$ 320,00.')
    expect(responder('o que vence este mês?')).toContain('Internet')
    expect(responder('quanto recebi?')).toBe('Você recebeu R$ 3.000,00 neste mês, em 1 receita.')
    expect(responder('qual meu saldo?')).toMatch(/^Seu saldo agora é/)
  })

  it('pergunta desconhecida explica o que sabe responder', () => {
    expect(responder('qual a previsão do tempo?')).toMatch(/^Ainda não sei responder/)
  })
})
