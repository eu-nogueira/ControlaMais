import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { FileTransfer } from '@capacitor/file-transfer'
import { FileOpener } from '@capacitor-community/file-opener'
import supabase from './supabase'

// Atualização do app Android distribuído por APK: as versões ficam na tabela versoes_app
// e os APKs no Storage. No navegador não há o que atualizar.

// Versão mais recente acima da instalada, ou null. É obrigatória se qualquer versão
// ainda não instalada for obrigatória (pular uma versão não dispensa a exigência).
export async function buscarAtualizacao() {
  if (Capacitor.getPlatform() !== 'android') return null

  const { build } = await App.getInfo()
  const { data, error } = await supabase
    .from('versoes_app')
    .select('codigo_versao, nome_versao, url_apk, notas, obrigatoria')
    .gt('codigo_versao', Number(build))
    .order('codigo_versao', { ascending: false })
  if (error) throw error
  if (data.length === 0) return null

  return { ...data[0], obrigatoria: data.some((versao) => versao.obrigatoria) }
}

// Baixa o APK para o cache do app e abre o instalador do Android.
// onProgresso recebe a fração baixada (0 a 1) ou null quando o tamanho é desconhecido.
export async function baixarEInstalar(versao, onProgresso) {
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: `controlamais-${versao.codigo_versao}.apk` })
  const ouvinte = await FileTransfer.addListener('progress', (status) => {
    onProgresso(status.lengthComputable ? status.bytes / status.contentLength : null)
  })

  try {
    const { path } = await FileTransfer.downloadFile({ url: versao.url_apk, path: uri, progress: true })
    await FileOpener.open({ filePath: path ?? uri, contentType: 'application/vnd.android.package-archive' })
  } finally {
    ouvinte.remove()
  }
}

// Site aberto no navegador de um aparelho Android (fora do app instalado).
export function ehNavegadorAndroid() {
  return !Capacitor.isNativePlatform() && /android/i.test(window.navigator.userAgent)
}

// APK mais recente, para oferecer o download a quem usa o site no Android.
export async function buscarApkMaisRecente() {
  if (!ehNavegadorAndroid()) return null

  const { data, error } = await supabase
    .from('versoes_app')
    .select('url_apk')
    .order('codigo_versao', { ascending: false })
    .limit(1)
  if (error) throw error
  return data[0] ?? null
}
