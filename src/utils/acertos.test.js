import { describe, expect, it } from 'vitest'
import { mesmaPessoa, nomesDasPessoas, resumirAcertos, unificarNome } from './acertos'

const devoPara = (anotarPara, valorFormatado = 10) => ({ tipoConta: 'Despesa', selected: true, anotarPara, responsavel: '', valorFormatado })
const meDeve = (responsavel, valorFormatado = 10) => ({ tipoConta: 'Despesa', selected: false, anotarPara: '', responsavel, valorFormatado })

describe('resumirAcertos', () => {
  it('soma grafias diferentes do mesmo nome como uma pessoa só', () => {
    const { euDevo } = resumirAcertos([devoPara('Nagano Store', 50), devoPara('nagano store', 30), devoPara('  Nagano   Store ', 20)])
    expect(euDevo).toEqual([{ pessoa: 'Nagano Store', valor: 100 }])
  })

  it('exibe a grafia mais caprichada (acentos e iniciais maiúsculas)', () => {
    expect(resumirAcertos([meDeve('joao'), meDeve('João')]).meDevem).toEqual([{ pessoa: 'João', valor: 20 }])
  })

  it('mantém separado quem deve e para quem se deve, e pessoas diferentes', () => {
    const { euDevo, meDevem } = resumirAcertos([devoPara('Ana', 40), meDeve('ana', 15), devoPara('Ana Paula', 5)])
    expect(euDevo).toEqual([{ pessoa: 'Ana', valor: 40 }, { pessoa: 'Ana Paula', valor: 5 }])
    expect(meDevem).toEqual([{ pessoa: 'ana', valor: 15 }])
  })
})

describe('nomes das pessoas', () => {
  const contas = [devoPara('nagano store'), devoPara('Nagano Store'), meDeve('Ana Paula'), devoPara('')]

  it('lista uma grafia por pessoa', () => {
    expect(nomesDasPessoas(contas)).toEqual(['Ana Paula', 'Nagano Store'])
  })

  it('unifica com a grafia já cadastrada', () => {
    expect(unificarNome('NAGANO  STORE ', contas)).toBe('Nagano Store')
    expect(unificarNome(' Loja Nova ', contas)).toBe('Loja Nova')
  })

  it('compara sem diferenciar acentos, maiúsculas e espaços', () => {
    expect(mesmaPessoa('João ', 'joao')).toBe(true)
    expect(mesmaPessoa('Ana', 'Ana Paula')).toBe(false)
    expect(mesmaPessoa('', '')).toBe(false)
  })
})
