// Regras comuns de parcelamentos e contas fixas.
// Conta fixa é uma despesa recorrente sem número máximo de parcelas (ex.: aluguel):
// é cobrada todo mês, como uma parcela, mas nunca termina e não tem valor total.

export const ehContaFixa = (conta) => conta.tipoConta === 'Despesa' && Boolean(conta.contaFixa)

// Infinity para conta fixa; 1 para despesas à vista e receitas.
export function totalParcelasDe(conta) {
  if (ehContaFixa(conta)) return Infinity
  return conta.tipoConta === 'Despesa' ? Number(conta.parcela) || 1 : 1
}

// Parcelamentos e contas fixas: despesas cobradas mês a mês.
export const ehParcelado = (conta) => totalParcelasDe(conta) > 1

export const parcelasRestantes = (conta) => totalParcelasDe(conta) - (conta.parcelaPaga || 0)

export const estaQuitado = (conta) => parcelasRestantes(conta) <= 0
