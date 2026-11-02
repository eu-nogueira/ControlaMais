import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import supabase from "../services/supabase";
import { mensagemErro } from '../services/erros'

// Metas e reservas ficam em tabelas próprias e nunca alteram as movimentações nem o saldo.
function paraMovimento(linha) {
    return {
        id: linha.id,
        metaId: linha.meta_id,
        valor: Number(linha.valor),
        data: linha.data,
        mesReferencia: linha.mes_referencia ?? null,
        criadoEm: linha.criado_em
    }
}

const numeroOuNulo = (valor) => (valor === null || valor === undefined ? null : Number(valor))

function paraMeta(linha, movimentos = []) {
    return {
        id: linha.id,
        nome: linha.nome,
        tipo: linha.tipo,
        valorAlvo: numeroOuNulo(linha.valor_alvo),
        prazo: linha.prazo ?? '',
        valorInicial: numeroOuNulo(linha.valor_inicial),
        incremento: numeroOuNulo(linha.incremento),
        duracao: linha.duracao ?? null,
        inicio: linha.inicio ?? '',
        status: linha.status ?? 'ativa',
        pausadaEm: linha.pausada_em ?? '',
        criadoEm: linha.criado_em,
        movimentos
    }
}

// Cada tipo grava só os próprios campos; os demais ficam nulos.
function paraLinha(meta) {
    const dinamica = meta.tipo === 'dinamica'
    return {
        nome: meta.nome.trim(),
        tipo: meta.tipo,
        valor_alvo: dinamica ? null : meta.valorAlvo || null,
        prazo: meta.tipo === 'meta' ? meta.prazo || null : null,
        valor_inicial: dinamica ? meta.valorInicial : null,
        incremento: dinamica ? meta.incremento : null,
        duracao: dinamica ? meta.duracao : null,
        inicio: dinamica ? meta.inicio : null
    }
}

const ordenarMovimentos = (movimentos) => movimentos
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))

export const carregarMetas = createAsyncThunk('metas/carregarMetas', async () => {
    const [metas, movimentos] = await Promise.all([
        supabase
            .from('metas')
            .select('*')
            .order('criado_em'),
        supabase
            .from('metas_movimentos')
            .select('*')
    ])
    if (metas.error) throw metas.error
    if (movimentos.error) throw movimentos.error

    const lista = movimentos.data.map(paraMovimento)
    return metas.data.map((linha) => paraMeta(linha, ordenarMovimentos(lista.filter((movimento) => movimento.metaId === linha.id))))
})

// Sem id cria uma nova; com id atualiza a existente.
export const salvarMeta = createAsyncThunk('metas/salvarMeta', async ({ id, ...meta }) => {
    const consulta = id
        ? supabase.from('metas').update(paraLinha(meta)).eq('id', id)
        : supabase.from('metas').insert(paraLinha(meta))
    const { data, error } = await consulta.select().single()
    if (error) throw error
    return paraMeta(data)
})

export const removerMeta = createAsyncThunk('metas/removerMeta', async (id) => {
    const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', id)
    if (error) throw error
    return id
})

// Pausar, retomar, encerrar ou reativar. Ao retomar, o início avança os meses em que a meta ficou
// pausada, para os depósitos pendentes não ficarem atrasados.
export const alterarStatusMeta = createAsyncThunk('metas/alterarStatusMeta', async ({ id, status, pausadaEm, inicio }) => {
    const { data, error } = await supabase
        .from('metas')
        .update({ status, pausada_em: pausadaEm || null, ...(inicio && { inicio }) })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return paraMeta(data)
})

// Valor positivo guarda dinheiro; negativo resgata.
// mesReferencia: número do mês do plano de uma meta dinâmica (um depósito por mês).
export const registrarMovimento = createAsyncThunk('metas/registrarMovimento', async ({ metaId, valor, data, mesReferencia = null }) => {
    const { data: linha, error } = await supabase
        .from('metas_movimentos')
        .insert({ meta_id: metaId, valor, data, mes_referencia: mesReferencia })
        .select()
        .single()
    if (error) {
        if (error.code === '23505') throw new Error('Este mês já tem um depósito registrado. Os dados foram atualizados em outro aparelho?')
        throw error
    }
    return paraMovimento(linha)
})

export const removerMovimento = createAsyncThunk('metas/removerMovimento', async (movimento) => {
    const { error } = await supabase
        .from('metas_movimentos')
        .delete()
        .eq('id', movimento.id)
    if (error) throw error
    return movimento
})

// recalculoDispensado: metas fora do prazo em que o usuário respondeu "Agora não" (vale até sair do app).
const estadoInicial = {
    lista: [],
    recalculoDispensado: [],
    carregado: false,
    carregando: false,
    erro: null
}

const metas = createSlice({
    name: 'metas',
    initialState: estadoInicial,
    reducers: {
        limparMetas() {
            return estadoInicial
        },
        dispensarRecalculo(state, action) {
            state.recalculoDispensado.push(action.payload)
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(carregarMetas.pending, (state) => {
                state.carregando = true
                state.erro = null
            })
            .addCase(carregarMetas.fulfilled, (state, action) => {
                state.lista = action.payload
                state.carregado = true
                state.carregando = false
            })
            .addCase(carregarMetas.rejected, (state, action) => {
                state.carregando = false
                state.erro = mensagemErro(action.error)
            })
            .addCase(alterarStatusMeta.fulfilled, (state, action) => {
                const existente = state.lista.find((meta) => meta.id === action.payload.id)
                if (existente) Object.assign(existente, { ...action.payload, movimentos: existente.movimentos })
            })
            .addCase(salvarMeta.fulfilled, (state, action) => {
                const existente = state.lista.find((meta) => meta.id === action.payload.id)
                if (existente) {
                    Object.assign(existente, { ...action.payload, movimentos: existente.movimentos })
                } else {
                    state.lista.push(action.payload)
                }
            })
            .addCase(removerMeta.fulfilled, (state, action) => {
                state.lista = state.lista.filter((meta) => meta.id !== action.payload)
            })
            .addCase(registrarMovimento.fulfilled, (state, action) => {
                const meta = state.lista.find((item) => item.id === action.payload.metaId)
                if (meta) {
                    meta.movimentos.push(action.payload)
                    ordenarMovimentos(meta.movimentos)
                }
            })
            .addCase(removerMovimento.fulfilled, (state, action) => {
                const meta = state.lista.find((item) => item.id === action.payload.metaId)
                if (meta) meta.movimentos = meta.movimentos.filter((movimento) => movimento.id !== action.payload.id)
            })
    }
})

export const { limparMetas, dispensarRecalculo } = metas.actions
export default metas.reducer
