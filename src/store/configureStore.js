import { configureStore } from "@reduxjs/toolkit";
import extrato from "./extrato";
import cartoes from "./cartoes";
import simulacoes from "./simulacoes";
import metas from "./metas";


const store = configureStore({
    reducer: {extrato, cartoes, simulacoes, metas}
})

export default store
