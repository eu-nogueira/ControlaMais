import { configureStore } from "@reduxjs/toolkit";
import extrato from "./extrato";


const store = configureStore({
    reducer: {extrato}
})

export default store