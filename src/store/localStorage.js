
const localStorage = (store) => (next) => (action) => {
    const response = next(action)
    const { meta } = action
    const state = store.getState().extrato.data
    if(meta && meta.localStorage) {
        const { key } = meta.localStorage
        window.localStorage.setItem(key, JSON.stringify(state))
    }
    return response
}

export default localStorage