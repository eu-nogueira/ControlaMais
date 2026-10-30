import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import supabase from "../services/supabase";

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
        anotarPara: linha.anotar_para
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
        anotar_para: conta.anotarPara
    }
}

export const carregarContas = createAsyncThunk('extrato/carregarContas', async () => {
    const { data, error } = await supabase
        .from('contas')
        .select('*')
        .order('data_cadastro')
        .order('criado_em')
    if (error) throw error
    return data.map(paraConta)
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

export const aumentaParcela = createAsyncThunk('extrato/aumentaParcela', async ({ id, parcelaPaga }) => {
    const { error } = await supabase
        .from('contas')
        .update({ parcela_paga: parcelaPaga })
        .eq('id', id)
    if (error) throw error
    return { id, parcelaPaga }
})

const estadoInicial = {
    contasExtrato: [],
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
                state.contasExtrato = action.payload
            })
            .addCase(adicionarConta.fulfilled, (state, action) => {
                state.contasExtrato.push(action.payload)
                state.contasExtrato.sort((a, b) => a.dataCadastro.localeCompare(b.dataCadastro))
            })
            .addCase(removerConta.fulfilled, (state, action) => {
                state.contasExtrato = state.contasExtrato.filter((conta) => conta.id !== action.payload)
            })
            .addCase(aumentaParcela.fulfilled, (state, action) => {
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
