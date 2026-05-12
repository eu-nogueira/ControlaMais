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
            } else if (action.payload.tipoConta === 'Despesa' && action.payload.selected){
                state.saldoTotal -= Number(action.payload.valorFormatado)
                state.despesaMes -= Number(action.payload.valorFormatado)
            }
        }, prepare(payload) {
            return toLocalStorage(payload)
        }
    },
        removerConta: {
          reducer(state, action) {
            const remove = state.contasExtrato.filter((conta) => conta.id !== action.payload.id)
            state.contasExtrato = remove
            if(action.payload.tipoConta === 'Receita') {
                state.saldoTotal -= action.payload.valorFormatado
            } else if (action.payload.tipoConta === 'Despesa' && action.payload.selected) {
                state.saldoTotal += action.payload.valorFormatado
                state.despesaMes += action.payload.valorFormatado
            }
         }, prepare(payload) {
              return toLocalStorage(payload)
         }
        },
        aumentaParcela: {
            reducer(state, action) {
            const contaSelecionada = state.contasExtrato.find((conta) => conta.id === action.payload.id)
            console.log(action.payload)
            contaSelecionada.parcelaPaga = action.payload.parcelaPaga
            }, prepare(payload) {
                return toLocalStorage(payload)
            }
        }
    }
})

export const { adicionarConta, removerConta, aumentaParcela } = extrato.actions
export default extrato.reducer