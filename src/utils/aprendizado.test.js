import { describe, expect, it } from 'vitest'
import { APRENDIZADO_VAZIO, aprender, aprenderComFormulario, descreverAprendizado, esquecer, interpretarEnsinamento, pedidoDoQueAprendeu, pedidoParaEsquecer } from './aprendizado'
import { categoriaDoHistorico, completarCampo, interpretarTexto } from './copiloto'
import { responderPergunta } from './perguntasCopiloto'

const contas = [
  { id: 1, tipoConta: 'Despesa', selected: true, responsavel: '', anotarPara: 'Maria Souza', descricao: 'Mercado', categoria: 'Alimentação', valorFormatado: 50, parcela: '1', dataCadastro: '2026-11-02', mesSaldo: '' },
  { id: 2, tipoConta: 'Despesa', selected: true, responsavel: '', anotarPara: '', descricao: 'Ração', categoria: 'Pet', valorFormatado: 90, parcela: '1', dataCadastro: '2026-11-03', mesSaldo: '', cartao: 'Nubank' },
]
const cartoes = [{ nome: 'Nubank' }, { nome: 'Itaú' }]
const base = { contas, cartoes, hoje: '2026-11-14', mesAtual: '2026-11', fechamento: null }
const ensinar = (texto) => interpretarEnsinamento(texto, base)

describe('interpretarEnsinamento', () => {
  it('tipo de despesa: conhecido, usado pelo usuário ou explícito', () => {
    expect(ensinar("habib's é alimentação")).toEqual({ grupo: 'categorias', termo: "Habib's", valor: 'Alimentação' })
    expect(ensinar('sempre que eu falar petshop é pet')).toEqual({ grupo: 'categorias', termo: 'Petshop', valor: 'Pet' })
    expect(ensinar('presente é categoria presentes')).toEqual({ grupo: 'categorias', termo: 'Presente', valor: 'Presentes' })
    expect(ensinar('aprende que academia é saúde')).toEqual({ grupo: 'categorias', termo: 'Academia', valor: 'Saúde' })
  })

  it('apelido de cartão e de pessoa', () => {
    expect(ensinar('roxinho é o Nubank')).toEqual({ grupo: 'cartoes', termo: 'Roxinho', valor: 'Nubank' })
    expect(ensinar('mãe é a Maria Souza')).toEqual({ grupo: 'pessoas', termo: 'Mãe', valor: 'Maria Souza' })
    expect(ensinar('chefe é o joão')).toEqual({ grupo: 'pessoas', termo: 'Chefe', valor: 'João' })
  })

  it('ignora lançamentos, correções e frases sem sentido de ensinamento', () => {
    expect(ensinar('uber 20')).toBeNull()
    expect(ensinar('o valor é 120')).toBeNull()
    expect(ensinar('a categoria é lazer')).toBeNull()
    expect(ensinar('isso é caro')).toBeNull()
    expect(ensinar('hoje é feriado')).toBeNull()
  })
})

describe('memória', () => {
  const aprendido = [
    "habib's é alimentação", 'roxinho é o Nubank', 'mãe é a Maria Souza', 'petshop é pet',
  ].reduce((atual, texto) => aprender(atual, ensinar(texto)), APRENDIZADO_VAZIO)
  const contexto = { ...base, aprendizado: aprendido }

  it('o interpretador usa o que aprendeu', () => {
    expect(interpretarTexto('mercado 80 no roxinho', contexto).conta).toMatchObject({ ehCartao: true, cartao: 'Nubank', descricao: 'Mercado' })
    expect(interpretarTexto('devo 50 pra mãe do lanche', contexto).conta).toMatchObject({ anotarPara: 'Maria Souza', descricao: 'Lanche' })
    expect(interpretarTexto('a mãe me deve 30 da farmácia', contexto).conta).toMatchObject({ selected: false, responsavel: 'Maria Souza' })
    expect(interpretarTexto('petshop 120', contexto).conta.categoria).toBe('Pet')
  })

  it('o ensinado vence o dicionário', () => {
    const lazer = aprender(aprendido, { grupo: 'categorias', termo: 'Uber', valor: 'Trabalho' })
    expect(interpretarTexto('uber 20', { ...base, aprendizado: lazer }).conta.categoria).toBe('Trabalho')
  })

  it('respostas e perguntas também usam os apelidos', () => {
    const inicial = interpretarTexto('gasolina 200 no cartão', contexto)
    expect(completarCampo(inicial, 'cartão usado', 'no roxinho', contexto).conta.cartao).toBe('Nubank')
    expect(responderPergunta('quanto devo pra mãe?', contexto).replace(/\u00a0/g, ' ')).toBe('Você deve R$ 50,00 para Maria Souza neste mês.')
    expect(responderPergunta('quanto gastei no roxinho?', contexto).replace(/\u00a0/g, ' ')).toContain('no cartão Nubank')
  })

  it('lista e esquece', () => {
    expect(pedidoDoQueAprendeu('o que você aprendeu?')).toBe(true)
    expect(descreverAprendizado(aprendido)).toContain('"Roxinho" → Nubank (cartão)')
    expect(pedidoParaEsquecer('esquece roxinho')).toBe('Roxinho')
    expect(pedidoParaEsquecer('esqueça o que você aprendeu sobre habib\'s')).toBe("Habib's")
    expect(pedidoParaEsquecer('esquece')).toBeNull()

    const { aprendizado: semRoxinho, esquecido } = esquecer(aprendido, 'roxinho')
    expect(esquecido).toMatchObject({ grupo: 'cartoes', valor: 'Nubank' })
    expect(interpretarTexto('mercado 80 no roxinho', { ...base, aprendizado: semRoxinho }).conta.cartao).toBe('')
    expect(esquecer(aprendido, 'nada disso').esquecido).toBeNull()
  })
})

describe('aprender com o formulário', () => {
  const proposta = { tipoConta: 'Despesa', descricao: 'Presente', categoria: '' }

  it('aprende quando o tipo finalizado é diferente do proposto', () => {
    const novo = aprenderComFormulario(APRENDIZADO_VAZIO, proposta, { ...proposta, categoria: 'Lazer' })
    expect(novo.categorias.presente).toEqual({ termo: 'Presente', valor: 'Lazer' })
    expect(interpretarTexto('presente 80', { ...base, aprendizado: novo }).conta.categoria).toBe('Lazer')
  })

  it('usa a descrição final, caso também tenha sido alterada', () => {
    const novo = aprenderComFormulario(APRENDIZADO_VAZIO, proposta, { ...proposta, descricao: 'Presente da Ana', categoria: 'Lazer' })
    expect(Object.keys(novo.categorias)).toEqual(['presente da ana'])
  })

  it('não aprende sem mudança, sem tipo ou em receitas', () => {
    expect(aprenderComFormulario(APRENDIZADO_VAZIO, { ...proposta, categoria: 'Lazer' }, { ...proposta, categoria: 'lazer' })).toBeNull()
    expect(aprenderComFormulario(APRENDIZADO_VAZIO, proposta, proposta)).toBeNull()
    expect(aprenderComFormulario(APRENDIZADO_VAZIO, proposta, { tipoConta: 'Receita', descricao: 'Freela', categoria: '' })).toBeNull()
    expect(aprenderComFormulario(APRENDIZADO_VAZIO, proposta, undefined)).toBeNull()
  })
})

describe('categoriaDoHistorico', () => {
  const despesa = (descricao, categoria) => ({ tipoConta: 'Despesa', descricao, categoria })

  it('escolhe o tipo mais usado para a mesma descrição', () => {
    const contas = [despesa('Padaria', 'Alimentação'), despesa('Padaria', 'Lazer'), despesa('padaria', 'Alimentação')]
    expect(categoriaDoHistorico('Padaria', contas)).toBe('Alimentação')
  })

  it('no empate, vale o mais recente', () => {
    expect(categoriaDoHistorico('Feira', [despesa('Feira', 'Alimentação'), despesa('Feira', 'Casa')])).toBe('Casa')
  })

  it('ignora acentos, pontuação e despesas sem tipo', () => {
    const contas = [despesa("Habib's", 'Alimentação'), despesa('Habibs', '')]
    expect(categoriaDoHistorico('habibs', contas)).toBe('Alimentação')
    expect(categoriaDoHistorico('Farmacia', [despesa('Farmácia', 'Saúde')])).toBe('Saúde')
    expect(categoriaDoHistorico('Mercado Livre', [despesa('Mercado', 'Alimentação')])).toBe('')
  })

  it('o histórico vence o dicionário, e o ensinado vence o histórico', () => {
    const contas = [despesa('Uber', 'Trabalho'), despesa('Uber', 'Trabalho')]
    expect(interpretarTexto('uber 20', { ...base, contas }).conta.categoria).toBe('Trabalho')
    const ensinado = aprender(APRENDIZADO_VAZIO, { grupo: 'categorias', termo: 'Uber', valor: 'Transporte' })
    expect(interpretarTexto('uber 20', { ...base, contas, aprendizado: ensinado }).conta.categoria).toBe('Transporte')
  })
})
