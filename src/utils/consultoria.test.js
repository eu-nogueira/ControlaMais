import { describe, expect, it } from 'vitest'
import { formatarMoeda } from './formatar'
import {
  avaliarCompra, detectarAssinaturas, diagnosticar, ehPedidoDeDicas, ehPerguntaDeCompra, lerDiasFerias, lerMesExtra, lerOrigemExtra, lerValorExtra,
  opcoesDeExtras, resumirMes, sugestaoDeExtra,
} from './consultoria'

const despesa = (dados) => ({
  tipoConta: 'Despesa', selected: true, responsavel: '', anotarPara: '', parcela: '1', parcelaPaga: 0, contaFixa: false,
  categoria: '', cartao: '', mesSaldo: '', dataVencimento: '', ...dados,
})
const salario = (dataCadastro) => ({ id: `s${dataCadastro}`, tipoConta: 'Receita', descricao: 'Salário', valorFormatado: 3000, dataCadastro, mesSaldo: '' })

const contas = [
  salario('2026-08-05'), salario('2026-09-05'), salario('2026-10-05'), salario('2026-11-05'),
  despesa({ id: 'tv', descricao: 'TV', valorFormatado: 300, parcela: '10', parcelaPaga: 4, dataCadastro: '2026-07-10', dataVencimento: '2026-12-05' }),
  despesa({ id: 'aluguel', descricao: 'Aluguel', valorFormatado: 1500, contaFixa: true, parcela: '', dataCadastro: '2026-01-10', categoria: 'Casa' }),
  despesa({ id: 'netflix', descricao: 'Netflix', valorFormatado: 55.9, contaFixa: true, parcela: '', dataCadastro: '2026-03-02', categoria: 'Lazer' }),
  despesa({ id: 'sp10', descricao: 'Spotify', valorFormatado: 21.9, dataCadastro: '2026-10-08', categoria: 'Lazer' }),
  despesa({ id: 'sp11', descricao: 'Spotify', valorFormatado: 21.9, dataCadastro: '2026-11-08', categoria: 'Lazer' }),
  despesa({ id: 'al09', descricao: 'Mercado', valorFormatado: 400, dataCadastro: '2026-09-12', categoria: 'Alimentação' }),
  despesa({ id: 'al10', descricao: 'Mercado', valorFormatado: 700, dataCadastro: '2026-10-12', categoria: 'Alimentação' }),
  despesa({ id: 'ana', descricao: 'Almoço', valorFormatado: 80, selected: false, responsavel: 'Ana', dataCadastro: '2026-11-03' }),
  despesa({ id: 'nb', descricao: 'Celular', valorFormatado: 900, cartao: 'Nubank', dataCadastro: '2026-11-04' }),
]
const contexto = { contas, cartoes: [{ id: 1, nome: 'Nubank', limite: 1000 }], metas: [], fechamento: { mes: '2026-10', saldo: 422.2 }, mesAtual: '2026-11', hoje: '2026-11-15' }
const semNbsp = (texto) => texto.replace(/\u00a0/g, ' ')

describe('conversa', () => {
  it('reconhece pedidos de dicas e de compra', () => {
    expect(ehPedidoDeDicas('me dá umas dicas')).toBe(true)
    expect(ehPedidoDeDicas('como melhorar minha situação financeira?')).toBe(true)
    expect(ehPedidoDeDicas('analisa minhas finanças')).toBe(true)
    expect(ehPedidoDeDicas('uber 20')).toBe(false)
    expect(ehPerguntaDeCompra('posso comprar uma TV de 2.000 em 10x?')).toBe(true)
    expect(ehPerguntaDeCompra('comprei uma TV')).toBe(false)
  })

  it('entende a origem, o valor e o mês do valor extra', () => {
    expect(lerOrigemExtra('13º salário')).toBe('decimo_terceiro')
    expect(lerOrigemExtra('décimo terceiro')).toBe('decimo_terceiro')
    expect(lerOrigemExtra('Férias')).toBe('ferias')
    expect(lerOrigemExtra('saque do fgts')).toBe('fgts')
    expect(lerOrigemExtra('Não tenho')).toBe('nenhum')
    expect(lerOrigemExtra('Não, pode analisar')).toBe('nenhum')
    expect(lerOrigemExtra('banana')).toBeNull()
    expect(lerValorExtra('R$ 3.000,00')).toBe(3000)
    expect(lerValorExtra('uns dois mil')).toBe(2000)
    expect(lerValorExtra('não sei')).toBeNull()
    expect(lerMesExtra('Dezembro de 2026', '2026-11')).toBe('2026-12')
    expect(lerMesExtra('março', '2026-11')).toBe('2027-03')
    expect(lerMesExtra('mês que vem', '2026-11')).toBe('2026-12')
    expect(lerMesExtra('01/2027', '2026-11')).toBe('2027-01')
    expect(lerMesExtra('outubro de 2026', '2026-11')).toBeNull()
  })

  it('entende os dias de férias e a venda de dias', () => {
    expect(lerDiasFerias('15 dias')).toEqual({ dias: 15, vendidos: 0 })
    expect(lerDiasFerias('quinze dias')).toEqual({ dias: 15, vendidos: 0 })
    expect(lerDiasFerias('20 dias e vender 10')).toEqual({ dias: 20, vendidos: 10 })
    expect(lerDiasFerias('vou vender 10 dias')).toEqual({ dias: 20, vendidos: 10 })
    expect(lerDiasFerias('vender 5 e tirar 25')).toEqual({ dias: 25, vendidos: 5 })
    expect(lerDiasFerias('não sei')).toBeNull()
  })

  it('lê o valor dos botões de resposta (sem confundir "terço" ou "segunda" com números)', () => {
    expect(lerValorExtra(`Só o terço de férias: ${formatarMoeda(1023.45)}`)).toBe(1023.45)
    expect(lerValorExtra(`O valor total: ${formatarMoeda(3812.9)}`)).toBe(3812.9)
    expect(lerValorExtra(`Só a segunda parcela: ${formatarMoeda(1241.47)}`)).toBe(1241.47)
    expect(lerValorExtra(`Tudo: ${formatarMoeda(2741.47)}`)).toBe(2741.47)
  })

  it('sugere o 13º como um salário em dezembro e oferece as opções restantes', () => {
    expect(sugestaoDeExtra('decimo_terceiro', contas, '2026-11')).toEqual({ valor: 3000, mes: '2026-12' })
    expect(opcoesDeExtras(['decimo_terceiro'])).not.toContain('13º salário')
    expect(opcoesDeExtras(['decimo_terceiro']).at(-1)).toBe('Não, pode analisar')
  })
})

describe('diagnosticar', () => {
  const { situacao, acoes } = diagnosticar({ ...contexto, extras: [{ origem: 'decimo_terceiro', valor: 3000, mes: '2026-12' }] })
  const textos = acoes.map((acao) => semNbsp(acao.texto))

  it('resume a situação atual e a projeção', () => {
    expect(semNbsp(situacao.join(' '))).toContain('Saldo disponível: R$ 222,20')
    expect(semNbsp(situacao.join(' '))).toContain('a maior é Aluguel (R$ 1.500,00)')
    expect(semNbsp(situacao.join(' '))).toContain('13º salário (R$ 3.000,00 em dezembro)')
  })

  it('usa o 13º como a Simulação recomendaria, com botão para simular', () => {
    const comTreze = acoes.find((acao) => acao.botao?.tipo === 'simular')
    expect(semNbsp(comTreze.texto)).toMatch(/^Com o 13º salário \(R\$ 3\.000,00 em dezembro\): quitar TV/)
    expect(comTreze.botao.dados.entrada).toMatchObject({ tipo: 'futuro', origem: 'decimo_terceiro', mesRecebimento: '2026-12', valor: '3000,00', decisoes: { tv: { acao: 'quitar' } } })
  })

  it('13º calculado na conversa abre a Simulação no "Calcular para mim", com o mesmo salário', () => {
    const extra = { origem: 'decimo_terceiro', valor: 2700, mes: '2026-12', calculo: { salario: 3000, primeiraRecebida: false } }
    const botao = diagnosticar({ ...contexto, extras: [extra] }).acoes.find((acao) => acao.botao?.tipo === 'simular').botao
    expect(botao.dados.entrada).toMatchObject({ modoDecimo: 'calcular', salarioBruto: '3000,00', mesesTrabalhados: '12', primeiraRecebida: false })
    const informado = diagnosticar({ ...contexto, extras: [{ ...extra, calculo: undefined }] }).acoes.find((acao) => acao.botao?.tipo === 'simular').botao
    expect(informado.dados.entrada).toMatchObject({ modoDecimo: 'manual', valor: '2700,00', salarioBruto: '' })
  })

  it('férias: só o 1/3 abre a Simulação calculada; o valor total avisa do salário adiantado', () => {
    const ferias = { origem: 'ferias', valor: 1000, mes: '2027-01', calculo: { salario: 3000, valorTotal: false, dias: 20, vendidos: 10 } }
    const terco = diagnosticar({ ...contexto, extras: [ferias] })
    expect(terco.acoes.find((acao) => acao.botao?.tipo === 'simular').botao.dados.entrada).toMatchObject({ modoFerias: 'calcular', salarioBruto: '3000,00', diasFerias: '20', diasVendidos: '10' })
    expect(terco.situacao.join(' ')).not.toContain('salário adiantado')

    const total = diagnosticar({ ...contexto, extras: [{ ...ferias, valor: 3800, calculo: { salario: 3000, valorTotal: true } }] })
    expect(total.acoes.find((acao) => acao.botao?.tipo === 'simular').botao.dados.entrada).toMatchObject({ modoFerias: 'manual', valor: '3800,00' })
    expect(total.situacao.join(' ')).toContain('o próximo pagamento virá menor')
  })

  it('aponta cartão no limite, gasto que cresceu, valores a receber e assinaturas, no máximo 5 ações', () => {
    expect(acoes.length).toBeLessThanOrEqual(5)
    expect(textos.some((texto) => texto.includes('cartão Nubank está com 90%'))).toBe(true)
    expect(textos.some((texto) => texto.startsWith('Alimentação subiu R$ 300,00'))).toBe(true)
    expect(textos.some((texto) => texto.includes('para receber de Ana'))).toBe(true)
  })

  it('sem valor extra, sugere a reserva de emergência', () => {
    const semExtra = diagnosticar({ ...contexto, cartoes: [], contas: contas.filter((conta) => conta.id !== 'ana' && conta.id !== 'al10') })
    expect(semExtra.acoes.some((acao) => acao.botao?.tipo === 'meta' && acao.botao.dados.tipo === 'reserva')).toBe(true)
  })

  it('avisa quando um mês da projeção fica negativo', () => {
    const apertado = [...contas, despesa({ id: 'carro', descricao: 'Carro', valorFormatado: 1300, parcela: '3', dataCadastro: '2026-11-01' })]
    const { acoes: comAperto } = diagnosticar({ ...contexto, contas: apertado })
    expect(comAperto.some((acao) => /^Em dezembro a sobra fica negativa/.test(semNbsp(acao.texto)))).toBe(true)
  })
})

describe('avaliarCompra', () => {
  const avaliar = (texto) => semNbsp(avaliarCompra(texto, contexto).texto)

  it('parcelado que cabe', () => {
    expect(avaliar('posso comprar uma geladeira de 3.000 em 10x?')).toMatch(/^Pode\. Com Geladeira em 10x de R\$ 300,00, ainda sobram pelo menos R\$ 844,10/)
  })

  it('parcelado que não cabe agora, mas cabe se esperar o fim da TV', () => {
    expect(avaliar('posso comprar um sofá de 7.800 em 6x?')).toMatch(/^Melhor não agora.*Se a primeira parcela for em maio, cabe\./)
  })

  it('à vista, comparado com o saldo atual', () => {
    expect(avaliar('posso comprar um tênis de 500?')).toMatch(/^Melhor não agora: à vista, o saldo ficaria negativo em R\$ 277,80/)
    expect(avaliar('posso comprar um livro de 50?')).toMatch(/^Cabe, mas fica apertado/)
  })

  it('sem valor, pede o valor; e oferece registrar a compra', () => {
    expect(avaliar('posso comprar uma TV?')).toMatch(/^Me diga o valor/)
    expect(avaliarCompra('posso comprar um livro de 50?', contexto).botao).toMatchObject({ tipo: 'registrar', dados: { valorFormatado: 50 } })
  })
})

describe('assinaturas esquecidas', () => {
  it('nunca sugere cortar contas essenciais (moradia, contas da casa, veículo, saúde, educação)', () => {
    const fixa = (descricao, valorFormatado, categoria = '') => despesa({ descricao, valorFormatado, categoria, contaFixa: true, parcela: '', dataCadastro: '2026-05-01' })
    const fixas = [fixa('Aluguel', 1500, 'Casa'), fixa('Água', 80), fixa('Luz', 140), fixa('Internet', 99), fixa('Parcela da casa', 140),
      fixa('Seguro do carro', 120), fixa('Plano de saúde', 149), fixa('Escola do João', 130), fixa('Condomínio', 145), fixa('Gás', 110),
      fixa('Financiamento', 90), fixa('Diarista', 120, 'Casa'), fixa('Netflix', 55.9), fixa('Academia', 99), fixa('Spotify', 21.9)]
    expect(detectarAssinaturas(fixas, '2026-11').map((assinatura) => assinatura.descricao)).toEqual(['Academia', 'Netflix', 'Spotify'])
  })

  it('encontra contas fixas de serviços e serviços que se repetem sem estar como conta fixa', () => {
    expect(detectarAssinaturas(contas, '2026-11')).toEqual([{ descricao: 'Netflix', valor: 55.9 }, { descricao: 'Spotify', valor: 21.9 }])
  })
})

describe('resumirMes', () => {
  it('resume o mês quitado', () => {
    const linhas = resumirMes(contas, '2026-10', contexto.fechamento).map(semNbsp)
    expect(linhas[0]).toBe('Em outubro sobraram R$ 422,20 do salário.')
    expect(linhas[1]).toBe('Você recebeu R$ 3.000,00 e teve R$ 2.577,80 em despesas, R$ 321,90 a mais que em setembro.')
    expect(linhas[2]).toMatch(/^O que mais pesou: Casa \(R\$ 1\.500,00\), Alimentação \(R\$ 700,00\) e Sem tipo \(R\$ 300,00\)\. O maior gasto foi Aluguel/)
    expect(linhas[3]).toBe('Alimentação subiu R$ 300,00 em relação a setembro.')
  })
})
