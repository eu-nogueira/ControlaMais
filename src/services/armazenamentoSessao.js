import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const CHAVE_LEMBRAR = 'controlamais-lembrar'
const CHAVE_EMAIL = 'controlamais-email'
const nativo = Capacitor.isNativePlatform()
const memoria = new Map()

function lerLocal(chave) {
  try {
    return window.localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravarLocal(chave, valor) {
  try {
    if (valor === null) window.localStorage.removeItem(chave)
    else window.localStorage.setItem(chave, valor)
  } catch {
    // Navegação privada pode bloquear o armazenamento local.
  }
}

export function deveLembrar() {
  return lerLocal(CHAVE_LEMBRAR) !== 'nao'
}

export function definirLembrar(lembrar, email) {
  gravarLocal(CHAVE_LEMBRAR, lembrar ? 'sim' : 'nao')
  gravarLocal(CHAVE_EMAIL, lembrar ? email : null)
}

export function emailLembrado() {
  return lerLocal(CHAVE_EMAIL) || ''
}

// Com "lembrar de mim", a sessão fica no armazenamento persistente (Preferences no
// APK, localStorage no site). Sem ela, some ao fechar o app ou o navegador.
const armazenamentoSessao = {
  async getItem(chave) {
    if (memoria.has(chave)) return memoria.get(chave)
    if (nativo) return (await Preferences.get({ key: chave })).value ?? lerLocal(chave)
    try {
      return window.sessionStorage.getItem(chave) ?? window.localStorage.getItem(chave)
    } catch {
      return null
    }
  },

  async setItem(chave, valor) {
    await this.removeItem(chave)
    if (!deveLembrar()) {
      if (nativo) memoria.set(chave, valor)
      else window.sessionStorage.setItem(chave, valor)
      return
    }
    if (nativo) await Preferences.set({ key: chave, value: valor })
    else window.localStorage.setItem(chave, valor)
  },

  async removeItem(chave) {
    memoria.delete(chave)
    if (nativo) {
      await Preferences.remove({ key: chave })
      return
    }
    try {
      window.sessionStorage.removeItem(chave)
      window.localStorage.removeItem(chave)
    } catch {
      // Navegação privada pode bloquear o armazenamento local.
    }
  },
}

export default armazenamentoSessao
