import { describe, expect, it } from 'vitest'
import { completarCampo, corrigirProposta, ehCorrecao, interpretarMensagem, interpretarTexto, paraNovaConta } from './copiloto'
import { converterNumerosPorExtenso } from './numeros'

const contexto = {
  hoje: '2026-11-14',
  contas: [
    { id: 1, tipoConta: 'Despesa', responsavel: '', anotarPara: 'Fulano', descricao: 'Lanche', categoria: 'Alimentação', selected: true },
    { id: 2, tipoConta: 'Despesa', responsavel: 'Ana Paula', anotarPara: '', descricao: 'Mercado', categoria: 'Alimentação', selected: false },
    { id: 3, tipoConta: 'Despesa', responsavel: '', anotarPara: '', descricao: 'Academia', categoria: 'Saúde', selected: true },
  ],
  cartoes: [{ nome: 'Nubank' }, { nome: 'Itaú' }],
}

const interpretar = (texto) => interpretarTexto(texto, contexto)

describe('interpretarTexto', () => {
  it('despesa que devo pagar para alguém, com vencimento padrão no próximo dia 5', () => {
    const { conta, assumidos, faltando } = interpretar("Registre uma despesa que devo pagar para o Fulano no valor de 98 reais do habib's")
    expect(conta).toMatchObject({ tipoConta: 'Despesa', valorFormatado: 98, descricao: "Habib's", selected: true, anotarPara: 'Fulano', categoria: 'Alimentação', dataVencimento: '2026-12-05', parcela: '1' })
    expect(assumidos).toEqual(['vencimento'])
    expect(faltando).toEqual([])
  })

  it('valor antes da pessoa', () => {
    expect(interpretar('devo 50 pro fulano da pizza').conta).toMatchObject({ valorFormatado: 50, descricao: 'Pizza', anotarPara: 'Fulano' })
  })

  it('alguém me deve: usa o nome já cadastrado', () => {
    expect(interpretar('Ana me deve 45 do almoço').conta).toMatchObject({ selected: false, responsavel: 'Ana Paula', valorFormatado: 45, descricao: 'Almoço' })
  })

  it('empréstimo vira "a receber"', () => {
    expect(interpretar('emprestei 200 pra Julia').conta).toMatchObject({ selected: false, responsavel: 'Julia', descricao: 'Empréstimo', valorFormatado: 200 })
  })

  it('parcelado com total divide o valor', () => {
    const { conta, observacoes } = interpretar('Comprei uma TV de 1.200 em 10x no cartão Nubank')
    expect(conta).toMatchObject({ valorFormatado: 120, parcela: '10', ehCartao: true, cartao: 'Nubank', descricao: 'TV' })
    expect(observacoes[0]).toContain('dividido em 10 parcelas')
  })

  it('"3x de 400" é o valor da parcela', () => {
    expect(interpretar('geladeira 3x de 400').conta).toMatchObject({ valorFormatado: 400, parcela: '3' })
  })

  it('conta fixa com vencimento', () => {
    expect(interpretar('Aluguel 1.500 conta fixa dia 10').conta).toMatchObject({ contaFixa: true, parcela: '', valorFormatado: 1500, dataVencimento: '2026-12-10', categoria: 'Casa' })
  })

  it('vencimento informado e cartão sem acento', () => {
    expect(interpretar('Mercado 230,90 no itau vence dia 20/12').conta).toMatchObject({ valorFormatado: 230.9, cartao: 'Itaú', dataVencimento: '2026-12-20' })
  })

  it('"ontem" é a data da movimentação', () => {
    expect(interpretar('Uber 23,50 ontem').conta).toMatchObject({ dataCadastro: '2026-11-13', categoria: 'Transporte' })
  })

  it('receita', () => {
    expect(interpretar('Recebi 3.500 de salário').conta).toMatchObject({ tipoConta: 'Receita', valorFormatado: 3500, descricao: 'Salário', dataVencimento: '' })
  })

  it('cartão sem nome com vários cartões fica pendente', () => {
    expect(interpretar('Gasolina 200 no cartão').faltando).toEqual(['cartão usado'])
  })

  it('aprende a categoria pelo histórico', () => {
    expect(interpretar('academia 120').conta.categoria).toBe('Saúde')
  })

  it('números por extenso', () => {
    expect(interpretar('devo trinta e cinco reais pro Fulano do lanche').conta).toMatchObject({ valorFormatado: 35, anotarPara: 'Fulano' })
    expect(interpretar('mercado cento e vinte reais em três vezes').conta).toMatchObject({ valorFormatado: 40, parcela: '3' })
  })
})

describe('converterNumerosPorExtenso', () => {
  it('converte valores, milhares e centavos', () => {
    expect(converterNumerosPorExtenso('mil e duzentos reais')).toBe('1200 reais')
    expect(converterNumerosPorExtenso('dois mil')).toBe('2000')
    expect(converterNumerosPorExtenso('trinta e cinco reais e cinquenta centavos')).toBe('35,50 reais')
  })

  it('não mexe em artigos nem em descrições quando há algarismos', () => {
    expect(converterNumerosPorExtenso('uma TV')).toBe('uma TV')
    expect(converterNumerosPorExtenso('Pizza quatro queijos 50')).toBe('Pizza quatro queijos 50')
    expect(converterNumerosPorExtenso('um real')).toBe('1 real')
  })
})

describe('completarCampo', () => {
  it('valor total de parcelado é dividido; aceita valor por extenso', () => {
    const inicial = interpretar('TV em 10x no Nubank')
    expect(inicial.faltando).toEqual(['valor'])
    expect(completarCampo(inicial, 'valor', 'mil e duzentos', contexto).conta.valorFormatado).toBe(120)
  })

  it('valor sem número não serve', () => {
    expect(completarCampo(interpretar('Uber'), 'valor', 'não sei', contexto)).toBeNull()
  })

  it('cartão e pessoa', () => {
    expect(completarCampo(interpretar('Gasolina 200 no cartão'), 'cartão usado', 'nubank', contexto).conta.cartao).toBe('Nubank')
    const semPessoa = { ...interpretar('almoço 50'), conta: { ...interpretar('almoço 50').conta, selected: false } }
    expect(completarCampo(semPessoa, 'quem vai te pagar', 'ana', contexto).conta.responsavel).toBe('Ana Paula')
  })
})

describe('corrigirProposta', () => {
  const corrigir = (frase, correcao) => corrigirProposta(interpretar(frase), correcao, contexto)

  it('reconhece mensagens de correção', () => {
    expect(ehCorrecao('muda o vencimento pra dia 10')).toBe(true)
    expect(ehCorrecao('na verdade foram 3x')).toBe(true)
    expect(ehCorrecao('Uber 20')).toBe(false)
  })

  it('vencimento', () => {
    const { conta, assumidos } = corrigir('Uber 20', 'muda o vencimento pra dia 10')
    expect(conta.dataVencimento).toBe('2026-12-10')
    expect(assumidos).not.toContain('vencimento')
  })

  it('número de parcelas mantém o total', () => {
    expect(corrigir('TV 1.200', 'na verdade foram 10x').conta).toMatchObject({ parcela: '10', valorFormatado: 120 })
  })

  it('valor de parcelado é o total', () => {
    expect(corrigir('TV 1.200 em 10x', 'o valor é 1.500').conta.valorFormatado).toBe(150)
  })

  it('cartão, pix e categoria', () => {
    expect(corrigir('Mercado 50', 'foi no nubank').conta).toMatchObject({ ehCartao: true, cartao: 'Nubank' })
    expect(corrigir('Mercado 50 no Nubank', 'foi no pix').conta).toMatchObject({ ehCartao: false, cartao: '' })
    expect(corrigir('Presente 80', 'foi lazer').conta.categoria).toBe('Lazer')
    expect(corrigir('Presente 80', 'categoria presentes').conta.categoria).toBe('Presentes')
  })

  it('descrição e pessoa', () => {
    expect(corrigir('Uber 20', 'descrição táxi').conta.descricao).toBe('Táxi')
    expect(corrigir('Uber 20', 'é pro Fulano').conta).toMatchObject({ selected: true, anotarPara: 'Fulano' })
  })

  it('devolve null quando não entende', () => {
    expect(corrigir('Uber 20', 'muda aquilo')).toBeNull()
  })
})

describe('interpretarMensagem', () => {
  const lancamentos = (texto) => interpretarMensagem(texto, contexto).map(({ conta }) => [conta.tipoConta, conta.descricao, conta.valorFormatado])

  it('separa vários lançamentos', () => {
    expect(lancamentos('Uber 20 e mercado 150')).toEqual([['Despesa', 'Uber', 20], ['Despesa', 'Mercado', 150]])
    expect(lancamentos('uber 20, farmácia 35; padaria 12')).toHaveLength(3)
  })

  it('continua o tipo e a pessoa do anterior', () => {
    expect(lancamentos('Recebi 500 de salário e 200 de freela')).toEqual([['Receita', 'Salário', 500], ['Receita', 'Freela', 200]])
    const [, segundo] = interpretarMensagem('devo pro Fulano 20 do uber e 30 do almoço', contexto)
    expect(segundo.conta).toMatchObject({ anotarPara: 'Fulano', descricao: 'Almoço' })
  })

  it('não separa quando uma parte não é um lançamento completo', () => {
    expect(lancamentos('pão e leite 15')).toEqual([['Despesa', 'Pão e leite', 15]])
    expect(lancamentos('Devo pagar para Fulano, 98 reais do lanche')).toHaveLength(1)
  })
})

describe('paraNovaConta', () => {
  it('receita não leva campos de despesa', () => {
    const { conta } = interpretar('Recebi 500 de salário')
    expect(paraNovaConta(conta, { contas: [], fechamento: null, mesAtual: '2026-11' })).toMatchObject({ parcela: '', dataVencimento: '', selected: false, anotarPara: '', cartao: '', categoria: '', mesSaldo: '' })
  })
})
