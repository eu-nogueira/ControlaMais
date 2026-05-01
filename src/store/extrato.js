import { createSlice } from "@reduxjs/toolkit";
import toLocalStorage from "./toLocalStorage";
import getLocalStorage from "./getLocalStorage";

const extrato = createSlice({
    name: 'extrato',
        initialState: getLocalStorage('extrato') || {
                contasExtrato: [],
                saldoTotal: 0,
                despesaMes: 0
            },
    reducers: {
        adicionarConta: {
            reducer (state, action) {
            state.contasExtrato.push(action.payload)
            if(action.payload.tipoConta === 'Receita') {
                state.saldoTotal += Number(action.payload.valor)
            } else {
                state.saldoTotal -= Number(action.payload.valor)
                state.despesaMes -= Number(action.payload.valor)
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