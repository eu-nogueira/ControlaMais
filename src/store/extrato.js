import { createSlice } from "@reduxjs/toolkit";

const extrato = createSlice({
    name: 'extrato',
    initialState: [],
    reducers: {
        adicionarConta(state, action) {
            state.push(action.payload)
        },
        removerConta(state, payload) {

        }
    }
})

export const { adicionarConta, removerConta } = extrato.actions
export default extrato.reducer