// Simulação de empréstimo: tudo aqui é cálculo puro sobre os dados carregados.
// Nada é gravado; as movimentações reais nunca são alteradas.
import { calcularPeriodo } from './saldo'
import { deslocarMes, formatarMes } from './mes'
import { ehContaFixa, ehParcelado, parcelasRestantes } from './parcelas'
import { lerValor } from './formatar'

export const MESES_ANALISE = 12
// O empréstimo só compensa se liberar, por mês, ao menos este percentual das parcelas atuais.
export const META_LIBERACAO = 0.3
// Acima deste valor em parcelas por mês, a meta cai para META_LIBERACAO_REDUZIDA.
export const LIMITE_META_REDUZIDA = 1000
export const META_LIBERACAO_REDUZIDA = 0.15

export const percentualMetaPara = (parcelasAtuais) => (parcelasAtuais > LIMITE_META_REDUZIDA ? META_LIBERACAO_REDUZIDA : META_LIBERACAO)
const MAXIMO_DIVIDAS_COMBINADAS = 12

const mesDa = (conta) => conta.dataCadastro.slice(0, 7)
const somar = (itens, campo) => itens.reduce((total, item) => total + item[campo], 0)
const arredondar = (valor) => Math.round(valor * 100) / 100
const formatarPercentual = (fracao) => `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

// Taxa mensal (juros compostos) que torna as parcelas equivalentes ao valor recebido.
export function taxaEquivalente(valor, parcelas, valorParcela) {
  const presente = (taxa) => valorParcela * (1 - (1 + taxa) ** -parcelas) / taxa
  let baixa = 1e-9
  let alta = 10
  for (let passo = 0; passo < 100; passo++) {
    const meio = (baixa + alta) / 2
    if (presente(meio) > valor) baixa = meio
    else alta = meio
  }
  return (baixa + alta) / 2
}

export function calcularEmprestimo({ valor, parcelas, valorParcela }) {
  if (!(valor > 0 && Number.isInteger(parcelas) && parcelas > 0 && valorParcela > 0)) return { valido: false }

  const total = arredondar(parcelas * valorParcela)
  const custo = arredondar(total - valor)
  return {
    valido: true,
    valor,
    parcelas,
    valorParcela,
    total,
    custo,
    custoPercentual: custo / valor,
    taxaMensal: custo > 0 ? taxaEquivalente(valor, parcelas, valorParcela) : 0
  }
}

// Dívidas simuláveis: parcelamentos e contas fixas que o usuário paga e que ainda têm
// cobranças futuras (Infinity para conta fixa). A parcela do mês atual já está
// descontada do saldo disponível, por isso não entra.
export function listarDividas(contas) {
  return contas
    .filter((conta) => conta.tipoConta === 'Despesa' && conta.selected && ehParcelado(conta))
    .map((conta) => ({
      id: conta.id,
      descricao: conta.descricao,
      cartao: conta.cartao,
      fixa: ehContaFixa(conta),
      valorParcela: conta.valorFormatado,
      futuras: parcelasRestantes(conta) - 1
    }))
    .filter((divida) => divida.futuras > 0)
}

// Sugestão de renda: média das receitas dos últimos 3 meses anteriores ao atual que tiveram receita.
export function estimarRenda(contas, mesAtual) {
  const receitas = contas.filter((conta) => conta.tipoConta === 'Receita')
  const meses = [...new Set(receitas.map(mesDa))].filter((mes) => mes < mesAtual).sort().slice(-3)
  if (meses.length === 0) return { renda: null, meses }
  const doPeriodo = receitas.filter((conta) => meses.includes(mesDa(conta)))
  return { renda: arredondar(somar(doPeriodo, 'valorFormatado') / meses.length), meses }
}

// Antecipar paga as próximas parcelas: nesses meses ela não é cobrada e depois volta.
// Quitar paga todas as futuras (conta fixa não pode ser quitada, só antecipada).
// O desconto informado vale para a quitação total e é aplicado proporcionalmente
// quando só parte das parcelas é antecipada.
export function aplicarDecisao(divida, decisao, desconto = 0) {
  const acao = divida.fixa && decisao?.acao === 'quitar' ? 'manter' : decisao?.acao ?? 'manter'
  const quantidade = acao === 'quitar'
    ? divida.futuras
    : acao === 'antecipar' ? Math.min(Math.max(decisao.quantidade || 1, 1), divida.futuras) : 0
  const valorFuturo = divida.futuras * divida.valorParcela
  const descontoAplicado = quantidade > 0 && !divida.fixa ? Math.min(Math.max(desconto || 0, 0), valorFuturo) * (quantidade / divida.futuras) : 0

  return {
    divida,
    acao: quantidade === 0 ? 'manter' : quantidade === divida.futuras ? 'quitar' : 'antecipar',
    quantidade,
    desconto: arredondar(descontoAplicado),
    desembolso: arredondar(quantidade * divida.valorParcela - descontoAplicado)
  }
}

export function projetar({ mesAtual, saldoInicial, renda, operacoes, emprestimo, meses = MESES_ANALISE }) {
  const projecao = []
  let saldo = saldoInicial
  for (let numero = 1; numero <= meses; numero++) {
    // Meses 1..quantidade já foram pagos na simulação; a cobrança segue até a última parcela futura.
    const cobrada = (operacao) => numero > operacao.quantidade && numero <= operacao.divida.futuras
    const compromissos = operacoes.reduce((total, operacao) => total + (cobrada(operacao) ? operacao.divida.valorParcela : 0), 0)
    const parcelaEmprestimo = emprestimo?.valido && numero <= emprestimo.parcelas ? emprestimo.valorParcela : 0
    saldo = arredondar(saldo + renda - compromissos - parcelaEmprestimo)
    projecao.push({ mes: deslocarMes(mesAtual, numero), compromissos, parcelaEmprestimo, saldo })
  }
  return projecao
}

const menorSaldo = (projecao) => projecao.reduce((menor, item) => (item.saldo < menor.saldo ? item : menor), projecao[0])

// Economia = parcelas que deixam de ser pagas por mês: as quitadas de forma permanente e as
// antecipadas temporariamente. A líquida desconta a parcela do empréstimo e é comparada
// com a meta das parcelas atuais (META_LIBERACAO, ou META_LIBERACAO_REDUZIDA acima de LIMITE_META_REDUZIDA).
function resumirOperacoes(operacoes, emprestimo) {
  const escolhidas = operacoes.filter((operacao) => operacao.quantidade > 0)
  const quitadas = escolhidas.filter((operacao) => operacao.acao === 'quitar')
  const antecipadas = escolhidas.filter((operacao) => operacao.acao === 'antecipar')
  const parcelasAtuais = arredondar(somar(operacoes.map((operacao) => operacao.divida), 'valorParcela'))
  const economiaPermanente = arredondar(quitadas.reduce((total, operacao) => total + operacao.divida.valorParcela, 0))
  const economiaTemporaria = arredondar(antecipadas.reduce((total, operacao) => total + operacao.divida.valorParcela, 0))
  const economiaMensal = arredondar(economiaPermanente + economiaTemporaria)
  const economiaLiquida = arredondar(economiaMensal - (emprestimo?.valido ? emprestimo.valorParcela : 0))
  const percentualMeta = percentualMetaPara(parcelasAtuais)
  const meta = arredondar(parcelasAtuais * percentualMeta)

  return {
    escolhidas,
    quitadas,
    antecipadas,
    usado: arredondar(somar(escolhidas, 'desembolso')),
    usadoQuitacoes: arredondar(somar(quitadas, 'desembolso')),
    usadoAntecipacoes: arredondar(somar(antecipadas, 'desembolso')),
    desconto: arredondar(somar(escolhidas, 'desconto')),
    parcelasAtuais,
    economiaPermanente,
    economiaTemporaria,
    economiaMensal,
    economiaLiquida,
    percentualMeta,
    meta,
    atingeMeta: parcelasAtuais > 0 && economiaLiquida >= meta
  }
}

// Compara o cenário atual (nada muda) com o simulado nos próximos MESES_ANALISE meses.
export function simular({ contas, fechamento, mesAtual, emprestimo, renda, decisoes, descontos, formatar }) {
  const dividas = listarDividas(contas)
  const saldoAtual = calcularPeriodo(contas, fechamento).saldo
  const operacoes = dividas.map((divida) => aplicarDecisao(divida, decisoes[divida.id], descontos[divida.id]))
  const resumo = resumirOperacoes(operacoes, emprestimo)

  const atual = projetar({ mesAtual, renda, saldoInicial: saldoAtual, operacoes: dividas.map((divida) => aplicarDecisao(divida)), emprestimo: null })
  if (!emprestimo.valido) return { dividas, operacoes, saldoAtual, resumo, atual, simulado: null }

  const restante = arredondar(emprestimo.valor - resumo.usado)
  const simulado = projetar({ mesAtual, renda, saldoInicial: saldoAtual + restante, operacoes, emprestimo })
  const menorAtual = menorSaldo(atual)
  const menorSimulado = menorSaldo(simulado)

  const comprometimento = (item) => (renda > 0 ? (item.compromissos + item.parcelaEmprestimo) / renda : null)
  const maximo = (projecao) => Math.max(...projecao.map(comprometimento))
  const indicadores = {
    comprometimentoAtual: renda > 0 ? maximo(atual) : null,
    comprometimentoSimulado: renda > 0 ? maximo(simulado) : null,
    menorAtual,
    menorSimulado
  }

  // Parcelas antecipadas voltam a ser cobradas depois dos meses pagos, somando-se à do empréstimo se ele ainda estiver ativo.
  const retornos = resumo.antecipadas.map((operacao) => {
    const numero = operacao.quantidade + 1
    const comEmprestimo = numero <= emprestimo.parcelas
    return {
      divida: operacao.divida,
      numero,
      mes: deslocarMes(mesAtual, numero),
      ate: operacao.divida.fixa ? null : deslocarMes(mesAtual, operacao.divida.futuras),
      comEmprestimo,
      totalComEmprestimo: arredondar(operacao.divida.valorParcela + (comEmprestimo ? emprestimo.valorParcela : 0))
    }
  })

  // Antes × depois: parcelas do mês (inclui contas fixas) e total ainda a pagar
  // (parcelas futuras + empréstimo; contas fixas não têm total e ficam de fora).
  const parcelasMes = (item) => item.compromissos + item.parcelaEmprestimo
  const maiorMes = simulado.reduce((maior, item) => (parcelasMes(item) > parcelasMes(maior) ? item : maior), simulado[0])
  const comFim = operacoes.filter((operacao) => !operacao.divida.fixa)
  const parcelamentosDepois = arredondar(comFim.reduce((total, operacao) => total + (operacao.divida.futuras - operacao.quantidade) * operacao.divida.valorParcela, 0))
  const totalAbertoAntes = arredondar(comFim.reduce((total, operacao) => total + operacao.divida.futuras * operacao.divida.valorParcela, 0))
  const totalAbertoDepois = arredondar(parcelamentosDepois + emprestimo.total)
  const comparativo = {
    parcelasMesAntes: resumo.parcelasAtuais,
    parcelasMesDepois: parcelasMes(simulado[0]),
    parcelamentosMesDepois: simulado[0].compromissos,
    emprestimoMes: simulado[0].parcelaEmprestimo,
    economiaMes: arredondar(resumo.parcelasAtuais - parcelasMes(simulado[0])),
    maiorMes: parcelasMes(maiorMes) > parcelasMes(simulado[0]) ? { mes: maiorMes.mes, valor: parcelasMes(maiorMes) } : null,
    totalAbertoAntes,
    parcelamentosDepois,
    totalAbertoDepois,
    diferencaTotal: arredondar(totalAbertoDepois - totalAbertoAntes),
    temContaFixa: dividas.some((divida) => divida.fixa)
  }

  const analise = analisar({ emprestimo, resumo, restante, renda, indicadores, retornos, formatar })
  return { dividas, operacoes, saldoAtual, resumo, restante, atual, simulado, indicadores, retornos, comparativo, ...analise }
}

function analisar({ emprestimo, resumo, restante, renda, indicadores, retornos, formatar }) {
  const { menorAtual, menorSimulado } = indicadores
  const percentualMeta = formatarPercentual(resumo.percentualMeta)
  const nomeMes = (mes) => {
    const [ano, numero] = mes.split('-')
    return `${numero}/${ano}`
  }

  if (restante < 0) {
    return {
      veredito: 'invalido',
      explicacao: `As quitações e antecipações escolhidas somam ${formatar(resumo.usado)}, ${formatar(-restante)} acima do valor do empréstimo (${formatar(emprestimo.valor)}). Ajuste as escolhas.`,
      positivos: [], negativos: [], riscos: [], limitacoes: []
    }
  }

  const limitacoes = []
  if (!(renda > 0)) limitacoes.push('Informe a renda mensal para verificar se o saldo fica negativo nos próximos meses.')
  if (emprestimo.parcelas > MESES_ANALISE) limitacoes.push(`O empréstimo tem ${emprestimo.parcelas} parcelas, mas a verificação de saldo cobre ${MESES_ANALISE} meses; o custo total já considera todas as parcelas.`)

  const positivos = []
  const negativos = []
  const riscos = []

  if (resumo.economiaPermanente > 0) {
    positivos.push(resumo.quitadas.length === 1
      ? `Elimina 1 compromisso mensal de ${formatar(resumo.economiaPermanente)}.`
      : `Elimina ${resumo.quitadas.length} compromissos mensais que somam ${formatar(resumo.economiaPermanente)} por mês.`)
  }
  if (resumo.atingeMeta) {
    positivos.push(`Descontando a parcela do empréstimo, libera ${formatar(resumo.economiaLiquida)} por mês: atinge a meta de ${percentualMeta} das parcelas atuais (${formatar(resumo.meta)} de ${formatar(resumo.parcelasAtuais)}).`)
  }
  if (resumo.desconto > 0) positivos.push(`Desconto de ${formatar(resumo.desconto)} por antecipação.`)
  if (resumo.economiaTemporaria > 0) {
    positivos.push(`Antecipar ${somar(resumo.antecipadas, 'quantidade')} ${somar(resumo.antecipadas, 'quantidade') === 1 ? 'parcela libera' : 'parcelas libera'} ${formatar(resumo.economiaTemporaria)} por mês, apenas enquanto durarem os meses pagos.`)
  }

  if (!resumo.atingeMeta) {
    negativos.push(resumo.parcelasAtuais > 0
      ? `Libera ${formatar(resumo.economiaLiquida)} por mês após a parcela do empréstimo (${formatar(resumo.economiaMensal)} − ${formatar(emprestimo.valorParcela)}), abaixo da meta de ${percentualMeta} das parcelas atuais (${formatar(resumo.meta)} de ${formatar(resumo.parcelasAtuais)}).`
      : 'Você não tem parcelamentos para quitar: o empréstimo só acrescenta uma parcela mensal.')
  }
  if (emprestimo.custo > 0) {
    negativos.push(`O empréstimo custa ${formatar(emprestimo.custo)} a mais: você recebe ${formatar(emprestimo.valor)} e paga ${emprestimo.parcelas} × ${formatar(emprestimo.valorParcela)} = ${formatar(emprestimo.total)} (≈ ${formatarPercentual(emprestimo.taxaMensal)} ao mês).`)
  }
  negativos.push(`Nova parcela de ${formatar(emprestimo.valorParcela)} por ${emprestimo.parcelas} ${emprestimo.parcelas === 1 ? 'mês' : 'meses'}.`)
  if (restante > 0) negativos.push(`${formatar(restante)} do empréstimo não são usados em dívidas: ficam no saldo, mas também entram no custo.`)

  retornos.forEach((retorno) => {
    const { divida } = retorno
    riscos.push(retorno.comEmprestimo
      ? `A parcela de ${formatar(divida.valorParcela)} de ${divida.descricao} volta a ser cobrada em ${formatarMes(retorno.mes).toLowerCase()} e soma com a do empréstimo: ${formatar(divida.valorParcela)} + ${formatar(emprestimo.valorParcela)} = ${formatar(retorno.totalComEmprestimo)} por mês.`
      : `A parcela de ${formatar(divida.valorParcela)} de ${divida.descricao} volta a ser cobrada em ${formatarMes(retorno.mes).toLowerCase()}${retorno.ate ? `, até ${formatarMes(retorno.ate).toLowerCase()}` : ', todo mês (conta fixa)'}.`)
  })

  const comRenda = renda > 0
  if (comRenda && menorSimulado.saldo < 0) riscos.push(`O saldo projetado fica negativo em ${nomeMes(menorSimulado.mes)} (${formatar(menorSimulado.saldo)}).`)
  if (indicadores.comprometimentoSimulado !== null && indicadores.comprometimentoSimulado > indicadores.comprometimentoAtual + 0.0001) {
    riscos.push(`O comprometimento da renda com parcelas sobe de ${formatarPercentual(indicadores.comprometimentoAtual)} para ${formatarPercentual(indicadores.comprometimentoSimulado)} no pior mês.`)
  }

  let veredito
  if (!resumo.atingeMeta || (comRenda && menorSimulado.saldo < 0 && menorSimulado.saldo <= menorAtual.saldo)) veredito = 'desvantajoso'
  else if (!comRenda) veredito = 'insuficiente'
  else if (riscos.length > 0) veredito = 'cautela'
  else veredito = 'vantajoso'

  const partes = [
    `Você recebe ${formatar(emprestimo.valor)} e paga ${formatar(emprestimo.total)} em ${emprestimo.parcelas} parcelas de ${formatar(emprestimo.valorParcela)}.`,
    resumo.escolhidas.length > 0
      ? `Usa ${formatar(resumo.usado)} para quitar ou antecipar dívidas e deixa de pagar ${formatar(resumo.economiaMensal)} por mês em parcelas${resumo.economiaTemporaria > 0 ? ` (${formatar(resumo.economiaTemporaria)} só durante os meses antecipados)` : ''}.`
      : 'Nenhuma dívida foi escolhida para quitar ou antecipar.',
    `Com a nova parcela, a economia líquida é de ${formatar(resumo.economiaLiquida)} por mês; a meta é liberar ${percentualMeta} das parcelas atuais, ou seja, ${formatar(resumo.meta)}.`,
  ].filter(Boolean)

  return { veredito, explicacao: partes.join(' '), positivos, negativos, riscos, limitacoes }
}

// Testa as combinações de quitação total das dívidas que cabem no valor do empréstimo.
// Contas fixas nunca entram: não podem ser quitadas.
// Prioridade: atingir a meta de liberação mensal, nenhum mês com saldo negativo, maior
// economia mensal e maior desconto. Não prioriza a quantidade de contas quitadas.
export function recomendarCombinacoes({ contas, fechamento, mesAtual, emprestimo, renda, descontos, limite = 3 }) {
  if (!emprestimo.valido) return []

  const dividas = listarDividas(contas)
  const saldoAtual = calcularPeriodo(contas, fechamento).saldo
  const candidatas = dividas
    .filter((divida) => !divida.fixa)
    .sort((a, b) => b.valorParcela * b.futuras - a.valorParcela * a.futuras)
    .slice(0, MAXIMO_DIVIDAS_COMBINADAS)

  const combinacoes = []
  for (let mascara = 0; mascara < 1 << candidatas.length; mascara++) {
    const ids = candidatas.filter((_, indice) => mascara & (1 << indice)).map((divida) => divida.id)
    const operacoes = dividas.map((divida) => aplicarDecisao(divida, ids.includes(divida.id) ? { acao: 'quitar' } : null, descontos[divida.id]))
    const resumo = resumirOperacoes(operacoes, emprestimo)
    if (resumo.usado > emprestimo.valor + 0.005) continue

    const projecao = projetar({ mesAtual, renda, operacoes, emprestimo, saldoInicial: saldoAtual + emprestimo.valor - resumo.usado })
    combinacoes.push({
      ids,
      descricoes: resumo.quitadas.map((operacao) => operacao.divida.descricao),
      usado: resumo.usado,
      restante: arredondar(emprestimo.valor - resumo.usado),
      desconto: resumo.desconto,
      economiaMensal: resumo.economiaMensal,
      economiaLiquida: resumo.economiaLiquida,
      meta: resumo.meta,
      atingeMeta: resumo.atingeMeta,
      menor: menorSaldo(projecao)
    })
  }

  return combinacoes
    .sort((a, b) => b.atingeMeta - a.atingeMeta
      || (a.menor.saldo < 0) - (b.menor.saldo < 0)
      || b.economiaMensal - a.economiaMensal
      || b.desconto - a.desconto
      || b.menor.saldo - a.menor.saldo)
    .slice(0, limite)
}

// ---- Simulações salvas e comparação de cenários ----

// Simula a partir dos campos como o usuário preencheu (texto), formato em que são salvos.
export function simularEntrada({ contas, fechamento, mesAtual, entrada, formatar }) {
  const emprestimo = calcularEmprestimo({ valor: lerValor(entrada.valor || ''), parcelas: Number(entrada.parcelas), valorParcela: lerValor(entrada.valorParcela || '') })
  const descontos = Object.fromEntries(Object.entries(entrada.descontos || {}).map(([id, texto]) => [id, lerValor(texto || '') || 0]))
  const base = { contas, fechamento, mesAtual, emprestimo, renda: lerValor(entrada.renda || '') || 0, descontos }
  const resultado = simular({ ...base, decisoes: entrada.decisoes || {}, formatar })

  // Dívidas escolhidas na simulação que não existem mais (quitadas ou excluídas depois).
  const ids = new Set(resultado.dividas.map((divida) => divida.id))
  const dividasAusentes = Object.entries(entrada.decisoes || {})
    .filter(([id, decisao]) => decisao?.acao && decisao.acao !== 'manter' && !ids.has(id))
    .map(([id]) => entrada.nomesDividas?.[id] || 'Dívida removida')

  return { emprestimo, resultado, combinacoes: recomendarCombinacoes(base), dividasAusentes }
}

export const descreverCombinacao = (combinacao) => (combinacao.descricoes.length > 0 ? `Quitar ${combinacao.descricoes.join(', ')}` : 'Não quitar nenhuma dívida')

// Resumo guardado no histórico: o resultado como estava no dia em que foi salva.
export function resumoParaSalvar({ emprestimo, resultado, combinacoes }) {
  const { resumo, comparativo } = resultado
  return {
    veredito: resultado.veredito,
    emprestimo: { valor: emprestimo.valor, parcelas: emprestimo.parcelas, valorParcela: emprestimo.valorParcela, total: emprestimo.total, custo: emprestimo.custo },
    parcelasMesAntes: comparativo.parcelasMesAntes,
    parcelasMesDepois: comparativo.parcelasMesDepois,
    economiaLiquida: resumo.economiaLiquida,
    meta: resumo.meta,
    percentualMeta: resumo.percentualMeta,
    atingeMeta: resumo.atingeMeta,
    totalAbertoAntes: comparativo.totalAbertoAntes,
    totalAbertoDepois: comparativo.totalAbertoDepois,
    acoes: resumo.escolhidas.map((operacao) => ({ descricao: operacao.divida.descricao, acao: operacao.acao, quantidade: operacao.quantidade })),
    recomendada: combinacoes[0] ? descreverCombinacao(combinacoes[0]) : null
  }
}

// Cenário "não contratar": tudo continua como está hoje.
export function cenarioAtual(contas) {
  const dividas = listarDividas(contas)
  return {
    parcelasMes: arredondar(somar(dividas, 'valorParcela')),
    totalAberto: arredondar(dividas.filter((divida) => !divida.fixa).reduce((total, divida) => total + divida.futuras * divida.valorParcela, 0))
  }
}

const ORDEM_VEREDITO = { vantajoso: 3, cautela: 2, insuficiente: 1, desvantajoso: 0, invalido: -1 }

// Melhor cenário: só vale contratar se o veredito for vantajoso ou exige cautela; entre eles,
// melhor veredito, maior economia líquida mensal e menor total ainda a pagar.
// Se nenhum se qualificar, o melhor é não contratar.
export function escolherMelhorCenario(cenarios) {
  const qualificados = cenarios
    .filter(({ resultado }) => ORDEM_VEREDITO[resultado.veredito] >= ORDEM_VEREDITO.cautela)
    .sort((a, b) => ORDEM_VEREDITO[b.resultado.veredito] - ORDEM_VEREDITO[a.resultado.veredito]
      || b.resultado.resumo.economiaLiquida - a.resultado.resumo.economiaLiquida
      || a.resultado.comparativo.totalAbertoDepois - b.resultado.comparativo.totalAbertoDepois)
  return qualificados[0] ?? null
}
