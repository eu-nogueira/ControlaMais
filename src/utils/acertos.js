import { estaQuitado, totalParcelasDe } from './parcelas'
import { mesDoSaldo } from './saldo'
import { mesesEntre } from './mes'

// Mesma pessoa escrita de jeitos diferentes ("Nagano Store", "nagano store", "Nagano  Store ")
// tem a mesma chave: sem acentos, minúsculas e espaços extras.
export const chaveDaPessoa = (nome) => (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ')

// Entre as grafias de um mesmo nome, prefere a mais caprichada: com acentos e iniciais maiúsculas.
function capricho(nome) {
  const acentos = nome.normalize('NFD').length - nome.length
  const iniciais = nome.split(' ').filter((palavra) => /^\p{Lu}/u.test(palavra)).length
  return acentos + iniciais
}

const limparNome = (nome) => (nome || '').trim().replace(/\s+/g, ' ')

// Uma grafia por pessoa, entre os nomes usados nos acertos.
export function nomesDasPessoas(contas) {
  const porChave = new Map()
  contas.flatMap((conta) => [conta.anotarPara, conta.responsavel]).map(limparNome).filter(Boolean).forEach((nome) => {
    const atual = porChave.get(chaveDaPessoa(nome))
    if (!atual || capricho(nome) > capricho(atual)) porChave.set(chaveDaPessoa(nome), nome)
  })
  return [...porChave.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Usa a grafia já cadastrada quando o nome é a mesma pessoa; senão, só tira os espaços extras.
export function unificarNome(nome, contas) {
  const limpo = limparNome(nome)
  return nomesDasPessoas(contas).find((conhecido) => chaveDaPessoa(conhecido) === chaveDaPessoa(limpo)) ?? limpo
}

export const mesmaPessoa = (nomeA, nomeB) => Boolean(chaveDaPessoa(nomeA)) && chaveDaPessoa(nomeA) === chaveDaPessoa(nomeB)

// Despesas lançadas para ou por outra pessoa.
export function ehContaEntrePessoas(conta) {
  return conta.tipoConta === 'Despesa' && Boolean(conta.selected ? conta.anotarPara : conta.responsavel)
}

// A despesa entra no seu mês de referência (o do saldo de onde saiu). Parcelados e contas fixas também
// entram, com o valor da parcela, em cada mês seguinte do parcelamento enquanto não forem quitados.
export function entraNoMes(conta, mes) {
  const deslocamento = mesesEntre(mesDoSaldo(conta), mes)
  if (deslocamento === 0) return true
  return !estaQuitado(conta) && deslocamento > 0 && deslocamento < totalParcelasDe(conta)
}

// "euDevo" = eu pago e anotei para a pessoa; "meDevem" = a pessoa paga a despesa por mim.
// Recebe as contas já filtradas pelo mês e devolve os totais por pessoa, do maior para o menor.
// Grafias diferentes do mesmo nome somam juntas, exibidas com a grafia mais caprichada.
export function resumirAcertos(contasDoMes) {
  const euDevo = new Map()
  const meDevem = new Map()

  contasDoMes.filter(ehContaEntrePessoas).forEach((conta) => {
    const nome = limparNome(conta.selected ? conta.anotarPara : conta.responsavel)
    const grupo = conta.selected ? euDevo : meDevem
    const atual = grupo.get(chaveDaPessoa(nome)) ?? { pessoa: nome, valor: 0 }
    if (capricho(nome) > capricho(atual.pessoa)) atual.pessoa = nome
    atual.valor += Number(conta.valorFormatado || 0)
    grupo.set(chaveDaPessoa(nome), atual)
  })

  const ordenar = (grupo) => [...grupo.values()].sort((a, b) => b.valor - a.valor)
  return { euDevo: ordenar(euDevo), meDevem: ordenar(meDevem) }
}
