import { createSlice } from "@reduxjs/toolkit";
import toLocalStorage from "./toLocalStorage";
import getLocalStorage from "./getLocalStorage";

const extrato = createSlice({
    name: 'extrato',
        initialState: {
            data: getLocalStorage('extrato') || {
                contasExtrato: [],
                saldoTotal: 0,
                despesaMes: 0
            },
        },
    reducers: {
        adicionarConta: {
            reducer (state, action) {
            state.data.contasExtrato.push(action.payload)
            if(action.payload.tipoConta === 'Receita') {
                state.data.saldoTotal += Number(action.payload.valor)
            } else {
                state.data.saldoTotal -= Number(action.payload.valor)
                state.data.despesaMes -= Number(action.payload.valor)
            }
        }, prepare(payload) {
            return toLocalStorage(payload)
        }
    },
        removerConta(state, payload) {

        }
    }
})

export const { adicionarConta, removerConta } = extrato.actions
export default extrato.reducer