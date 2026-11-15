import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

// Supabase simulado: guarda as linhas em memória e, com `servidor.online = false`, falha como o fetch sem internet.
const { servidor, armazenamento } = vi.hoisted(() => ({
  servidor: { online: true, contas: [], proximoId: 1 },
  armazenamento: new Map(),
}))

vi.mock('../services/supabase', () => {
  function consulta(tabela) {
    let acao = 'select'
    let dados = null
    let filtro = null
    const executar = () => {
      if (!servidor.online) return { data: null, error: { message: 'TypeError: Failed to fetch' } }
      if (tabela === 'fechamentos') return { data: acao === 'insert' ? null : null, error: null }
      if (acao === 'insert') {
        const linha = { ...dados, id: servidor.proximoId++, parcela_paga: 0 }
        servidor.contas.push(linha)
        return { data: { ...linha }, error: null }
      }
      if (acao === 'update') {
        const linha = servidor.contas.find((item) => item.id === filtro)
        if (!linha) return { data: null, error: { message: 'Registro não encontrado', code: 'PGRST116' } }
        Object.assign(linha, dados)
        return { data: { ...linha }, error: null }
      }
      if (acao === 'delete') {
        servidor.contas = servidor.contas.filter((item) => item.id !== filtro)
        return { data: null, error: null }
      }
      return { data: servidor.contas.map((linha) => ({ ...linha })), error: null }
    }
    const construtor = {
      select: () => construtor,
      order: () => construtor,
      limit: () => construtor,
      single: () => construtor,
      maybeSingle: () => construtor,
      insert: (linha) => { acao = 'insert'; dados = linha; return construtor },
      update: (linha) => { acao = 'update'; dados = linha; return construtor },
      delete: () => { acao = 'delete'; return construtor },
      eq: (_, valor) => { filtro = valor; return construtor },
      then: (resolver, rejeitar) => Promise.resolve(executar()).then(resolver, rejeitar),
    }
    return construtor
  }
  return {
    default: {
      from: consulta,
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    },
  }
})

vi.mock('../services/armazenamentoLocal', () => ({
  chaveDoUsuario: (nome, usuarioId) => `${nome}:${usuarioId}`,
  lerJSON: async (chave, padrao = null) => (armazenamento.has(chave) ? structuredClone(armazenamento.get(chave)) : padrao),
  gravarJSON: async (chave, valor) => { armazenamento.set(chave, structuredClone(valor)) },
}))

const { default: extrato, adicionarConta, alterarParcelaPaga, carregarContas, editarConta, gravarCopiaLocal, quitarMesesAnteriores, removerConta, sincronizarFila } = await import('./extrato')
const { default: cartoes } = await import('./cartoes')

const novaConta = (dados = {}) => ({
  descricao: 'Mercado', dataCadastro: '2026-11-14', valorFormatado: 50, tipoConta: 'Despesa', responsavel: '',
  parcela: '1', contaFixa: false, dataVencimento: '2026-12-05', selected: true, anotarPara: '', cartao: '', categoria: 'Alimentação', mesSaldo: '', ...dados,
})

function ficarOnline(online) {
  servidor.online = online
  vi.stubGlobal('navigator', { onLine: online })
}

let store
const estado = () => store.getState().extrato

beforeEach(() => {
  servidor.contas = []
  servidor.proximoId = 1
  armazenamento.clear()
  ficarOnline(true)
  store = configureStore({ reducer: { extrato, cartoes } })
})

describe('com internet', () => {
  it('grava direto no servidor', async () => {
    const conta = await store.dispatch(adicionarConta(novaConta())).unwrap()
    expect(conta.id).toBe(1)
    expect(servidor.contas).toHaveLength(1)
    expect(estado().fila).toEqual([])
  })
})

describe('sem internet', () => {
  it('guarda na fila, mostra na hora e envia quando a conexão volta', async () => {
    ficarOnline(false)
    const mercado = await store.dispatch(adicionarConta(novaConta())).unwrap()
    const uber = await store.dispatch(adicionarConta(novaConta({ descricao: 'Uber', valorFormatado: 20 }))).unwrap()
    await store.dispatch(editarConta({ ...mercado, valorFormatado: 80 })).unwrap()

    expect(mercado.id).toMatch(/^local-/)
    expect(estado().contasExtrato.map((conta) => [conta.descricao, conta.valorFormatado])).toEqual([['Mercado', 80], ['Uber', 20]])
    // A edição de algo ainda não enviado é juntada à criação.
    expect(estado().fila.map((operacao) => operacao.tipo)).toEqual(['adicionar', 'adicionar'])
    expect(armazenamento.get('fila:u1')).toHaveLength(2)
    expect(servidor.contas).toHaveLength(0)

    ficarOnline(true)
    await store.dispatch(sincronizarFila())

    expect(servidor.contas.map((linha) => [linha.descricao, linha.valor])).toEqual([['Mercado', 80], ['Uber', 20]])
    expect(estado().fila).toEqual([])
    expect(armazenamento.get('fila:u1')).toEqual([])
    expect(estado().contasExtrato.map((conta) => conta.id)).toEqual([1, 2])
    expect(estado().idsSincronizados[uber.id]).toBe(2)
  })

  it('apagar algo que ainda não foi enviado só tira da fila', async () => {
    ficarOnline(false)
    const conta = await store.dispatch(adicionarConta(novaConta())).unwrap()
    await store.dispatch(removerConta(conta)).unwrap()
    expect(estado().fila).toEqual([])
    expect(estado().contasExtrato).toEqual([])
  })

  it('edita, paga parcela e apaga movimentações que já estavam no servidor', async () => {
    const tv = await store.dispatch(adicionarConta(novaConta({ descricao: 'TV', parcela: '10', valorFormatado: 120 }))).unwrap()
    const uber = await store.dispatch(adicionarConta(novaConta({ descricao: 'Uber' }))).unwrap()

    ficarOnline(false)
    await store.dispatch(alterarParcelaPaga({ id: tv.id, parcelaPaga: 1 })).unwrap()
    await store.dispatch(removerConta(uber)).unwrap()
    expect(estado().contasExtrato.map((conta) => conta.descricao)).toEqual(['TV'])

    ficarOnline(true)
    await store.dispatch(sincronizarFila())
    expect(servidor.contas.map((linha) => [linha.descricao, linha.parcela_paga, linha.data_vencimento])).toEqual([['TV', 1, '2027-01-05']])
  })

  it('enquanto há fila, novas alterações entram nela para manter a ordem', async () => {
    ficarOnline(false)
    const conta = await store.dispatch(adicionarConta(novaConta())).unwrap()
    servidor.online = true
    vi.stubGlobal('navigator', { onLine: true })
    // A fila ainda não foi enviada: editar a conta local não pode ir direto ao servidor.
    await store.dispatch(editarConta({ ...conta, descricao: 'Feira' })).unwrap()
    expect(servidor.contas).toHaveLength(0)
    await store.dispatch(sincronizarFila())
    expect(servidor.contas[0].descricao).toBe('Feira')
  })

  it('para na falta de conexão e tenta de novo depois', async () => {
    ficarOnline(false)
    await store.dispatch(adicionarConta(novaConta())).unwrap()
    vi.stubGlobal('navigator', { onLine: true })
    await store.dispatch(sincronizarFila())
    expect(estado().fila).toHaveLength(1)
    expect(estado().falhasEnvio).toEqual([])
  })

  it('erro do servidor descarta a operação, avisa e recarrega', async () => {
    const conta = await store.dispatch(adicionarConta(novaConta())).unwrap()
    ficarOnline(false)
    await store.dispatch(editarConta({ ...conta, descricao: 'Feira' })).unwrap()
    servidor.contas = [] // apagada em outro aparelho

    ficarOnline(true)
    await store.dispatch(sincronizarFila())
    expect(estado().fila).toEqual([])
    expect(estado().falhasEnvio[0]).toMatch(/^Não foi possível editar "Feira"/)
    expect(estado().contasExtrato).toEqual([])
  })

  it('"Desfazer" com o id local funciona depois do envio', async () => {
    ficarOnline(false)
    const conta = await store.dispatch(adicionarConta(novaConta())).unwrap()
    ficarOnline(true)
    await store.dispatch(sincronizarFila())
    await store.dispatch(removerConta(conta)).unwrap()
    expect(servidor.contas).toEqual([])
    expect(estado().contasExtrato).toEqual([])
  })

  it('abre com a cópia do aparelho e com a fila guardada', async () => {
    await gravarCopiaLocal('u1', { contas: [{ id: 'local-1', descricao: 'Pão' }], fechamento: null })
    armazenamento.set('fila:u1', [{ id: 'op1', tipo: 'adicionar', contaId: 'local-1', linha: {} }])
    ficarOnline(false)

    await store.dispatch(carregarContas())
    expect(estado()).toMatchObject({ semConexao: true, carregado: true, erro: null })
    expect(estado().contasExtrato[0].descricao).toBe('Pão')
    expect(estado().fila).toHaveLength(1)
  })

  it('sem cópia no aparelho, mostra o erro de conexão', async () => {
    ficarOnline(false)
    await store.dispatch(carregarContas())
    expect(estado().erro).toMatch(/Sem conexão/)
  })

  it('não deixa quitar o mês com alterações pendentes', async () => {
    ficarOnline(false)
    await store.dispatch(adicionarConta(novaConta())).unwrap()
    // A conexão voltou, mas a fila ainda não foi enviada.
    vi.stubGlobal('navigator', { onLine: true })
    await store.dispatch(quitarMesesAnteriores('2026-11'))
    expect(estado().erro).toMatch(/aguardando envio/)
  })
})
