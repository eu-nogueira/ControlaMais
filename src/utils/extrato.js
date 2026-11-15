import { formatarDataISO } from './formatar'
import { mesesEntre } from './mes'
import { ehContaFixa, totalParcelasDe } from './parcelas'
import { mesDoSaldo } from './saldo'

// Cada movimentação aparece na data em que foi registrada. Nos meses seguintes, parcelados e contas fixas
// aparecem como repetições, num grupo à parte no fim do mês (sem data inventada, para não ficarem acima
// das compras recentes). A numeração da parcela conta a partir do mês em que as parcelas começam
// (o do saldo de onde saem), que pode ser depois do registro quando o vencimento é distante.
export function itensDoMes(contas, mes) {
  const doMes = []
  const repeticoes = []

  contas.forEach((conta) => {
    const mesRegistro = conta.dataCadastro.slice(0, 7)
    if (mesRegistro === mes) {
      doMes.push({ conta, data: conta.dataCadastro })
      return
    }

    const numero = mesesEntre(mesDoSaldo(conta), mes) + 1
    if (mes > mesRegistro && numero >= 1 && numero <= totalParcelasDe(conta) && totalParcelasDe(conta) > 1) {
      repeticoes.push({ conta, numero })
    }
  })

  return {
    doMes: doMes.sort((a, b) => b.data.localeCompare(a.data)),
    repeticoes: repeticoes.sort((a, b) => b.conta.dataCadastro.localeCompare(a.conta.dataCadastro)),
  }
}

export function detalheRepeticao({ conta, numero }) {
  if (ehContaFixa(conta)) return `Conta fixa · desde ${formatarDataISO(conta.dataCadastro)}`
  return `Parcela ${numero} de ${conta.parcela} · comprada em ${formatarDataISO(conta.dataCadastro)}`
}
