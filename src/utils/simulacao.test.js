import { describe, expect, it } from 'vitest'
import { descreverOrigemRenda, estimarRenda, projetarDisponivel } from './simulacao'

const receita = (dataCadastro, valorFormatado) => ({ tipoConta: 'Receita', descricao: 'Salário', dataCadastro, valorFormatado })
const parcelado = { id: 9, tipoConta: 'Despesa', selected: true, descricao: 'TV', valorFormatado: 200, parcela: '3', parcelaPaga: 0, contaFixa: false, dataCadastro: '2026-11-02', dataVencimento: '2026-12-05' }

describe('estimarRenda', () => {
  it('usa a média dos últimos 3 meses anteriores com receita, ignorando o mês atual', () => {
    const contas = [receita('2026-07-05', 1000), receita('2026-08-05', 2000), receita('2026-09-05', 3000), receita('2026-10-05', 4000), receita('2026-11-05', 9000)]
    expect(estimarRenda(contas, '2026-11')).toEqual({ renda: 3000, meses: ['2026-08', '2026-09', '2026-10'], doMesAtual: false })
  })

  it('um único salário em mês anterior basta', () => {
    expect(estimarRenda([receita('2026-10-05', 3500)], '2026-11')).toEqual({ renda: 3500, meses: ['2026-10'], doMesAtual: false })
  })

  it('sem meses anteriores, usa as receitas do mês atual', () => {
    const contas = [receita('2026-11-05', 3500), receita('2026-11-20', 500)]
    expect(estimarRenda(contas, '2026-11')).toEqual({ renda: 4000, meses: ['2026-11'], doMesAtual: true })
  })

  it('sem nenhuma receita, não estima', () => {
    expect(estimarRenda([parcelado], '2026-11').renda).toBeNull()
    // Receita lançada para um mês futuro não conta.
    expect(estimarRenda([receita('2026-12-05', 3500)], '2026-11').renda).toBeNull()
  })

  it('explica de onde veio a renda', () => {
    expect(descreverOrigemRenda(estimarRenda([receita('2026-10-05', 3500)], '2026-11'))).toBe('média de receitas de 1 mês anterior')
    expect(descreverOrigemRenda(estimarRenda([receita('2026-11-05', 3500)], '2026-11'))).toBe('receitas deste mês, porque ainda não há receitas em meses anteriores')
  })
})

describe('projetarDisponivel', () => {
  it('mostra a projeção para quem só registrou o salário deste mês', () => {
    const { renda, pontos } = projetarDisponivel([receita('2026-11-05', 3500), parcelado], '2026-11', 3)
    expect(renda).toBe(3500)
    expect(pontos).toHaveLength(3)
    expect(pontos[0]).toMatchObject({ renda: 3500, parcelas: 200, sobra: 3300 })
  })
})
