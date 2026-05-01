
function toLocalStorage(payload) {
        return {
            payload,
            meta: { 
                localStorage: {
                    key: 'extrato'
                }
            }
        }
}

export default toLocalStorage