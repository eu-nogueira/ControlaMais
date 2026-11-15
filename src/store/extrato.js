import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import supabase from "../services/supabase";
import { mesesParaFechar, simularFechamento } from "../utils/saldo";
import { deslocarData } from "../utils/mes";
import { editarCartao } from "./cartoes";
import { ehErroConexao, mensagemErro } from '../services/erros'
import { chaveDoUsuario, gravarJSON, lerJSON } from '../services/armazenamentoLocal'
import { aplicarFila, criarIdLocal, descreverOperacao, enfileirar, novaOperacao, trocarIdNaFila } from '../utils/filaOffline'

function paraConta(linha) {
    return {
        id: linha.id,
        descricao: linha.descricao,
        dataCadastro: linha.data_cadastro,
        valorFormatado: Number(linha.valor),
        tipoConta: linha.tipo_conta,
        responsavel: linha.responsavel,
        parcela: linha.parcela ?? '',
        parcelaPaga: linha.parcela_paga,
        dataVencimento: linha.data_vencimento ?? '',
        selected: linha.selected,
        anotarPara: linha.anotar_para,
        cartao: linha.cartao ?? '',
        categoria: linha.categoria ?? '',
        contaFixa: Boolean(linha.conta_fixa),
        mesSaldo: linha.mes_saldo ?? ''
    }
}

function paraLinha(conta) {
    return {
        descricao: conta.descricao,
        data_cadastro: conta.dataCadastro,
        valor: conta.valorFormatado,
        tipo_conta: conta.tipoConta,
        responsavel: conta.responsavel,
        parcela: Number(conta.parcela) || null,
        data_vencimento: conta.dataVencimento || null,
        selected: conta.selected,
        anotar_para: conta.anotarPara,
        cartao: conta.cartao,
        categoria: conta.categoria || null,
        conta_fixa: Boolean(conta.contaFixa),
        mes_saldo: conta.mesSaldo || null
    }
}

// --- Funcionamento sem internet ---------------------------------------------------------------
// As alterações de movimentações feitas sem conexão vão para uma fila guardada no aparelho e aparecem
// na tela na hora. Quando a conexão volta, a fila é enviada na ordem em que foi criada. Uma cópia das
// movimentações também fica no aparelho, para o app abrir sem internet.

async function usuarioAtual() {
    const { data } = await supabase.auth.getSession()
    return data.session?.user.id ?? null
}

const chaveFila = (usuarioId) => chaveDoUsuario('fila', usuarioId)
const chaveCopia = (usuarioId) => chaveDoUsuario('extrato', usuarioId)

export const gravarCopiaLocal = (usuarioId, dados) => gravarJSON(chaveCopia(usuarioId), dados)

async function gravarFila(getState) {
    const usuarioId = await usuarioAtual()
    if (usuarioId) await gravarJSON(chaveFila(usuarioId), getState().extrato.fila)
}

async function inserirConta(linha) {
    const { data, error } = await supabase
        .from('contas')
        .insert(linha)
        .select()
        .single()
    if (error) throw error
    return paraConta(data)
}

async function atualizarConta(id, linha) {
    const { data, error } = await supabase
        .from('contas')
        .update(linha)
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return paraConta(data)
}

async function apagarConta(id) {
    const { error } = await supabase
        .from('contas')
        .delete()
        .eq('id', id)
    if (error) throw error
}

async function atualizarParcela(id, parcelaPaga, dataVencimento) {
    const { error } = await supabase
        .from('contas')
        .update({ parcela_paga: parcelaPaga, data_vencimento: dataVencimento || null })
        .eq('id', id)
    if (error) throw error
}

function enviarOperacao(operacao) {
    if (operacao.tipo === 'adicionar') return inserirConta(operacao.linha)
    if (operacao.tipo === 'editar') return atualizarConta(operacao.contaId, operacao.linha)
    if (operacao.tipo === 'remover') return apagarConta(operacao.contaId)
    return atualizarParcela(operacao.contaId, operacao.parcelaPaga, operacao.dataVencimento)
}

// Movimentação criada sem internet e já enviada: o id local passa a apontar para o definitivo
// (ex.: "Desfazer" no chat do Marcão, que guardou o id local).
const resolverId = (state, id) => state.extrato.idsSincronizados[id] ?? id

// Envia direto quando possível. Sem conexão, ou com envios ainda pendentes (para manter a ordem),
// guarda na fila e devolve null; quem chamou monta o resultado local.
async function enviarOuEnfileirar({ getState, dispatch }, operacao) {
    if (getState().extrato.fila.length === 0 && navigator.onLine) {
        try {
            return { enviado: true, resultado: await enviarOperacao(operacao) }
        } catch (error) {
            if (!ehErroConexao(error)) throw error
        }
    }
    dispatch(operacaoEnfileirada(operacao))
    await gravarFila(getState)
    return { enviado: false }
}

// `silencioso`: recarrega sem mostrar "Carregando..." (usado depois de enviar a fila).
export const carregarContas = createAsyncThunk('extrato/carregarContas', async () => {
    const usuarioId = await usuarioAtual()
    const fila = usuarioId ? await lerJSON(chaveFila(usuarioId), []) : []

    try {
        const [contas, fechamento] = await Promise.all([
            supabase
                .from('contas')
                .select('*')
                .order('data_cadastro')
                .order('criado_em'),
            supabase
                .from('fechamentos')
                .select('mes, saldo')
                .order('mes', { ascending: false })
                .limit(1)
                .maybeSingle()
        ])
        if (contas.error) throw contas.error
        if (fechamento.error) throw fechamento.error
        return {
            contas: aplicarFila(contas.data.map(paraConta), fila, paraConta),
            fechamento: fechamento.data && { mes: fechamento.data.mes, saldo: Number(fechamento.data.saldo) },
            fila,
            semConexao: false
        }
    } catch (error) {
        // Sem internet: abre com a cópia guardada no aparelho (ela já inclui o que está na fila).
        const copia = usuarioId && ehErroConexao(error) ? await lerJSON(chaveCopia(usuarioId)) : null
        if (!copia) throw error
        return { contas: copia.contas, fechamento: copia.fechamento, fila, semConexao: true }
    }
})

// Envia a fila na ordem. Para na primeira falta de conexão (tenta de novo depois); outros erros
// (ex.: a movimentação foi apagada em outro aparelho) descartam a operação e são informados.
export const sincronizarFila = createAsyncThunk('extrato/sincronizarFila', async (_, { getState, dispatch }) => {
    const falhas = []
    let semConexao = false

    while (getState().extrato.fila.length > 0) {
        const operacao = getState().extrato.fila[0]
        try {
            const resultado = await enviarOperacao(operacao)
            dispatch(operacaoEnviada({ operacao, resultado }))
        } catch (error) {
            if (ehErroConexao(error)) {
                semConexao = true
                break
            }
            falhas.push(`Não foi possível ${descreverOperacao(operacao, getState().extrato.contasExtrato)}: ${mensagemErro(error)}`)
            dispatch(operacaoDescartada(operacao))
        }
        await gravarFila(getState)
    }

    // Com falhas, ou se o app abriu com a cópia do aparelho, busca o estado atual do servidor.
    if (!semConexao && (falhas.length > 0 || getState().extrato.semConexao)) {
        await dispatch(carregarContas({ silencioso: true }))
    }
    return { falhas }
}, {
    condition: (_, { getState }) => {
        const { fila, sincronizando } = getState().extrato
        return fila.length > 0 && !sincronizando
    }
})

export const quitarMesesAnteriores = createAsyncThunk('extrato/quitarMesesAnteriores', async (mesAtual, { getState, dispatch }) => {
    // O fechamento grava parcelas no servidor a partir dos dados da tela: precisa de tudo já enviado.
    if (getState().extrato.fila.length > 0) {
        throw new Error('Ainda há alterações feitas sem internet aguardando envio. Assim que a conexão voltar elas serão enviadas; depois disso você pode quitar o mês.')
    }

    const { contasExtrato, fechamento } = getState().extrato
    const meses = mesesParaFechar(contasExtrato, fechamento, mesAtual)
    const { fechamentos, alteradas } = simularFechamento(contasExtrato, fechamento, meses)

    const { error } = await supabase
        .from('fechamentos')
        .insert(fechamentos)
    if (error) {
        dispatch(carregarContas())
        if (error.code === '23505') throw new Error('Este mês já foi fechado em outro aparelho. Os dados foram atualizados.')
        throw error
    }

    const resultados = await Promise.all(alteradas.map((conta) => supabase
        .from('contas')
        .update({ parcela_paga: conta.parcelaPaga, data_vencimento: conta.dataVencimento || null })
        .eq('id', conta.id)))
    if (resultados.some((resultado) => resultado.error)) {
        dispatch(carregarContas())
        throw new Error('O mês foi fechado, mas algumas parcelas não foram atualizadas. Confira na aba Parcelas.')
    }

    return { fechamento: fechamentos[fechamentos.length - 1], alteradas }
})

export const adicionarConta = createAsyncThunk('extrato/adicionarConta', async (conta, api) => {
    const linha = paraLinha(conta)
    const contaId = criarIdLocal()
    const { enviado, resultado } = await enviarOuEnfileirar(api, novaOperacao({ tipo: 'adicionar', contaId, linha }))
    return enviado ? resultado : paraConta({ ...linha, id: contaId, parcela_paga: 0 })
})

export const editarConta = createAsyncThunk('extrato/editarConta', async ({ id, ...conta }, api) => {
    const contaId = resolverId(api.getState(), id)
    const linha = paraLinha(conta)
    const atual = api.getState().extrato.contasExtrato.find((item) => item.id === contaId)
    const { enviado, resultado } = await enviarOuEnfileirar(api, novaOperacao({ tipo: 'editar', contaId, linha }))
    return enviado ? resultado : paraConta({ ...linha, id: contaId, parcela_paga: atual?.parcelaPaga ?? 0 })
})

export const removerConta = createAsyncThunk('extrato/removerConta', async (conta, api) => {
    const contaId = resolverId(api.getState(), conta.id)
    await enviarOuEnfileirar(api, novaOperacao({ tipo: 'remover', contaId }))
    return contaId
})

// O vencimento acompanha as parcelas pagas: avança um mês a cada parcela paga e volta ao desfazer.
export const alterarParcelaPaga = createAsyncThunk('extrato/alterarParcelaPaga', async ({ id, parcelaPaga }, api) => {
    const contaId = resolverId(api.getState(), id)
    const conta = api.getState().extrato.contasExtrato.find((item) => item.id === contaId)
    const diferenca = parcelaPaga - (conta.parcelaPaga || 0)
    const dataVencimento = conta.dataVencimento ? deslocarData(conta.dataVencimento, diferenca) : ''

    await enviarOuEnfileirar(api, novaOperacao({ tipo: 'parcela', contaId, parcelaPaga, dataVencimento }))
    return { id: contaId, parcelaPaga, dataVencimento }
})

const estadoInicial = {
    contasExtrato: [],
    fechamento: null,
    carregando: false,
    // Já houve uma carga bem-sucedida (do servidor ou da cópia): só então a cópia local é atualizada.
    carregado: false,
    erro: null,
    // Alterações aguardando envio, na ordem em que foram feitas.
    fila: [],
    sincronizando: false,
    // Dados abertos a partir da cópia do aparelho, por falta de internet.
    semConexao: false,
    // Id local → id definitivo das movimentações criadas sem internet e já enviadas.
    idsSincronizados: {},
    falhasEnvio: []
}

function registrarErro(state, action) {
    state.carregando = false
    state.erro = mensagemErro(action.error)
}

const extrato = createSlice({
    name: 'extrato',
    initialState: estadoInicial,
    reducers: {
        limparExtrato() {
            return estadoInicial
        },
        limparErro(state) {
            state.erro = null
        },
        limparFalhasEnvio(state) {
            state.falhasEnvio = []
        },
        operacaoEnfileirada(state, action) {
            state.fila = enfileirar(state.fila, action.payload)
        },
        operacaoEnviada(state, action) {
            const { operacao, resultado } = action.payload
            state.fila = state.fila.filter((item) => item.id !== operacao.id)
            if (operacao.tipo === 'adicionar') {
                state.idsSincronizados[operacao.contaId] = resultado.id
                state.fila = trocarIdNaFila(state.fila, operacao.contaId, resultado.id)
                const conta = state.contasExtrato.find((item) => item.id === operacao.contaId)
                if (conta) conta.id = resultado.id
            }
        },
        operacaoDescartada(state, action) {
            state.fila = state.fila.filter((item) => item.id !== action.payload.id)
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(carregarContas.pending, (state, action) => {
                if (!action.meta.arg?.silencioso) state.carregando = true
                state.erro = null
            })
            .addCase(carregarContas.fulfilled, (state, action) => {
                state.carregando = false
                state.carregado = true
                state.contasExtrato = action.payload.contas
                state.fechamento = action.payload.fechamento
                state.fila = action.payload.fila
                state.semConexao = action.payload.semConexao
            })
            .addCase(sincronizarFila.pending, (state) => {
                state.sincronizando = true
            })
            .addCase(sincronizarFila.fulfilled, (state, action) => {
                state.sincronizando = false
                state.falhasEnvio.push(...action.payload.falhas)
            })
            .addCase(sincronizarFila.rejected, (state) => {
                state.sincronizando = false
            })
            .addCase(quitarMesesAnteriores.fulfilled, (state, action) => {
                state.fechamento = action.payload.fechamento
                action.payload.alteradas.forEach(({ id, parcelaPaga, dataVencimento }) => {
                    const conta = state.contasExtrato.find((item) => item.id === id)
                    if (conta) {
                        conta.parcelaPaga = parcelaPaga
                        conta.dataVencimento = dataVencimento
                    }
                })
            })
            .addCase(adicionarConta.fulfilled, (state, action) => {
                state.contasExtrato.push(action.payload)
                state.contasExtrato.sort((a, b) => a.dataCadastro.localeCompare(b.dataCadastro))
            })
            .addCase(editarConta.fulfilled, (state, action) => {
                state.contasExtrato = state.contasExtrato.map((conta) => (conta.id === action.payload.id ? action.payload : conta))
                state.contasExtrato.sort((a, b) => a.dataCadastro.localeCompare(b.dataCadastro))
            })
            .addCase(removerConta.fulfilled, (state, action) => {
                state.contasExtrato = state.contasExtrato.filter((conta) => conta.id !== action.payload)
            })
            .addCase(alterarParcelaPaga.fulfilled, (state, action) => {
                const contaSelecionada = state.contasExtrato.find((conta) => conta.id === action.payload.id)
                if (contaSelecionada) {
                    contaSelecionada.parcelaPaga = action.payload.parcelaPaga
                    contaSelecionada.dataVencimento = action.payload.dataVencimento
                }
            })
            .addCase(editarCartao.fulfilled, (state, action) => {
                const { cartao, contasRenomeadas } = action.payload
                state.contasExtrato
                    .filter((conta) => contasRenomeadas.includes(conta.id))
                    .forEach((conta) => { conta.cartao = cartao.nome })
            })
            .addMatcher(
                (action) => action.type.startsWith('extrato/') && action.type.endsWith('/rejected'),
                registrarErro
            )
    }
})

const { operacaoEnfileirada, operacaoEnviada, operacaoDescartada } = extrato.actions
export const { limparExtrato, limparErro, limparFalhasEnvio } = extrato.actions
export default extrato.reducer
