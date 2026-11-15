import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { deveLembrar } from './armazenamentoSessao'

// Dados guardados no aparelho para o app funcionar sem internet (cópia das movimentações e fila de envio).
// Segue a mesma regra da sessão: com "lembrar de mim", ficam no armazenamento persistente (Preferences no
// APK, localStorage no site); sem ela, só enquanto o app ou a aba estiverem abertos.

const nativo = Capacitor.isNativePlatform()
const memoria = new Map()

export const chaveDoUsuario = (nome, usuarioId) => `controlamais-${nome}:${usuarioId}`

async function lerTexto(chave) {
  if (!deveLembrar()) {
    if (nativo) return memoria.get(chave) ?? null
    try {
      return window.sessionStorage.getItem(chave)
    } catch {
      return memoria.get(chave) ?? null
    }
  }
  if (nativo) return (await Preferences.get({ key: chave })).value
  try {
    return window.localStorage.getItem(chave)
  } catch {
    return memoria.get(chave) ?? null
  }
}

async function gravarTexto(chave, valor) {
  if (!deveLembrar()) {
    if (nativo) {
      memoria.set(chave, valor)
      return
    }
    try {
      window.sessionStorage.setItem(chave, valor)
    } catch {
      memoria.set(chave, valor)
    }
    return
  }
  if (nativo) {
    await Preferences.set({ key: chave, value: valor })
    return
  }
  try {
    window.localStorage.setItem(chave, valor)
  } catch {
    // Armazenamento cheio ou bloqueado: mantém só enquanto o app estiver aberto.
    memoria.set(chave, valor)
  }
}

export async function lerJSON(chave, padrao = null) {
  try {
    const texto = await lerTexto(chave)
    return texto ? JSON.parse(texto) : padrao
  } catch {
    return padrao
  }
}

export async function gravarJSON(chave, valor) {
  try {
    await gravarTexto(chave, JSON.stringify(valor))
  } catch {
    // Falha ao gravar não deve interromper o uso do app.
  }
}
