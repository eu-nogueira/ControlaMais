import { createSlice } from "@reduxjs/toolkit";

const extrato = createSlice({
    name: 'extrato',
    initialState: {
        contasExtrato: [],
        saldoTotal: 0,
        despesaMes: 0
    },
    reducers: {
        adicionarConta(state, action) {
            state.contasExtrato.push(action.payload)
            console.log(action.payload)
            if(action.payload.tipoConta === 'Receita') {
                state.saldoTotal += Number(action.payload.valor)
            } else {
                state.saldoTotal -= Number(action.payload.valor)
                state.despesaMes -= Number(action.payload.valor)
            }
        },
        removerConta(state, payload) {

        }
    }
})

export const { adicionarConta, removerConta } = extrato.actions
export default extrato.reducer