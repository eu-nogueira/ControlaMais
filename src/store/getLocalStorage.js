
function getLocalStorage(key) {
    return window.JSON.parse(localStorage.getItem(key))
}

export default getLocalStorage