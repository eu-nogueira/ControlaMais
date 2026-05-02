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
                state.saldoTotal += Number(action.payload.valorFormatado)
            } else {
                state.saldoTotal -= Number(action.payload.valorFormatado)
                state.despesaMes -= Number(action.payload.valorFormatado)
            }
        }, prepare(payload) {
            return toLocalStorage(payload)
        }
    },
        removerConta: {
          reducer(state, action) {
            const remove = state.contasExtrato.filter((contas) => contas.descricao !== action.payload.descricao)
            state.contasExtrato = remove
            if(action.payload.tipoConta === 'Receita') {
                state.saldoTotal -= action.payload.valorFormatado
            } else {
                state.saldoTotal += action.payload.valorFormatado
                state.despesaMes += action.payload.valorFormatado
            }
         }, prepare(payload) {
              return toLocalStorage(payload)
         }
        }
    }
})

export const { adicionarConta, removerConta } = extrato.actions
export default extrato.reducer