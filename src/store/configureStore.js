import { configureStore } from "@reduxjs/toolkit";
import extrato from "./extrato";
import cartoes from "./cartoes";
import simulacoes from "./simulacoes";


const store = configureStore({
    reducer: {extrato, cartoes, simulacoes}
})

export default store
