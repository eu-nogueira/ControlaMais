import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdMic, MdSend, MdStop } from 'react-icons/md'
import { adicionarConta, removerConta } from '../../store/extrato'
import { comecarAOuvir, vozDisponivel } from '../../services/voz'
import { completarCampo, corrigirProposta, ehCorrecao, interpretarMensagem, paraNovaConta, perguntaPara } from '../../utils/copiloto'
import { ehPergunta, responderPergunta } from '../../utils/perguntasCopiloto'
import { ehIdLocal } from '../../utils/filaOffline'
import { OPCOES_DIAS_FERIAS, avaliarCompra, diagnosticar, ehPedidoDeDicas, ehPerguntaDeCompra, lerDiasFerias, lerMesExtra, lerOrigemExtra, lerValorExtra, nomeDoExtra, opcoesDeExtras, opcoesDeMeses, sugestaoDeExtra } from '../../utils/consultoria'
import { rotuloOrigem } from '../../utils/simulacao'
import { calcularDecimoTerceiro } from '../../utils/decimoTerceiro'
import { calcularFerias } from '../../utils/ferias'
import { formatarMes } from '../../utils/mes'
import { aprender, descreverAprendizado, esquecer, falaDoEnsinamento, interpretarEnsinamento, pedidoDoQueAprendeu, pedidoParaEsquecer } from '../../utils/aprendizado'
import { formatarDataISO, formatarMoeda, juntarLista } from '../../utils/formatar'
import useHoje from '../../hooks/useHoje'
import useMesAtual from '../../hooks/useMesAtual'
import './Copiloto.css'

const EXEMPLOS = [
  "Devo pagar para Fulano 98 reais do Habib's",
  'TV de 1.200 em 10x no cartão',
]

const BOAS_VINDAS = 'Oi! Eu sou o Marcão. Me conta o que você gastou ou recebeu que eu registro pra você. Também respondo perguntas ("quanto gastei este mês?"), '
  + 'dou dicas para os próximos meses ("me dá dicas") e digo se uma compra cabe no bolso ("posso comprar uma TV de 2.000 em 10x?").'

const OPCAO_INFORMAR_LIQUIDO = 'Prefiro informar o valor líquido'

// Abertura da análise de dicas (também usada quando o chat é aberto por um aviso do sino).
const INICIO_DICAS = 'Vou analisar seu saldo, a projeção dos próximos 6 meses, suas parcelas e o extrato do mês. '
  + 'Antes: você tem algum valor extra para receber nos próximos meses, como 13º, férias ou FGTS?'

const AJUDA = 'É só escrever do seu jeito. Eu entendo valor, parcelas ("10x"), vencimento ("vence dia 10"), cartão ("no Nubank"), '
  + 'quem te deve ("Fulano me deve 50 do almoço") e pra quem você deve ("devo 30 pro Fulano"). Dá para mandar vários de uma vez: "Uber 20 e mercado 150". '
  + 'Para corrigir antes de registrar: "muda o vencimento pra dia 10", "foram 3x", "o valor é 120". '
  + 'Também respondo: quanto você gastou, seu saldo, quem te deve, quanto você deve, o que vai vencer e quanto falta pagar de um parcelamento. '
  + 'E você pode me ensinar: "habib\'s é alimentação", "roxinho é o Nubank", "mãe é a Maria". Pergunte "o que você aprendeu?" para ver o que eu já sei. '
  + 'O que você não disser eu preencho com um padrão e te aviso no sino.'

const CORRECAO_NAO_ENTENDIDA = 'Não entendi a correção. Tente assim: "muda o vencimento pra dia 10", "foram 3x", "o valor é 120", "foi no Nubank" ou "categoria lazer".'

const ehSaudacao = (texto) => /^(oi+|ol[aá]|opa|e a[ií]|eae|bom dia|boa tarde|boa noite|fala)[\s!.,]*(marc[aã]o)?[\s!.]*$/iu.test(texto.trim())
const ehAjuda = (texto) => /^(ajuda|help|como funciona|o que voc[eê] faz)\??$/iu.test(texto.trim())
const ehCancelamento = (texto) => /^(cancela(r)?|deixa( pra l[aá]| isso)?|esquece( isso)?|nada|n[aã]o)[\s!.]*$/iu.test(texto.trim())
const ehConfirmacao = (texto) => /^(sim|s|isso|isso mesmo|confirma(r)?|confirmo|pode( registrar)?|registra|ok|beleza|certo|perfeito)[\s!.]*$/iu.test(texto.trim())

function falaDaProposta(conta, abertura = 'Entendi!') {
  const valor = formatarMoeda(conta.valorFormatado)
  const parcelas = Number(conta.parcela) || 1
  const quanto = conta.contaFixa ? `${valor} por mês` : parcelas > 1 ? `${parcelas}x de ${valor}` : valor

  const inicio = abertura ? `${abertura} ` : ''
  if (conta.tipoConta === 'Receita') return `${inicio}Uma receita de ${quanto}: ${conta.descricao}.`
  if (!conta.selected) return `${inicio}${conta.responsavel} vai te pagar ${quanto} (${conta.descricao}).`
  if (conta.anotarPara) return `${inicio}Uma despesa de ${quanto} (${conta.descricao}) que você vai pagar para ${conta.anotarPara}.`
  return `${inicio}Uma despesa de ${quanto}: ${conta.descricao}.`
}

function detalhes(conta) {
  if (conta.tipoConta === 'Receita') return [['Data', formatarDataISO(conta.dataCadastro)]]

  return [
    ['Vencimento', formatarDataISO(conta.dataVencimento), 'vencimento'],
    ['Pagamento', conta.ehCartao ? `Cartão ${conta.cartao}` : 'Pix', 'cartão'],
    ['Tipo de despesa', conta.categoria || 'Não identificado', 'tipo de despesa'],
    ['Data', formatarDataISO(conta.dataCadastro)],
  ]
}

function falaDoRegistro({ conta, assumidos }) {
  if (assumidos.length === 0) return 'Pronto, registrei! Quer registrar mais alguma coisa?'
  const padroes = assumidos.map((campo) => (campo === 'vencimento' ? `vencimento (${formatarDataISO(conta.dataVencimento)})` : campo))
  return `Pronto, registrei! Usei um padrão para ${juntarLista(padroes)} e deixei um aviso no sino pra você conferir depois. Quer registrar mais alguma coisa?`
}

// Chat do Marcão: registra movimentações a partir de frases. A interpretação é feita no próprio app, por regras.
// `aprendizado`: o que o usuário ensinou no chat; `onAprender` guarda a nova versão.
// `onSimular` e `onCriarMeta` abrem a Simulação e o formulário de meta já preenchidos a partir das dicas.
// `iniciarDicas`: o chat já abre na análise de dicas (ex.: tocando no aviso de saldo negativo no sino).
function Copiloto({ aprendizado, onAprender, onRegistrado, onRevisar, onSimular, onCriarMeta, iniciarDicas = false }) {
  const [mensagens, setMensagens] = useState(() => (iniciarDicas
    ? [{ id: 0, autor: 'marcao', texto: INICIO_DICAS, opcoes: opcoesDeExtras() }]
    : [{ id: 0, autor: 'marcao', texto: BOAS_VINDAS }]))
  const [entrada, setEntrada] = useState('')
  // Campo que o Marcão perguntou e a interpretação que está sendo completada.
  const [aguardando, setAguardando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [temVoz, setTemVoz] = useState(false)
  const [ouvindo, setOuvindo] = useState(false)
  const microfone = useRef(null)
  const proximoId = useRef(1)
  const fimDaConversa = useRef(null)
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const cartoes = useSelector((state) => state.cartoes.lista)
  const metas = useSelector((state) => state.metas.lista)
  // Conversa das dicas: perguntas sobre valores extras a receber antes da análise.
  const [consultoria, setConsultoria] = useState(() => (iniciarDicas ? { etapa: 'origem', extras: [] } : null))
  const hoje = useHoje()
  const mesAtual = useMesAtual()
  const dispatch = useDispatch()

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ block: 'end' })
  }, [mensagens])

  useEffect(() => {
    vozDisponivel().then(setTemVoz)
    // Fechar o chat enquanto ouve desliga o microfone.
    return () => microfone.current?.parar()
  }, [])

  // O reconhecimento termina de forma assíncrona: usa sempre a versão mais recente de `enviar`.
  const enviarAtual = useRef(null)
  useEffect(() => {
    enviarAtual.current = enviar
  })

  const novaMensagem = (autor, texto, extra = {}) => ({ id: proximoId.current++, autor, texto, ...extra })

  // Propostas ainda abertas deixam de valer quando o assunto muda.
  const encerrarPropostas = (lista, situacao) => lista.map((mensagem) => (mensagem.situacao === 'aberta' ? { ...mensagem, situacao } : mensagem))

  const contexto = { contas, cartoes, fechamento, hoje, mesAtual, aprendizado, metas }

  function executarAcao(botao) {
    if (botao.tipo === 'simular') onSimular(botao.dados)
    else if (botao.tipo === 'meta') onCriarMeta(botao.dados)
    else if (botao.tipo === 'registrar') onRevisar(botao.dados)
  }

  function finalizarConsultoria(extras, responder) {
    setConsultoria(null)
    const analise = diagnosticar({ ...contexto, extras })
    responder([novaMensagem('marcao', 'Pronto! Analisei seu saldo, a projeção dos próximos 6 meses, suas parcelas e o extrato.', { analise })])
  }

  // Pergunta, uma coisa por vez, os valores extras a receber: origem → valor → mês → "mais algum?".
  function continuarConsultoria(conteudo, responder) {
    const { etapa, extras, atual } = consultoria
    const perguntar = (texto, opcoes = []) => responder([novaMensagem('marcao', texto, { opcoes })])

    if (/^\s*(cancela|cancelar|esquece|deixa pra l[aá]|parar?)\b/iu.test(conteudo)) {
      setConsultoria(null)
      perguntar('Tudo bem, deixei a análise para depois. É só pedir "me dá dicas" quando quiser.')
      return
    }

    if (etapa === 'origem') {
      const origem = lerOrigemExtra(conteudo)
      if (origem === 'nenhum') {
        finalizarConsultoria(extras, responder)
        return
      }
      if (!origem) {
        perguntar('Não entendi. Escolha uma das opções ou responda "não tenho".', opcoesDeExtras(extras.map((extra) => extra.origem)))
        return
      }
      const sugestao = sugestaoDeExtra(origem, contas, mesAtual)
      // 13º: calcula o líquido a partir do salário bruto, como o "Calcular para mim" da Simulação.
      if (origem === 'decimo_terceiro') {
        setConsultoria({ etapa: 'salarioDecimo', extras, atual: { origem, sugestao } })
        perguntar('Qual é o seu salário bruto, o valor antes dos descontos que aparece no holerite? Com ele eu calculo o seu 13º líquido.', [OPCAO_INFORMAR_LIQUIDO])
        return
      }
      // Férias: calcula a partir do salário bruto, como na Simulação, e pergunta se vale o total ou só o 1/3.
      if (origem === 'ferias') {
        setConsultoria({ etapa: 'salarioFerias', extras, atual: { origem, sugestao } })
        perguntar('Qual é o seu salário bruto, o valor antes dos descontos que aparece no holerite? Com ele eu calculo quanto vem nas férias.', [OPCAO_INFORMAR_LIQUIDO])
        return
      }
      setConsultoria({ etapa: 'valor', extras, atual: { origem, sugestao } })
      perguntar(origem === 'outro' ? 'Quanto é esse valor extra?' : `Quanto você vai receber de ${nomeDoExtra(origem).replace(/^(o|a|as) /, '')}?`,
        sugestao.valor ? [formatarMoeda(sugestao.valor)] : [])
      return
    }

    if (etapa === 'salarioFerias') {
      if (/informar|sei o valor|l[ií]quido/iu.test(conteudo)) {
        setConsultoria({ etapa: 'valor', extras, atual })
        perguntar('Quanto você vai receber das férias? Se quiser considerar só o dinheiro livre, informe o 1/3 (e o abono, se vender dias).')
        return
      }
      const salario = lerValorExtra(conteudo)
      if (!salario) {
        perguntar('Não entendi o salário. Me diga só o número, por exemplo: 3.500', [OPCAO_INFORMAR_LIQUIDO])
        return
      }
      setConsultoria({ etapa: 'diasFerias', extras, atual: { ...atual, salario } })
      perguntar('Quantos dias de férias você vai tirar? Se for vender dias, me diga também.', OPCOES_DIAS_FERIAS)
      return
    }

    if (etapa === 'diasFerias') {
      const dias = lerDiasFerias(conteudo)
      const calculo = dias && calcularFerias({ salarioBruto: String(atual.salario), diasFerias: String(dias.dias), diasVendidos: String(dias.vendidos), mediaAdicionais: '' })
      if (!calculo?.valido) {
        perguntar(`${calculo?.erros?.join(' ') ?? 'Não entendi os dias.'} Quantos dias de férias você vai tirar?`, OPCOES_DIAS_FERIAS)
        return
      }
      const venda = calculo.vendidos > 0
      setConsultoria({ etapa: 'valor', extras, atual: { ...atual, ...dias, calculo } })
      perguntar(`Com ${calculo.dias} dias de férias${venda ? ` e ${calculo.vendidos} vendidos` : ''}, o recibo deve vir com cerca de ${formatarMoeda(calculo.reciboLiquido)} líquidos. `
        + `Desse valor, ${formatarMoeda(calculo.adiantamento)} é o salário dos dias de férias pago adiantado, que virá a menos no próximo pagamento; `
        + `o dinheiro livre de verdade é ${venda ? 'o 1/3 de férias mais a venda dos dias' : 'o 1/3 de férias'}, cerca de ${formatarMoeda(calculo.livre)}.`
        + `${calculo.podeTerIr ? ' Pode haver Imposto de Renda, que não está incluído.' : ''} Quer que eu considere o valor total ou só ${venda ? 'o dinheiro livre' : 'o 1/3'}?`,
      [`Só ${venda ? 'o dinheiro livre' : 'o terço de férias'}: ${formatarMoeda(calculo.livre)}`, `O valor total: ${formatarMoeda(calculo.reciboLiquido)}`])
      return
    }

    if (etapa === 'salarioDecimo') {
      if (/informar|sei o valor|l[ií]quido/iu.test(conteudo)) {
        setConsultoria({ etapa: 'valor', extras, atual })
        perguntar('Quanto você vai receber de 13º, já com os descontos?')
        return
      }
      const salario = lerValorExtra(conteudo)
      const calculo = salario && calcularDecimoTerceiro({ salarioBruto: String(salario) })
      if (!calculo?.valido) {
        perguntar('Não entendi o salário. Me diga só o número, por exemplo: 3.500', [OPCAO_INFORMAR_LIQUIDO])
        return
      }
      setConsultoria({ etapa: 'valor', extras, atual: { ...atual, calculo } })
      perguntar(`Pelo seu salário, o 13º líquido fica em torno de ${formatarMoeda(calculo.liquido)}: ${formatarMoeda(calculo.primeira)} na 1ª parcela (até 30/11, sem descontos) `
        + `e ${formatarMoeda(calculo.segunda)} na 2ª (até 20/12, já descontado o INSS de ${formatarMoeda(calculo.inss)}).`
        + `${calculo.podeTerIr ? ' Pode haver Imposto de Renda, que não está incluído.' : ''} Quanto ainda vai entrar?`,
      [`Tudo: ${formatarMoeda(calculo.liquido)}`, `Só a segunda parcela: ${formatarMoeda(calculo.segunda)}`])
      return
    }

    if (etapa === 'valor') {
      const valor = lerValorExtra(conteudo)
      if (!valor) {
        perguntar('Não entendi o valor. Me diga só o número, por exemplo: 1.500')
        return
      }
      setConsultoria({ etapa: 'mes', extras, atual: { ...atual, valor } })
      perguntar('Em que mês esse dinheiro entra?', [...new Set([atual.sugestao.mes && formatarMes(atual.sugestao.mes), ...opcoesDeMeses(mesAtual)].filter(Boolean))])
      return
    }

    const mes = lerMesExtra(conteudo, mesAtual)
    if (!mes) {
      perguntar('Não entendi o mês. Escolha um dos próximos meses:', opcoesDeMeses(mesAtual))
      return
    }
    // Com o valor calculado, guarda o salário e a escolha feita (1ª parcela do 13º já recebida; férias pelo
    // total ou só pelo 1/3), para a Simulação abrir já calculada e a análise avisar sobre o salário adiantado.
    const mesmoValor = (valor) => Math.abs(atual.valor - valor) < 0.01
    const calculo = !atual.calculo ? null
      : atual.origem === 'decimo_terceiro'
        ? { salario: atual.calculo.salario, primeiraRecebida: mesmoValor(atual.calculo.segunda) }
        : { salario: atual.salario, valorTotal: mesmoValor(atual.calculo.reciboLiquido), dias: atual.dias, vendidos: atual.vendidos }
    const novos = [...extras, { origem: atual.origem, valor: atual.valor, mes, ...(calculo && { calculo }) }]
    setConsultoria({ etapa: 'origem', extras: novos })
    perguntar(`Anotado: ${rotuloOrigem(atual.origem)} de ${formatarMoeda(atual.valor)} em ${formatarMes(mes).toLowerCase()}. Tem mais algum valor para receber?`,
      opcoesDeExtras(novos.map((extra) => extra.origem)))
  }

  function responderInterpretacao(interpretacao, abertura) {
    if (interpretacao.faltando.length > 0) {
      const campo = interpretacao.faltando[0]
      setAguardando({ interpretacao, campo })
      return novaMensagem('marcao', perguntaPara(campo, interpretacao.conta))
    }

    setAguardando(null)
    return novaMensagem('marcao', falaDaProposta(interpretacao.conta, abertura), { proposta: interpretacao, situacao: 'aberta' })
  }

  // Uma mensagem pode trazer vários lançamentos: cada um vira uma proposta com seus botões.
  function responderLancamentos(conteudo) {
    const interpretacoes = interpretarMensagem(conteudo, contexto)
    if (interpretacoes.length === 1) return [responderInterpretacao(interpretacoes[0])]

    setAguardando(null)
    return [
      novaMensagem('marcao', `Encontrei ${interpretacoes.length} lançamentos. Confere cada um (ou responda "sim" para registrar todos):`),
      ...interpretacoes.map((interpretacao) => novaMensagem('marcao', falaDaProposta(interpretacao.conta, ''), { proposta: interpretacao, situacao: 'aberta' })),
    ]
  }

  function enviar(texto, { porVoz = false } = {}) {
    const conteudo = texto.trim()
    if (!conteudo || salvando) return
    setEntrada('')

    const doUsuario = novaMensagem('usuario', conteudo, { porVoz })
    const abertas = mensagens.filter((mensagem) => mensagem.situacao === 'aberta')
    const ultimaAberta = abertas[abertas.length - 1]
    const responder = (respostas, encerrarAbertas) => setMensagens((lista) => [...(encerrarAbertas ? encerrarPropostas(lista, encerrarAbertas) : lista), doUsuario, ...respostas])

    if (consultoria) {
      continuarConsultoria(conteudo, responder)
      return
    }

    if (ehCancelamento(conteudo) && (aguardando || abertas.length > 0)) {
      setAguardando(null)
      responder([novaMensagem('marcao', 'Tudo bem, não registrei. Se quiser, é só me contar outra coisa.')], 'cancelada')
      return
    }

    if (ehConfirmacao(conteudo) && !aguardando && abertas.length > 0) {
      responder([])
      registrarEmSequencia(abertas)
      return
    }

    if (aguardando) {
      // Uma pergunta no meio não atrapalha: responde e volta a pedir o que faltava.
      const respostaPergunta = ehPergunta(conteudo) && responderPergunta(conteudo, contexto)
      if (respostaPergunta) {
        responder([novaMensagem('marcao', `${respostaPergunta} Ainda preciso saber: ${perguntaPara(aguardando.campo, aguardando.interpretacao.conta)}`)])
        return
      }
      const completa = completarCampo(aguardando.interpretacao, aguardando.campo, conteudo, contexto)
      responder([completa
        ? responderInterpretacao(completa)
        : novaMensagem('marcao', `Não entendi. ${perguntaPara(aguardando.campo, aguardando.interpretacao.conta)}`)])
      return
    }

    if (ehSaudacao(conteudo)) {
      responder([novaMensagem('marcao', 'Oi! Me conta o que você gastou ou recebeu.')])
      return
    }

    if (ehAjuda(conteudo)) {
      responder([novaMensagem('marcao', AJUDA)])
      return
    }

    if (ehPedidoDeDicas(conteudo)) {
      setAguardando(null)
      setConsultoria({ etapa: 'origem', extras: [] })
      responder([novaMensagem('marcao', INICIO_DICAS, { opcoes: opcoesDeExtras() })], 'substituida')
      return
    }

    if (ehPerguntaDeCompra(conteudo)) {
      const { texto: resposta, botao } = avaliarCompra(conteudo, contexto)
      responder([novaMensagem('marcao', resposta, { acoes: botao ? [botao] : [] })])
      return
    }

    if (pedidoDoQueAprendeu(conteudo)) {
      responder([novaMensagem('marcao', descreverAprendizado(aprendizado))])
      return
    }

    const termoParaEsquecer = pedidoParaEsquecer(conteudo)
    if (termoParaEsquecer) {
      const { aprendizado: novo, esquecido } = esquecer(aprendizado, termoParaEsquecer)
      if (esquecido) onAprender(novo)
      responder([novaMensagem('marcao', esquecido
        ? `Pronto, esqueci o que você me ensinou sobre "${esquecido.termo}".`
        : `Não tenho nada aprendido sobre "${termoParaEsquecer}". Pergunte "o que você aprendeu?" para ver a lista.`)])
      return
    }

    // Correção da última proposta aberta: ela é substituída pela versão corrigida.
    if (ultimaAberta && ehCorrecao(conteudo)) {
      const corrigida = corrigirProposta(ultimaAberta.proposta, conteudo, contexto)
      if (!corrigida) {
        responder([novaMensagem('marcao', CORRECAO_NAO_ENTENDIDA)])
        return
      }
      // Corrigir o tipo de despesa também ensina: na próxima vez essa descrição já vem certa.
      const antes = ultimaAberta.proposta.conta
      const { categoria, descricao, tipoConta } = corrigida.conta
      const aprendeuCategoria = Boolean(categoria && descricao && tipoConta === antes.tipoConta && categoria !== antes.categoria)
      if (aprendeuCategoria) onAprender(aprender(aprendizado, { grupo: 'categorias', termo: descricao, valor: categoria }))

      const resposta = responderInterpretacao(corrigida, 'Corrigido!')
      if (aprendeuCategoria && resposta.proposta) resposta.texto += ` Vou lembrar que ${descricao} é ${categoria}.`
      setMensagens((lista) => [
        ...lista.map((mensagem) => (mensagem.id === ultimaAberta.id ? { ...mensagem, situacao: 'corrigida' } : mensagem)),
        doUsuario,
        resposta,
      ])
      return
    }

    const ensinamento = interpretarEnsinamento(conteudo, contexto)
    if (ensinamento) {
      onAprender(aprender(aprendizado, ensinamento))
      responder([novaMensagem('marcao', falaDoEnsinamento(ensinamento))])
      return
    }

    const respostaPergunta = responderPergunta(conteudo, contexto)
    if (respostaPergunta) {
      responder([novaMensagem('marcao', respostaPergunta)])
      return
    }

    responder(responderLancamentos(conteudo), 'substituida')
  }

  async function alternarMicrofone() {
    if (ouvindo) {
      microfone.current?.parar()
      return
    }

    setEntrada('')
    setOuvindo(true)
    const encerrar = () => {
      microfone.current = null
      setOuvindo(false)
    }

    try {
      microfone.current = await comecarAOuvir({
        onParcial: setEntrada,
        onFim: (texto) => {
          encerrar()
          if (texto.trim()) enviarAtual.current(texto, { porVoz: true })
          else setMensagens((lista) => [...lista, novaMensagem('marcao', 'Não consegui ouvir. Tente de novo ou escreva sua mensagem.')])
        },
        onErro: (mensagem) => {
          encerrar()
          setEntrada('')
          setMensagens((lista) => [...lista, novaMensagem('marcao', mensagem)])
        },
      })
    } catch {
      encerrar()
      setMensagens((lista) => [...lista, novaMensagem('marcao', 'Não consegui usar o microfone agora. Tente de novo ou escreva.')])
    }
  }

  function alterarMensagem(id, alteracoes) {
    setMensagens((lista) => lista.map((mensagem) => (mensagem.id === id ? { ...mensagem, ...alteracoes } : mensagem)))
  }

  async function registrar(mensagem) {
    setSalvando(true)
    try {
      const salva = await dispatch(adicionarConta(paraNovaConta(mensagem.proposta.conta, contexto))).unwrap()
      onRegistrado(salva, mensagem.proposta.assumidos)
      alterarMensagem(mensagem.id, { situacao: 'registrada', contaSalva: salva })
      const semInternet = ehIdLocal(salva.id) ? ' Estou sem internet agora: envio assim que a conexão voltar.' : ''
      setMensagens((lista) => [...lista, novaMensagem('marcao', `${falaDoRegistro(mensagem.proposta)}${semInternet}`)])
    } catch {
      setMensagens((lista) => [...lista, novaMensagem('marcao', 'Não consegui salvar agora. Tente de novo em instantes.')])
    } finally {
      setSalvando(false)
    }
  }

  async function registrarEmSequencia(propostas) {
    for (const proposta of propostas) await registrar(proposta)
  }

  async function desfazer(mensagem) {
    setSalvando(true)
    try {
      await dispatch(removerConta(mensagem.contaSalva)).unwrap()
      alterarMensagem(mensagem.id, { situacao: 'desfeita' })
      setMensagens((lista) => [...lista, novaMensagem('marcao', `Desfeito: ${mensagem.contaSalva.descricao} não está mais registrado.`)])
    } catch {
      setMensagens((lista) => [...lista, novaMensagem('marcao', 'Não consegui desfazer agora. Tente de novo ou apague pelo Extrato.')])
    } finally {
      setSalvando(false)
    }
  }

  function cancelar(mensagem) {
    alterarMensagem(mensagem.id, { situacao: 'cancelada' })
    setMensagens((lista) => [...lista, novaMensagem('marcao', 'Tudo bem, não registrei. Se quiser, é só me contar outra coisa.')])
  }

  const conversaIniciada = mensagens.some((mensagem) => mensagem.autor === 'usuario')
  const ultimaMensagem = mensagens[mensagens.length - 1]

  return (
    <div className='marcao'>
      <ol className='marcao-mensagens' aria-live='polite'>
        {mensagens.map((mensagem) => (
          <li key={mensagem.id} className={`marcao-mensagem marcao-mensagem-${mensagem.autor}`}>
            {mensagem.autor === 'marcao' && <span className='marcao-avatar' aria-hidden='true'>M</span>}
            <div className='marcao-balao'>
              <p>
                {mensagem.porVoz && <MdMic size={14} className='marcao-voz' aria-label='Enviada por voz' />}
                {mensagem.texto}
              </p>

              {mensagem.analise && (
                <div className='marcao-analise'>
                  <h4>Como está</h4>
                  <ul>
                    {mensagem.analise.situacao.map((linha) => <li key={linha}>{linha}</li>)}
                  </ul>
                  <h4>O que eu faria</h4>
                  <ol>
                    {mensagem.analise.acoes.map((acao) => (
                      <li key={acao.texto}>
                        <span>{acao.texto}</span>
                        {acao.botao && (
                          <button type='button' className='marcao-acao' onClick={() => executarAcao(acao.botao)}>{acao.botao.rotulo}</button>
                        )}
                      </li>
                    ))}
                  </ol>
                  <p className='marcao-observacao'>Sugestões feitas a partir dos seus registros no app; não são recomendação de investimento.</p>
                </div>
              )}

              {mensagem.acoes?.map((botao) => (
                <button key={botao.rotulo} type='button' className='marcao-acao' onClick={() => executarAcao(botao)}>{botao.rotulo}</button>
              ))}

              {mensagem.opcoes?.length > 0 && mensagem.id === ultimaMensagem?.id && (
                <div className='marcao-opcoes'>
                  {mensagem.opcoes.map((opcao) => (
                    <button key={opcao} type='button' onClick={() => enviar(opcao)}>{opcao}</button>
                  ))}
                </div>
              )}

              {mensagem.proposta && (
                <>
                  <dl className='marcao-detalhes'>
                    {detalhes(mensagem.proposta.conta).map(([rotulo, valor, campo]) => (
                      <div key={rotulo}>
                        <dt>{rotulo}</dt>
                        <dd>
                          {valor}
                          {campo && mensagem.proposta.assumidos.includes(campo) && <span className='marcao-padrao'>padrão</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {mensagem.proposta.observacoes.map((observacao) => (
                    <p key={observacao} className='marcao-observacao'>{observacao}</p>
                  ))}

                  {mensagem.situacao === 'aberta' && (
                    <div className='marcao-acoes'>
                      <button type='button' className='botao botao-primario' disabled={salvando} onClick={() => !salvando && registrar(mensagem)}>
                        {salvando ? 'Registrando...' : 'Registrar'}
                      </button>
                      <button type='button' className='botao botao-secundario' disabled={salvando} onClick={() => onRevisar(mensagem.proposta.conta)}>
                        Ajustar no formulário
                      </button>
                      <button type='button' className='marcao-cancelar' disabled={salvando} onClick={() => cancelar(mensagem)}>
                        Cancelar
                      </button>
                    </div>
                  )}
                  {mensagem.situacao === 'registrada' && (
                    <div className='marcao-registrada'>
                      <p className='marcao-situacao marcao-situacao-ok'>Registrada</p>
                      <button type='button' className='marcao-cancelar' disabled={salvando} onClick={() => desfazer(mensagem)}>
                        Desfazer
                      </button>
                    </div>
                  )}
                  {mensagem.situacao === 'cancelada' && <p className='marcao-situacao'>Cancelada</p>}
                  {mensagem.situacao === 'desfeita' && <p className='marcao-situacao'>Desfeita</p>}
                  {mensagem.situacao === 'corrigida' && <p className='marcao-situacao'>Corrigida abaixo</p>}
                </>
              )}
            </div>
          </li>
        ))}
        <li ref={fimDaConversa} aria-hidden='true' />
      </ol>

      {!conversaIniciada && (
        <div className='marcao-exemplos'>
          {EXEMPLOS.map((exemplo) => (
            <button key={exemplo} type='button' onClick={() => enviar(exemplo)}>
              {exemplo}
            </button>
          ))}
        </div>
      )}

      <form
        className='marcao-entrada'
        onSubmit={(event) => {
          event.preventDefault()
          enviar(entrada)
        }}
      >
        <input
          type='text'
          placeholder={ouvindo ? 'Ouvindo...' : aguardando || consultoria ? 'Responda ao Marcão...' : 'Ex.: Uber 23,50 ontem'}
          value={entrada}
          onChange={(event) => setEntrada(event.target.value)}
          readOnly={ouvindo}
          aria-label='Mensagem para o Marcão'
          enterKeyHint='send'
          autoFocus
        />
        {temVoz && (ouvindo || !entrada.trim()) ? (
          <button
            type='button'
            className={ouvindo ? 'marcao-ouvindo' : ''}
            onClick={alternarMicrofone}
            disabled={salvando}
            aria-label={ouvindo ? 'Parar de ouvir' : 'Falar com o Marcão'}
          >
            {ouvindo ? <MdStop size={22} /> : <MdMic size={22} />}
          </button>
        ) : (
          <button type='submit' disabled={!entrada.trim() || salvando} aria-label='Enviar'>
            <MdSend size={20} />
          </button>
        )}
      </form>
    </div>
  )
}

export default Copiloto
