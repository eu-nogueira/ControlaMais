import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import supabase from "../services/supabase";
import { mesmoCartao } from "../utils/cartoes";

function paraCartao(linha) {
    return {
        id: linha.id,
        nome: linha.nome,
        final: linha.final ?? '',
        limite: Number(linha.limite),
        diaVencimento: linha.dia_vencimento ?? '',
        cor: linha.cor ?? ''
    }
}

function paraLinha(cartao) {
    return {
        nome: cartao.nome.trim(),
        final: cartao.final || null,
        limite: cartao.limite,
        dia_vencimento: Number(cartao.diaVencimento) || null,
        cor: cartao.cor || null
    }
}

function traduzirErro(error) {
    if (error.code === '23505') return new Error('Já existe um cartão com esse nome.')
    return error
}

export const carregarCartoes = createAsyncThunk('cartoes/carregarCartoes', async () => {
    const { data, error } = await supabase
        .from('cartoes')
        .select('*')
        .order('nome')
    if (error) throw error
    return data.map(paraCartao)
})

export const adicionarCartao = createAsyncThunk('cartoes/adicionarCartao', async (cartao) => {
    const { data, error } = await supabase
        .from('cartoes')
        .insert(paraLinha(cartao))
        .select()
        .single()
    if (error) throw traduzirErro(error)
    return paraCartao(data)
})

// Ao renomear, os gastos registrados com o nome anterior passam a usar o novo,
// para continuarem consumindo o limite deste cartão.
export const editarCartao = createAsyncThunk('cartoes/editarCartao', async ({ id, nomeAnterior, ...cartao }, { getState }) => {
    const { data, error } = await supabase
        .from('cartoes')
        .update(paraLinha(cartao))
        .eq('id', id)
        .select()
        .single()
    if (error) throw traduzirErro(error)

    const nome = data.nome
    const contasRenomeadas = nomeAnterior === nome
        ? []
        : getState().extrato.contasExtrato
            .filter((conta) => conta.tipoConta === 'Despesa' && mesmoCartao(conta.cartao, nomeAnterior))
            .map((conta) => conta.id)

    if (contasRenomeadas.length > 0) {
        const { error: erroContas } = await supabase
            .from('contas')
            .update({ cartao: nome })
            .in('id', contasRenomeadas)
        if (erroContas) throw new Error('O cartão foi salvo, mas os gastos com o nome anterior não foram atualizados.')
    }

    return { cartao: paraCartao(data), contasRenomeadas }
})

export const removerCartao = createAsyncThunk('cartoes/removerCartao', async (id) => {
    const { error } = await supabase
        .from('cartoes')
        .delete()
        .eq('id', id)
    if (error) throw error
    return id
})

const estadoInicial = {
    lista: [],
    erro: null
}

function registrarErro(state, action) {
    state.erro = action.error.message
}

const cartoes = createSlice({
    name: 'cartoes',
    initialState: estadoInicial,
    reducers: {
        limparCartoes() {
            return estadoInicial
        },
        limparErroCartoes(state) {
            state.erro = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(carregarCartoes.pending, (state) => {
                state.erro = null
            })
            .addCase(carregarCartoes.fulfilled, (state, action) => {
                state.lista = action.payload
            })
            .addCase(adicionarCartao.fulfilled, (state, action) => {
                state.lista.push(action.payload)
                state.lista.sort((a, b) => a.nome.localeCompare(b.nome))
            })
            .addCase(editarCartao.fulfilled, (state, action) => {
                state.lista = state.lista
                    .map((cartao) => (cartao.id === action.payload.cartao.id ? action.payload.cartao : cartao))
                    .sort((a, b) => a.nome.localeCompare(b.nome))
            })
            .addCase(removerCartao.fulfilled, (state, action) => {
                state.lista = state.lista.filter((cartao) => cartao.id !== action.payload)
            })
            .addCase(carregarCartoes.rejected, registrarErro)
            .addCase(removerCartao.rejected, registrarErro)
    }
})

export const { limparCartoes, limparErroCartoes } = cartoes.actions
export default cartoes.reducer
