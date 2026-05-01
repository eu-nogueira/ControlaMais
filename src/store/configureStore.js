import { configureStore } from "@reduxjs/toolkit";
import extrato from "./extrato";
import localStorage from "./localStorage";


const store = configureStore({
    reducer: {extrato},
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(localStorage)
})

export default store