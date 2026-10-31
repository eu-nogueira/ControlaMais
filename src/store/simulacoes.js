import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import supabase from "../services/supabase";

// Simulações salvas ficam em tabela própria e nunca alteram as movimentações reais.
function paraSimulacao(linha) {
    return {
        id: linha.id,
        nome: linha.nome,
        entrada: linha.entrada,
        resumo: linha.resultado,
        criadoEm: linha.criado_em,
        atualizadoEm: linha.atualizado_em
    }
}

export const carregarSimulacoes = createAsyncThunk('simulacoes/carregarSimulacoes', async () => {
    const { data, error } = await supabase
        .from('simulacoes')
        .select('*')
        .order('criado_em', { ascending: false })
    if (error) throw error
    return data.map(paraSimulacao)
})

// Sem id cria uma nova; com id atualiza a existente.
export const salvarSimulacao = createAsyncThunk('simulacoes/salvarSimulacao', async ({ id, nome, entrada, resumo }) => {
    const linha = { nome: nome.trim(), entrada, resultado: resumo }
    const consulta = id
        ? supabase.from('simulacoes').update({ ...linha, atualizado_em: new Date().toISOString() }).eq('id', id)
        : supabase.from('simulacoes').insert(linha)
    const { data, error } = await consulta.select().single()
    if (error) throw error
    return paraSimulacao(data)
})

export const removerSimulacao = createAsyncThunk('simulacoes/removerSimulacao', async (id) => {
    const { error } = await supabase
        .from('simulacoes')
        .delete()
        .eq('id', id)
    if (error) throw error
    return id
})

const estadoInicial = {
    lista: [],
    carregado: false,
    carregando: false,
    erro: null
}

const simulacoes = createSlice({
    name: 'simulacoes',
    initialState: estadoInicial,
    reducers: {
        limparSimulacoes() {
            return estadoInicial
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(carregarSimulacoes.pending, (state) => {
                state.carregando = true
                state.erro = null
            })
            .addCase(carregarSimulacoes.fulfilled, (state, action) => {
                state.lista = action.payload
                state.carregado = true
                state.carregando = false
            })
            .addCase(carregarSimulacoes.rejected, (state, action) => {
                state.carregando = false
                state.erro = action.error.message
            })
            .addCase(salvarSimulacao.fulfilled, (state, action) => {
                state.lista = [action.payload, ...state.lista.filter((simulacao) => simulacao.id !== action.payload.id)]
                    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
            })
            .addCase(removerSimulacao.fulfilled, (state, action) => {
                state.lista = state.lista.filter((simulacao) => simulacao.id !== action.payload)
            })
            .addCase(removerSimulacao.rejected, (state, action) => {
                state.erro = action.error.message
            })
    }
})

export const { limparSimulacoes } = simulacoes.actions
export default simulacoes.reducer
