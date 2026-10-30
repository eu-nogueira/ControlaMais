import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import supabase from "../services/supabase";
import { mesesParaFechar, simularFechamento } from "../utils/saldo";

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
        cartao: linha.cartao ?? ''
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
        cartao: conta.cartao
    }
}

export const carregarContas = createAsyncThunk('extrato/carregarContas', async () => {
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
        contas: contas.data.map(paraConta),
        fechamento: fechamento.data && { mes: fechamento.data.mes, saldo: Number(fechamento.data.saldo) }
    }
})

export const quitarMesesAnteriores = createAsyncThunk('extrato/quitarMesesAnteriores', async (mesAtual, { getState, dispatch }) => {
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
        .update({ parcela_paga: conta.parcelaPaga })
        .eq('id', conta.id)))
    if (resultados.some((resultado) => resultado.error)) {
        dispatch(carregarContas())
        throw new Error('O mês foi fechado, mas algumas parcelas não foram atualizadas. Confira na aba Parcelas.')
    }

    return { fechamento: fechamentos[fechamentos.length - 1], alteradas }
})

export const adicionarConta = createAsyncThunk('extrato/adicionarConta', async (conta) => {
    const { data, error } = await supabase
        .from('contas')
        .insert(paraLinha(conta))
        .select()
        .single()
    if (error) throw error
    return paraConta(data)
})

export const removerConta = createAsyncThunk('extrato/removerConta', async (conta) => {
    const { error } = await supabase
        .from('contas')
        .delete()
        .eq('id', conta.id)
    if (error) throw error
    return conta.id
})

export const alterarParcelaPaga = createAsyncThunk('extrato/alterarParcelaPaga', async ({ id, parcelaPaga }) => {
    const { error } = await supabase
        .from('contas')
        .update({ parcela_paga: parcelaPaga })
        .eq('id', id)
    if (error) throw error
    return { id, parcelaPaga }
})

const estadoInicial = {
    contasExtrato: [],
    fechamento: null,
    carregando: false,
    erro: null
}

function registrarErro(state, action) {
    state.carregando = false
    state.erro = action.error.message
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
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(carregarContas.pending, (state) => {
                state.carregando = true
                state.erro = null
            })
            .addCase(carregarContas.fulfilled, (state, action) => {
                state.carregando = false
                state.contasExtrato = action.payload.contas
                state.fechamento = action.payload.fechamento
            })
            .addCase(quitarMesesAnteriores.fulfilled, (state, action) => {
                state.fechamento = action.payload.fechamento
                action.payload.alteradas.forEach(({ id, parcelaPaga }) => {
                    const conta = state.contasExtrato.find((item) => item.id === id)
                    if (conta) conta.parcelaPaga = parcelaPaga
                })
            })
            .addCase(adicionarConta.fulfilled, (state, action) => {
                state.contasExtrato.push(action.payload)
                state.contasExtrato.sort((a, b) => a.dataCadastro.localeCompare(b.dataCadastro))
            })
            .addCase(removerConta.fulfilled, (state, action) => {
                state.contasExtrato = state.contasExtrato.filter((conta) => conta.id !== action.payload)
            })
            .addCase(alterarParcelaPaga.fulfilled, (state, action) => {
                const contaSelecionada = state.contasExtrato.find((conta) => conta.id === action.payload.id)
                if (contaSelecionada) contaSelecionada.parcelaPaga = action.payload.parcelaPaga
            })
            .addMatcher(
                (action) => action.type.startsWith('extrato/') && action.type.endsWith('/rejected'),
                registrarErro
            )
    }
})

export const { limparExtrato, limparErro } = extrato.actions
export default extrato.reducer
