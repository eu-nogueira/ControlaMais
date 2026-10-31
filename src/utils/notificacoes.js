import { diasEntre } from './mes'
import { ehParcelado, parcelasRestantes } from './parcelas'

export const DIAS_AVISO = 3

// Parcelas (e contas fixas) em aberto que vencem em até DIAS_AVISO dias ou já venceram sem serem pagas.
// O id inclui o vencimento: ao pagar a parcela, o vencimento avança e a próxima gera um aviso novo.
export function gerarNotificacoes(contas, hoje) {
  return contas
    .filter((conta) => ehParcelado(conta) && parcelasRestantes(conta) > 0 && conta.dataVencimento)
    .map((conta) => ({ conta, dias: diasEntre(hoje, conta.dataVencimento) }))
    .filter(({ dias }) => dias <= DIAS_AVISO)
    .sort((a, b) => a.dias - b.dias)
    .map(({ conta, dias }) => ({
      id: `${conta.id}:${conta.dataVencimento}`,
      conta,
      dias,
      vencida: dias < 0,
      aReceber: !conta.selected
    }))
}
