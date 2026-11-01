import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdArrowForward, MdCheck, MdDeleteOutline, MdCheckCircle, MdHelpOutline, MdInfoOutline, MdRemove, MdRemoveCircleOutline, MdShield, MdWarningAmber } from 'react-icons/md'
import { formatarMoeda, juntarLista, lerValor } from '../../utils/formatar'
import { deslocarMes, formatarMes } from '../../utils/mes'
import { LIMITE_META_REDUZIDA, MESES_ANALISE, META_LIBERACAO, META_LIBERACAO_REDUZIDA, ORIGENS_VALOR_FUTURO, chaveEscolhas, descreverCombinacao, descreverRecurso, estimarRenda, resumoParaSalvar, simularEntrada } from '../../utils/simulacao'
import { carregarSimulacoes, salvarSimulacao } from '../../store/simulacoes'
import SimulacoesSalvas from '../SimulacoesSalvas/SimulacoesSalvas'
import useMesAtual from '../../hooks/useMesAtual'
import { VEREDITOS } from './vereditos'
import { ANO_TABELA_INSS, DIAS_FERIAS_MAXIMO, DIAS_FERIAS_MINIMO, DIAS_VENDA_MAXIMO } from '../../utils/ferias'
import { mensagemErro } from '../../services/erros'
import './Simulacao.css'

const TIPOS = [
  { valor: 'emprestimo', rotulo: 'Empréstimo' },
  { valor: 'futuro', rotulo: 'Valor a receber' },
]

const MODOS_FERIAS = [
  { valor: 'calcular', rotulo: 'Calcular para mim' },
  { valor: 'manual', rotulo: 'Informar o valor' },
]

const ACOES = [
  { valor: 'manter', rotulo: 'Manter' },
  { valor: 'antecipar', rotulo: 'Antecipar' },
  { valor: 'quitar', rotulo: 'Quitar' },
]

const mesmaDecisao = (atual, aplicada) => (atual?.acao ?? 'manter') === (aplicada?.acao ?? 'manter')
  && (aplicada?.acao !== 'antecipar' || atual?.quantidade === aplicada.quantidade)
const paraCampo = (valor) => (valor == null ? '' : valor.toFixed(2).replace('.', ','))
const formatarPercentual = (fracao) => `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const nomeMes = (mes) => formatarMes(mes).toLowerCase()

function origemEstimativa(meses) {
  if (meses.length === 0) return 'Sem receitas registradas em meses anteriores: informe o valor.'
  return `Sugestão: média de receitas de ${meses.length === 1 ? '1 mês anterior' : `${meses.length} meses anteriores`} (estimativa, pode alterar).`
}

function ItemDivida({ operacao, decisao, desconto, mesAtual, futuro, ocultar, onDecidir, onDesconto }) {
  const { divida, inicio, disponiveis } = operacao
  const quantidade = decisao?.quantidade || 1
  const valorFuturo = disponiveis * divida.valorParcela
  const descontoNumero = lerValor(desconto || '')
  const encerrada = disponiveis === 0

  return (
    <li className='simulacao-divida'>
      <div className='simulacao-divida-topo'>
        <strong>{divida.descricao}</strong>
        <span>
          {divida.fixa
            ? `Conta fixa de ${formatarMoeda(divida.valorParcela, ocultar)} por mês · pode ser apenas antecipada`
            : `${divida.futuras} ${divida.futuras === 1 ? 'parcela futura' : 'parcelas futuras'} de ${formatarMoeda(divida.valorParcela, ocultar)} · ${formatarMoeda(valorFuturo, ocultar)}`}
          {divida.cartao && ` · ${divida.cartao}`}
          {!divida.fixa && inicio > 0 && (encerrada
            ? ' · termina antes de o valor entrar'
            : ` · ${disponiveis} ${disponiveis === 1 ? 'restante' : 'restantes'} quando o valor entrar`)}
        </span>
      </div>

      <div className='simulacao-segmento' role='radiogroup' aria-label={`O que fazer com ${divida.descricao}`}>
        {ACOES.filter((acao) => !(divida.fixa && acao.valor === 'quitar')).map((acao) => (
          <button
            key={acao.valor}
            type='button'
            role='radio'
            aria-checked={operacao.acao === acao.valor}
            className={operacao.acao === acao.valor ? 'simulacao-segmento-ativo' : ''}
            disabled={(encerrada && acao.valor !== 'manter') || (acao.valor === 'antecipar' && disponiveis < 2)}
            onClick={() => onDecidir(acao.valor === 'antecipar' ? { acao: 'antecipar', quantidade: 1 } : { acao: acao.valor })}
          >
            {acao.rotulo}
          </button>
        ))}
      </div>

      {operacao.acao === 'antecipar' && (
        <div className='simulacao-contador'>
          <span id={`antecipar-${divida.id}`}>Antecipar as próximas</span>
          <div role='group' aria-labelledby={`antecipar-${divida.id}`}>
            <button type='button' onClick={() => onDecidir({ acao: 'antecipar', quantidade: quantidade - 1 })} disabled={quantidade <= 1} aria-label='Menos uma parcela'>
              <MdRemove size={18} />
            </button>
            <strong>{quantidade}</strong>
            <button type='button' onClick={() => onDecidir({ acao: 'antecipar', quantidade: quantidade + 1 })} disabled={quantidade >= (divida.fixa ? MESES_ANALISE - inicio : disponiveis - 1)} aria-label='Mais uma parcela'>
              <MdAdd size={18} />
            </button>
          </div>
          <span>{quantidade === 1 ? 'parcela' : 'parcelas'}</span>
        </div>
      )}

      {!divida.fixa && !encerrada && (
        <label className='simulacao-campo simulacao-campo-compacto'>
          <span>Desconto se quitar {inicio > 0 ? 'ao receber' : 'agora'} <em>(opcional)</em></span>
          <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={desconto || ''} onChange={(e) => onDesconto(e.target.value)} />
          {descontoNumero > 0 && valorFuturo > 0 && (
            <small>{formatarPercentual(Math.min(descontoNumero, valorFuturo) / valorFuturo)} do valor das parcelas futuras. Ao antecipar só parte, o desconto é proporcional.</small>
          )}
        </label>
      )}

      {operacao.quantidade > 0 && (
        <p className='simulacao-divida-resultado'>
          Paga {formatarMoeda(operacao.desembolso, ocultar)}
          {operacao.desconto > 0 && ` · desconto de ${formatarMoeda(operacao.desconto, ocultar)}`}
          {operacao.acao === 'quitar'
            ? ` · deixa de pagar ${formatarMoeda(divida.valorParcela, ocultar)} por mês`
            : ` · sem essa parcela até ${nomeMes(deslocarMes(mesAtual, inicio + operacao.quantidade))}`}
        </p>
      )}

      {operacao.acao === 'antecipar' && (
        <p className='simulacao-alerta' role='note'>
          <MdWarningAmber size={18} aria-hidden='true' />
          A parcela de {formatarMoeda(divida.valorParcela, ocultar)} volta a ser cobrada em {nomeMes(deslocarMes(mesAtual, inicio + operacao.quantidade + 1))}
          {futuro ? '.' : ' e soma com a parcela do empréstimo, se ele ainda estiver sendo pago.'}
        </p>
      )}
    </li>
  )
}

// Estimativa de quanto das férias é livre para gastar. Sempre aproximada.
function ResultadoFerias({ ferias, ocultar }) {
  const formatar = (numero) => formatarMoeda(numero, ocultar)
  const vendeu = ferias.vendidos > 0

  return (
    <div className='simulacao-ferias' role='status'>
      <h3>Quanto das férias você pode gastar</h3>
      <p className='simulacao-ferias-valor'>
        <small>Aproximadamente</small>
        <strong>{formatar(ferias.livre)}</strong>
      </p>

      <dl className='simulacao-ferias-composicao'>
        <div><dt>1/3 de férias</dt><dd>+ {formatar(ferias.terco)}</dd></div>
        <div><dt>INSS a mais no mês das férias</dt><dd>− {formatar(ferias.inssExtra)}</dd></div>
        {vendeu && <div><dt>Venda de {ferias.vendidos} {ferias.vendidos === 1 ? 'dia' : 'dias'} com 1/3</dt><dd>+ {formatar(ferias.abono + ferias.tercoAbono)}</dd></div>}
      </dl>

      <p>
        O recibo de férias deve vir com aproximadamente <strong>{formatar(ferias.reciboLiquido)}</strong> líquidos.
        Desse valor, cerca de <strong>{formatar(ferias.adiantamento)}</strong> é o salário dos {ferias.dias} dias de férias pago adiantado:
        ele virá a menos no próximo pagamento, por isso não entra no valor livre.
      </p>

      <ul className='simulacao-ferias-notas'>
        {ferias.desconsiderados.length > 0 && (
          <li>
            Este valor não considera {juntarLista(ferias.desconsiderados)}, {ferias.desconsiderados.length === 1 ? 'que não foi preenchida' : 'que não foram preenchidas'} ou {ferias.desconsiderados.length === 1 ? 'está zerada' : 'estão zeradas'}.
          </li>
        )}
        {ferias.podeTerIr && <li>Pode haver desconto de Imposto de Renda, que não está incluído: o valor livre pode ser menor.</li>}
        <li>É uma estimativa com a tabela do INSS de {ANO_TABELA_INSS}. O valor exato depende da folha de pagamento da sua empresa.</li>
      </ul>

      <p className='simulacao-ferias-proximo'>
        Se quiser só saber quanto poderá gastar nas férias, pode parar aqui. Abaixo, veja como usar esse valor em compras ou para quitar e antecipar dívidas.
      </p>
    </div>
  )
}

// Compras simuladas pagas à vista com o valor a receber; o que sobra fica para as dívidas.
function ListaCompras({ compras, onAlterar }) {
  function alterar(id, campos) {
    onAlterar(compras.map((compra) => (compra.id === id ? { ...compra, ...campos } : compra)))
  }

  function adicionar() {
    onAlterar([...compras, { id: `compra-${Date.now()}`, descricao: '', valor: '' }])
  }

  return (
    <section className='simulacao-secao'>
      <h2>Compras com esse valor</h2>
      <p className='simulacao-dica'>O que pretende comprar à vista com o valor recebido. Não são adicionadas às suas movimentações.</p>

      {compras.length > 0 && (
        <ul className='simulacao-dividas'>
          {compras.map((compra) => (
            <li key={compra.id} className='simulacao-divida'>
              <div className='simulacao-linha-dois'>
                <label className='simulacao-campo simulacao-campo-compacto'>
                  <span>Descrição</span>
                  <input type='text' placeholder='Ex.: bateria do carro' value={compra.descricao} onChange={(e) => alterar(compra.id, { descricao: e.target.value })} />
                </label>
                <label className='simulacao-campo simulacao-campo-compacto'>
                  <span>Valor</span>
                  <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={compra.valor} onChange={(e) => alterar(compra.id, { valor: e.target.value })} />
                </label>
              </div>
              <div className='simulacao-compra-rodape'>
                <small>{lerValor(compra.valor || '') > 0 ? 'Pago com o valor recebido.' : 'Informe o valor.'}</small>
                <button type='button' className='simulacao-nova' onClick={() => onAlterar(compras.filter((item) => item.id !== compra.id))}>
                  <MdDeleteOutline size={16} aria-hidden='true' />Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type='button' className='simulacao-usar simulacao-adicionar' onClick={adicionar}>
        <MdAdd size={16} aria-hidden='true' />Adicionar compra
      </button>
    </section>
  )
}

function LinhaAntesDepois({ titulo, antes, depois, composicao, diferenca, textoDiferenca, alerta, formatar }) {
  return (
    <div className='simulacao-final-item'>
      <h3>{titulo}</h3>
      <div className='simulacao-final-valores'>
        <div>
          <small>Antes</small>
          <strong>{formatar(antes)}</strong>
        </div>
        <MdArrowForward size={20} aria-hidden='true' />
        <div>
          <small>Depois</small>
          <strong>{formatar(depois)}</strong>
        </div>
      </div>
      <small>{composicao}</small>
      <p className={diferenca <= 0 ? 'simulacao-final-bom' : 'simulacao-final-ruim'}>{textoDiferenca}</p>
      {alerta && <p className='simulacao-alerta'><MdWarningAmber size={18} aria-hidden='true' />{alerta}</p>}
    </div>
  )
}

// Resultado final em linguagem direta: quanto pagava e quanto vai pagar.
function AntesDepois({ comparativo, resumo, restante, emprestimo, formatar }) {
  const aumentoMes = -comparativo.economiaMes

  return (
    <section className='simulacao-secao simulacao-final'>
      <h2>Antes e depois da simulação</h2>

      <LinhaAntesDepois
        titulo={emprestimo.futuro && emprestimo.inicio > 0 ? `Parcelas de ${nomeMes(comparativo.mesReferencia)}` : 'Parcelas do mês'}
        antes={comparativo.parcelasMesAntes}
        depois={comparativo.parcelasMesDepois}
        composicao={emprestimo.futuro
          ? `Primeiro mês depois de receber ${emprestimo.rotulo}. Depois: ${formatar(comparativo.parcelamentosMesDepois)} de parcelamentos.`
          : `Depois: ${formatar(comparativo.parcelamentosMesDepois)} de parcelamentos + ${formatar(comparativo.emprestimoMes)} do empréstimo.`}
        diferenca={aumentoMes}
        textoDiferenca={aumentoMes <= 0 ? `Economia de ${formatar(comparativo.economiaMes)} por mês` : `Aumento de ${formatar(aumentoMes)} por mês`}
        alerta={comparativo.maiorMes && `Em ${nomeMes(comparativo.maiorMes.mes)} as parcelas do mês sobem para ${formatar(comparativo.maiorMes.valor)}, quando parcelas antecipadas voltam a ser cobradas.`}
        formatar={formatar}
      />

      <LinhaAntesDepois
        titulo='Total ainda a pagar'
        antes={comparativo.totalAbertoAntes}
        depois={comparativo.totalAbertoDepois}
        composicao={`Antes: parcelas futuras dos parcelamentos. Depois: ${formatar(comparativo.parcelamentosDepois)} de parcelamentos${emprestimo.futuro ? '' : ` + ${formatar(emprestimo.total)} do empréstimo`}.${comparativo.temContaFixa ? ' Contas fixas não entram neste total, pois não têm fim.' : ''}`}
        diferenca={comparativo.diferencaTotal}
        textoDiferenca={comparativo.diferencaTotal <= 0
          ? `${formatar(-comparativo.diferencaTotal)} a menos no total`
          : emprestimo.futuro
            ? `${formatar(comparativo.diferencaTotal)} a mais no total`
            : `${formatar(comparativo.diferencaTotal)} a mais no total = custo do empréstimo (${formatar(emprestimo.custo)}) + valor não usado em dívidas (${formatar(restante)})${resumo.desconto > 0 ? ` − descontos (${formatar(resumo.desconto)})` : ''}`}
        formatar={formatar}
      />
    </section>
  )
}

// Editor de uma simulação. `rascunho.entrada` traz os campos de uma simulação salva
// (ao abrir ou duplicar); sem ela, começa vazio com a renda sugerida.
function EditorSimulacao({ rascunho, ocultar, onSalvo, onNova }) {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const mesAtual = useMesAtual()
  const estimativa = useMemo(() => estimarRenda(contas, mesAtual), [contas, mesAtual])
  const dispatch = useDispatch()
  const inicial = rascunho.entrada

  const [tipo, setTipo] = useState(inicial?.tipo ?? 'emprestimo')
  const [origem, setOrigem] = useState(inicial?.origem ?? ORIGENS_VALOR_FUTURO[0].valor)
  const [descricaoOrigem, setDescricaoOrigem] = useState(inicial?.descricaoOrigem ?? '')
  const [mesRecebimento, setMesRecebimento] = useState(inicial?.mesRecebimento ?? '')
  const [modoFerias, setModoFerias] = useState(inicial?.modoFerias ?? 'calcular')
  const [salarioBruto, setSalarioBruto] = useState(inicial?.salarioBruto ?? '')
  const [diasFerias, setDiasFerias] = useState(inicial?.diasFerias ?? '30')
  const [diasVendidos, setDiasVendidos] = useState(inicial?.diasVendidos ?? '')
  const [mediaAdicionais, setMediaAdicionais] = useState(inicial?.mediaAdicionais ?? '')
  const [valor, setValor] = useState(inicial?.valor ?? '')
  const [parcelas, setParcelas] = useState(inicial?.parcelas ?? '')
  const [valorParcela, setValorParcela] = useState(inicial?.valorParcela ?? '')
  const [renda, setRenda] = useState(() => inicial?.renda ?? paraCampo(estimativa.renda))
  const [decisoes, setDecisoes] = useState(inicial?.decisoes ?? {})
  // Combinação aplicada pelo botão "Usar" e as escolhas de antes dela (para desfazer em "Usado").
  const [aplicada, setAplicada] = useState(null)
  const [descontos, setDescontos] = useState(inicial?.descontos ?? {})
  const [compras, setCompras] = useState(inicial?.compras ?? [])
  const [nome, setNome] = useState(rascunho.nome)
  const [salvando, setSalvando] = useState(false)
  const [retornoSalvar, setRetornoSalvar] = useState(null)

  const formatar = (numero) => formatarMoeda(numero, ocultar)
  const entradaSalva = tipo === 'futuro'
    ? { tipo, origem, descricaoOrigem, mesRecebimento, valor, modoFerias, salarioBruto, diasFerias, diasVendidos, mediaAdicionais, compras, renda, decisoes, descontos }
    : { tipo, valor, parcelas, valorParcela, renda, decisoes, descontos }
  const { emprestimo, ferias, compras: comprasValidas, resultado, combinacoes, dividasAusentes } = simularEntrada({ contas, fechamento, mesAtual, entrada: entradaSalva, formatar })

  const { resumo } = resultado
  const futuro = tipo === 'futuro'
  const feriasCalculadas = futuro && origem === 'ferias' && modoFerias === 'calcular'
  const ultimoMes = deslocarMes(mesAtual, MESES_ANALISE - 1)
  const veredito = emprestimo.valido ? VEREDITOS[resultado.veredito] : null
  const analisavel = emprestimo.valido && resultado.restante >= 0
  const disponivelDividas = emprestimo.valido ? emprestimo.valor - resultado.usadoCompras : 0

  // A combinação aplicada segue em uso enquanto as dívidas dela mantiverem a escolha aplicada,
  // mesmo que outras dívidas sejam quitadas ou antecipadas depois. "Não usar em dívidas" deixa
  // de valer quando alguma dívida é escolhida. Sem combinação aplicada (ex.: simulação salva
  // reaberta), está em uso a combinação cujas escolhas são exatamente as atuais.
  const escolhasEmUso = chaveEscolhas(resumo.escolhidas)
  const aplicadaIntacta = Boolean(aplicada) && (Object.keys(aplicada.decisoes).length === 0
    ? resumo.escolhidas.length === 0
    : Object.entries(aplicada.decisoes).every(([id, decisao]) => mesmaDecisao(decisoes[id], decisao)))
  const emUso = (combinacao) => (aplicadaIntacta ? combinacao.chave === aplicada.chave : combinacao.chave === escolhasEmUso)

  // Trocar de uma combinação para outra mantém as escolhas de antes da primeira.
  function usarCombinacao(combinacao) {
    setAplicada({ chave: combinacao.chave, decisoes: combinacao.decisoes, anteriores: aplicadaIntacta ? aplicada.anteriores : decisoes })
    setDecisoes(combinacao.decisoes)
  }

  // Volta às escolhas de antes da combinação, preservando o que foi alterado depois em outras dívidas.
  function desfazerCombinacao() {
    if (!aplicadaIntacta) {
      setDecisoes({})
      return
    }
    const posteriores = Object.fromEntries(Object.entries(decisoes).filter(([id]) => !(id in aplicada.decisoes)))
    setDecisoes({ ...aplicada.anteriores, ...posteriores })
    setAplicada(null)
  }

  const nomeSugerido = emprestimo.valido ? descreverRecurso(emprestimo, formatarMoeda) : ''

  async function salvar(comoNova) {
    setSalvando(true)
    setRetornoSalvar(null)
    // Guarda o nome das dívidas escolhidas para identificá-las se forem removidas depois.
    const nomesDividas = Object.fromEntries(resultado.dividas.filter((divida) => decisoes[divida.id]).map((divida) => [divida.id, divida.descricao]))
    try {
      const salva = await dispatch(salvarSimulacao({
        id: comoNova ? null : rascunho.id,
        nome: nome.trim() || nomeSugerido,
        entrada: { ...entradaSalva, nomesDividas },
        resumo: resumoParaSalvar({ emprestimo, compras: comprasValidas, resultado, combinacoes })
      })).unwrap()
      setNome(salva.nome)
      setRetornoSalvar({ erro: false, mensagem: comoNova || !rascunho.id ? 'Simulação salva. Veja em "Salvas".' : 'Alterações salvas.' })
      onSalvo(salva)
    } catch (error) {
      setRetornoSalvar({ erro: true, mensagem: `Não foi possível salvar: ${mensagemErro(error)}` })
    }
    setSalvando(false)
  }

  return (
    <div className='simulacao-editor'>
      {rascunho.id && <p className='simulacao-editando'>Editando a simulação salva <strong>{rascunho.nome}</strong>.</p>}
      {dividasAusentes.length > 0 && (
        <p className='simulacao-alerta' role='note'>
          <MdWarningAmber size={18} aria-hidden='true' />
          Estas dívidas da simulação salva não existem mais e foram desconsideradas: {juntarLista(dividasAusentes)}.
        </p>
      )}

      <section className='simulacao-secao'>
        <h2>De onde vem o dinheiro</h2>
        <div className='simulacao-segmento' role='radiogroup' aria-label='De onde vem o dinheiro'>
          {TIPOS.map((item) => (
            <button
              key={item.valor}
              type='button'
              role='radio'
              aria-checked={tipo === item.valor}
              className={tipo === item.valor ? 'simulacao-segmento-ativo' : ''}
              onClick={() => setTipo(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        {futuro ? (
          <>
            <div className={feriasCalculadas ? 'simulacao-linha-dois' : 'simulacao-linha-tres'}>
              <label className='simulacao-campo'>
                <span>Origem</span>
                <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
                  {ORIGENS_VALOR_FUTURO.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
                </select>
              </label>
              {!feriasCalculadas && (
                <label className='simulacao-campo'>
                  <span>Valor a receber</span>
                  <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={valor} onChange={(e) => setValor(e.target.value)} />
                </label>
              )}
              <label className='simulacao-campo'>
                <span>{origem === 'ferias' ? 'Mês das férias' : 'Mês em que entra'}</span>
                <input type='month' min={mesAtual} max={ultimoMes} value={mesRecebimento} onChange={(e) => setMesRecebimento(e.target.value)} />
              </label>
            </div>

            {origem === 'ferias' && (
              <>
                <div className='simulacao-segmento' role='radiogroup' aria-label='Como informar o valor das férias'>
                  {MODOS_FERIAS.map((item) => (
                    <button
                      key={item.valor}
                      type='button'
                      role='radio'
                      aria-checked={modoFerias === item.valor}
                      className={modoFerias === item.valor ? 'simulacao-segmento-ativo' : ''}
                      onClick={() => setModoFerias(item.valor)}
                    >
                      {item.rotulo}
                    </button>
                  ))}
                </div>

                {feriasCalculadas ? (
                  <>
                    <div className='simulacao-linha-dois'>
                      <label className='simulacao-campo'>
                        <span>Salário bruto</span>
                        <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={salarioBruto} onChange={(e) => setSalarioBruto(e.target.value)} />
                      </label>
                      <label className='simulacao-campo'>
                        <span>Dias de férias</span>
                        <input type='number' inputMode='numeric' min={DIAS_FERIAS_MINIMO} max={DIAS_FERIAS_MAXIMO} value={diasFerias} onChange={(e) => setDiasFerias(e.target.value)} />
                      </label>
                      <label className='simulacao-campo'>
                        <span>Dias vendidos <em>(opcional)</em></span>
                        <input type='number' inputMode='numeric' min='0' max={DIAS_VENDA_MAXIMO} placeholder='0' value={diasVendidos} onChange={(e) => setDiasVendidos(e.target.value)} />
                        <small>Até {DIAS_VENDA_MAXIMO} dias (abono pecuniário).</small>
                      </label>
                      <label className='simulacao-campo'>
                        <span>Média de horas extras e adicionais <em>(opcional)</em></span>
                        <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={mediaAdicionais} onChange={(e) => setMediaAdicionais(e.target.value)} />
                        <small>Média mensal dos últimos 12 meses.</small>
                      </label>
                    </div>
                    {ferias?.valido && <ResultadoFerias ferias={ferias} ocultar={ocultar} />}
                  </>
                ) : (
                  <p className='simulacao-dica'>
                    Parte do recibo de férias é o salário dos dias de descanso pago adiantado, que virá a menos no próximo pagamento.
                    Se não souber quanto é livre para gastar, use "Calcular para mim".
                  </p>
                )}
              </>
            )}
            {origem === 'outro' && (
              <label className='simulacao-campo'>
                <span>Descrição <em>(opcional)</em></span>
                <input type='text' placeholder='Ex.: venda do carro, bônus' value={descricaoOrigem} onChange={(e) => setDescricaoOrigem(e.target.value)} />
              </label>
            )}

            {emprestimo.valido ? (
              <dl className='simulacao-calculos simulacao-calculos-dois'>
                <div><dt>Entra em</dt><dd>{formatarMes(emprestimo.mes)}</dd></div>
                <div><dt>Até lá</dt><dd>{emprestimo.inicio === 0 ? 'Disponível neste mês' : `${emprestimo.inicio} ${emprestimo.inicio === 1 ? 'mês' : 'meses'} de parcelas normais`}</dd></div>
              </dl>
            ) : (
              <p className='simulacao-dica'>
                {emprestimo.vencido
                  ? 'O mês informado já passou. Atualize o mês em que o valor entra.'
                  : ferias && !ferias.valido
                    ? `${ferias.erros.join(' ')} Informe também o mês das férias, de ${nomeMes(mesAtual)} até ${nomeMes(ultimoMes)}.`
                    : `Informe o valor e o mês em que ele entra, de ${nomeMes(mesAtual)} até ${nomeMes(ultimoMes)}.`}
              </p>
            )}
          </>
        ) : (
          <>
            <div className='simulacao-linha-tres'>
              <label className='simulacao-campo'>
                <span>Valor a contratar</span>
                <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={valor} onChange={(e) => setValor(e.target.value)} />
              </label>
              <label className='simulacao-campo'>
                <span>Parcelas</span>
                <input type='number' inputMode='numeric' min='1' placeholder='0' value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
              </label>
              <label className='simulacao-campo'>
                <span>Valor da parcela</span>
                <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={valorParcela} onChange={(e) => setValorParcela(e.target.value)} />
              </label>
            </div>

            {emprestimo.valido ? (
              <dl className='simulacao-calculos'>
                <div><dt>Total a pagar</dt><dd>{formatar(emprestimo.total)}</dd></div>
                <div>
                  <dt>Custo adicional</dt>
                  <dd className={emprestimo.custo > 0 ? 'valor-negativo' : ''}>{formatar(emprestimo.custo)} ({formatarPercentual(emprestimo.custoPercentual)})</dd>
                </div>
                <div><dt>Juros equivalentes</dt><dd>≈ {formatarPercentual(emprestimo.taxaMensal)} ao mês</dd></div>
              </dl>
            ) : (
              <p className='simulacao-dica'>Informe os três valores. O custo e os juros equivalentes são calculados a partir deles.</p>
            )}
          </>
        )}
      </section>

      <section className='simulacao-secao'>
        <h2>Seu orçamento mensal</h2>
        <label className='simulacao-campo'>
          <span>Renda mensal</span>
          <input type='text' inputMode='decimal' placeholder='R$ 0,00' value={renda} onChange={(e) => setRenda(e.target.value)} />
          <small>{origemEstimativa(estimativa.meses)}</small>
        </label>
        <p className='simulacao-saldo'>
          Saldo disponível hoje: <strong className={resultado.saldoAtual < 0 ? 'valor-negativo' : ''}>{formatar(resultado.saldoAtual)}</strong>
          <small>Já considera as receitas, despesas e a parcela deste mês de cada parcelamento.</small>
        </p>
      </section>

      {futuro && <ListaCompras compras={compras} onAlterar={setCompras} />}

      <section className='simulacao-secao'>
        <h2>Dívidas para quitar ou antecipar</h2>

        {resultado.dividas.length === 0 ? (
          <>
            <p className='simulacao-dica'>Você não tem parcelamentos com parcelas futuras que você paga.</p>
            {futuro && emprestimo.valido && (
              <div className={`simulacao-uso ${resultado.restante < 0 ? 'simulacao-uso-excedido' : ''}`}>
                <span>Compras: <strong>{formatar(resultado.usadoCompras)}</strong> de {formatar(emprestimo.valor)}</span>
                <span>{resultado.restante < 0 ? `Excede ${formatar(-resultado.restante)}` : `Sobra ${formatar(resultado.restante)}`}</span>
              </div>
            )}
          </>
        ) : (
          <>
            {futuro && emprestimo.valido && emprestimo.inicio > 0 && (
              <p className='simulacao-dica'>
                Até {nomeMes(emprestimo.mes)} as parcelas seguem normais. Quitar ou antecipar vale a partir de {nomeMes(deslocarMes(emprestimo.mes, 1))}.
              </p>
            )}

            {emprestimo.valido && (
              <div className={`simulacao-uso ${resultado.restante < 0 ? 'simulacao-uso-excedido' : ''}`}>
                <span>
                  {futuro && resultado.usadoCompras > 0
                    ? <>Compras <strong>{formatar(resultado.usadoCompras)}</strong> + dívidas <strong>{formatar(resumo.usado)}</strong> de {formatar(emprestimo.valor)}</>
                    : <>Usado: <strong>{formatar(resumo.usado)}</strong> de {formatar(emprestimo.valor)}</>}
                </span>
                <span>{resultado.restante < 0 ? `Excede ${formatar(-resultado.restante)}` : `Sobra ${formatar(resultado.restante)}`}</span>
              </div>
            )}

            {combinacoes.length > 0 && (
              <div className='simulacao-recomendacoes'>
                <h3>{futuro ? 'Combinações para usar o valor' : 'Melhores combinações de quitação'}</h3>
                {futuro ? (
                  <p className='simulacao-dica'>
                    Formas de usar os {formatar(disponivelDividas)} {resultado.usadoCompras > 0 ? 'que sobram depois das compras' : 'disponíveis'}: primeiro as que eliminam parcelas de vez,
                    depois as que liberam mais por mês, sem deixar o saldo negativo. Use uma como ponto de partida e ajuste na lista abaixo.
                  </p>
                ) : (
                  <p className='simulacao-dica'>
                    Testamos as combinações que cabem no empréstimo. Prioridade: liberar por mês, já descontando a parcela do empréstimo,
                    ao menos {formatarPercentual(resumo.percentualMeta)} das parcelas atuais ({formatar(resumo.meta)}), nenhum mês com saldo negativo e maior economia mensal.
                    Antecipações parciais podem ser ajustadas na lista abaixo.
                  </p>
                )}
                <ol>
                  {combinacoes.map((combinacao, indice) => (
                    <li key={combinacao.chave || 'nenhuma'}>
                      <div>
                        <strong>{indice + 1}. {descreverCombinacao(combinacao)}</strong>
                        <span>
                          Usa {formatar(combinacao.usado)} · sobra {formatar(combinacao.restante)}
                          {combinacao.economiaMensal > 0 && ` · ${formatar(combinacao.economiaMensal)} a menos por mês`}
                          {combinacao.desconto > 0 && ` · desconto de ${formatar(combinacao.desconto)}`}
                        </span>
                        {!futuro && (
                          <span className={combinacao.atingeMeta ? 'valor-positivo' : 'valor-negativo'}>
                            Economia líquida: {formatar(combinacao.economiaLiquida)}/mês · {combinacao.atingeMeta ? 'atinge' : 'não atinge'} a meta de {formatar(combinacao.meta)}
                          </span>
                        )}
                      </div>
                      {emUso(combinacao) ? (
                        <button
                          type='button'
                          className='simulacao-usar simulacao-usado'
                          aria-pressed='true'
                          title='Desfazer e voltar às escolhas anteriores'
                          onClick={desfazerCombinacao}
                        >
                          <MdCheck size={16} aria-hidden='true' />Usado
                        </button>
                      ) : (
                        <button type='button' className='simulacao-usar' onClick={() => usarCombinacao(combinacao)}>Usar</button>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <ul className='simulacao-dividas'>
              {resultado.operacoes.map((operacao) => (
                <ItemDivida
                  key={operacao.divida.id}
                  operacao={operacao}
                  decisao={decisoes[operacao.divida.id]}
                  desconto={descontos[operacao.divida.id]}
                  mesAtual={mesAtual}
                  futuro={futuro}
                  ocultar={ocultar}
                  onDecidir={(decisao) => setDecisoes({ ...decisoes, [operacao.divida.id]: decisao })}
                  onDesconto={(texto) => setDescontos({ ...descontos, [operacao.divida.id]: texto })}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      {analisavel && (
        <AntesDepois comparativo={resultado.comparativo} resumo={resumo} restante={resultado.restante} emprestimo={emprestimo} formatar={formatar} />
      )}

      {!futuro && emprestimo.valido && (
        <section className={`simulacao-secao simulacao-veredito simulacao-veredito-${resultado.veredito}`}>
          <div className='simulacao-veredito-topo'>
            {veredito.icone}
            <h2>{veredito.rotulo}</h2>
          </div>
          <p>{resultado.explicacao}</p>

          {analisavel && (
            <div className='simulacao-pontos'>
              {[
                { titulo: 'Pontos positivos', itens: resultado.positivos, classe: 'positivo', icone: <MdCheckCircle size={18} /> },
                { titulo: 'Pontos negativos', itens: resultado.negativos, classe: 'negativo', icone: <MdRemoveCircleOutline size={18} /> },
                { titulo: 'Riscos', itens: resultado.riscos, classe: 'risco', icone: <MdWarningAmber size={18} /> },
                { titulo: 'Limitações da análise', itens: resultado.limitacoes, classe: 'limitacao', icone: <MdInfoOutline size={18} /> },
              ].filter((grupo) => grupo.itens.length > 0).map((grupo) => (
                <div key={grupo.titulo} className={`simulacao-pontos-${grupo.classe}`}>
                  <h3>{grupo.titulo}</h3>
                  <ul>
                    {grupo.itens.map((texto) => (
                      <li key={texto}>{grupo.icone}<span>{texto}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {analisavel && (
        <>
          <section className='simulacao-secao'>
            <h2>Resumo</h2>
            <dl className='simulacao-resumo'>
              {futuro ? (
                <>
                  <div><dt>{emprestimo.rotulo}</dt><dd>{formatar(emprestimo.valor)}</dd></div>
                  <div><dt>Entra em</dt><dd>{formatarMes(emprestimo.mes)}</dd></div>
                  {comprasValidas.map((compra) => (
                    <div key={compra.id}>
                      <dt>{compra.descricao}</dt>
                      <dd>{formatar(compra.valor)}</dd>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div><dt>Empréstimo</dt><dd>{formatar(emprestimo.valor)}</dd></div>
                  <div><dt>Parcelas</dt><dd>{emprestimo.parcelas} × {formatar(emprestimo.valorParcela)}</dd></div>
                  <div><dt>Custo adicional</dt><dd>{formatar(emprestimo.custo)}</dd></div>
                </>
              )}
              <div><dt>Para quitar contas</dt><dd>{formatar(resumo.usadoQuitacoes)}</dd></div>
              <div><dt>Para antecipar parcelas</dt><dd>{formatar(resumo.usadoAntecipacoes)}</dd></div>
              <div><dt>Restante</dt><dd>{formatar(resultado.restante)}</dd></div>
              <div><dt>Compromissos eliminados</dt><dd>{resumo.quitadas.length}</dd></div>
              <div><dt>Economia por mês</dt><dd>{formatar(resumo.economiaMensal)}</dd></div>
              {resumo.economiaTemporaria > 0 && (
                <div className='simulacao-resumo-alerta'>
                  <dt>Dos quais temporários (antecipações)</dt>
                  <dd>{formatar(resumo.economiaTemporaria)}</dd>
                </div>
              )}
              {!futuro && (
                <>
                  <div>
                    <dt>Economia líquida por mês</dt>
                    <dd className={resumo.atingeMeta ? 'valor-positivo' : 'valor-negativo'}>{formatar(resumo.economiaLiquida)}</dd>
                  </div>
                  <div>
                    <dt>Meta ({formatarPercentual(resumo.percentualMeta)} das parcelas)</dt>
                    <dd>{formatar(resumo.meta)}</dd>
                    <small className='simulacao-resumo-nota'>
                      {resumo.parcelasAtuais > LIMITE_META_REDUZIDA
                        ? `Parcelas acima de ${formatar(LIMITE_META_REDUZIDA)}: meta de ${formatarPercentual(META_LIBERACAO_REDUZIDA)}.`
                        : `Até ${formatar(LIMITE_META_REDUZIDA)} em parcelas: meta de ${formatarPercentual(META_LIBERACAO)}.`}
                    </small>
                  </div>
                </>
              )}
              {resumo.desconto > 0 && <div><dt>Desconto por antecipação</dt><dd>{formatar(resumo.desconto)}</dd></div>}
              {!futuro && <div><dt>Novo compromisso mensal</dt><dd>{formatar(emprestimo.valorParcela)}</dd></div>}
            </dl>
            {resultado.retornos.length > 0 && (
              <div className='simulacao-retornos' role='note'>
                <h3><MdWarningAmber size={18} aria-hidden='true' />Parcelas antecipadas que voltam a ser cobradas</h3>
                <ul>
                  {resultado.retornos.map((retorno) => (
                    <li key={retorno.divida.id}>
                      <strong>{retorno.divida.descricao}</strong>: a parcela de {formatar(retorno.divida.valorParcela)} volta em {nomeMes(retorno.mes)} e segue {retorno.ate ? `até ${nomeMes(retorno.ate)}` : 'todo mês (conta fixa)'}.
                      {retorno.comEmprestimo && (
                        <> Junto com a parcela do empréstimo, serão {formatar(retorno.divida.valorParcela)} + {formatar(emprestimo.valorParcela)} = <strong>{formatar(retorno.totalComEmprestimo)}</strong> por mês fora demais parcelamentos.</>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

        </>
      )}

      {analisavel && (
        <section className='simulacao-secao simulacao-salvar'>
          <h2>{rascunho.id ? 'Simulação salva' : 'Salvar simulação'}</h2>
          <label className='simulacao-campo'>
            <span>Nome do cenário</span>
            <input type='text' placeholder={nomeSugerido} value={nome} onChange={(e) => setNome(e.target.value)} />
            <small>Salvar não altera suas movimentações: serve para consultar, duplicar e comparar depois.</small>
          </label>
          {retornoSalvar && (
            <p className={retornoSalvar.erro ? 'simulacao-salvar-erro' : 'simulacao-salvar-ok'} role='alert'>{retornoSalvar.mensagem}</p>
          )}
          <div className='simulacao-salvar-acoes'>
            <button type='button' className='botao botao-primario' disabled={salvando} onClick={() => salvar(false)}>
              {salvando ? 'Salvando...' : rascunho.id ? 'Salvar alterações' : 'Salvar simulação'}
            </button>
            {rascunho.id && (
              <button type='button' className='botao botao-secundario' disabled={salvando} onClick={() => salvar(true)}>Salvar como nova</button>
            )}
          </div>
        </section>
      )}

      {(rascunho.id || rascunho.entrada) && (
        <button type='button' className='simulacao-nova' onClick={onNova}>Começar uma nova simulação</button>
      )}
    </div>
  )
}

// Abas da Simulação: o editor e as simulações salvas. O editor fica montado (só oculto)
// ao trocar de aba, para não perder o que foi preenchido.
function Simulacao({ ocultar, onAbrirTutorial }) {
  const [aba, setAba] = useState('editor')
  const [rascunho, setRascunho] = useState({ chave: 0, id: null, nome: '', entrada: null })
  const { lista, carregado } = useSelector((state) => state.simulacoes)
  const dispatch = useDispatch()

  useEffect(() => {
    if (!carregado) dispatch(carregarSimulacoes())
  }, [carregado, dispatch])

  function abrir(simulacao, duplicar = false) {
    setRascunho((atual) => ({
      chave: atual.chave + 1,
      id: duplicar ? null : simulacao.id,
      nome: duplicar ? `${simulacao.nome} (cópia)` : simulacao.nome,
      entrada: simulacao.entrada
    }))
    setAba('editor')
    window.scrollTo({ top: 0 })
  }

  function nova() {
    setRascunho((atual) => ({ chave: atual.chave + 1, id: null, nome: '', entrada: null }))
    window.scrollTo({ top: 0 })
  }

  return (
    <div className='simulacao'>
      <div className='simulacao-topo'>
        <p className='simulacao-aviso'>
          <MdShield size={18} aria-hidden='true' />
          Simulações não alteram suas movimentações, parcelas nem saldo reais.
        </p>
        <button type='button' className='simulacao-ajuda' onClick={onAbrirTutorial}>
          <MdHelpOutline size={18} aria-hidden='true' />Como funciona
        </button>
      </div>

      <div className='simulacao-abas' role='tablist' aria-label='Simulação'>
        <button role='tab' aria-selected={aba === 'editor'} className={aba === 'editor' ? 'simulacao-aba-ativa' : ''} onClick={() => setAba('editor')}>
          {rascunho.id ? 'Simulação aberta' : 'Nova simulação'}
        </button>
        <button role='tab' aria-selected={aba === 'salvas'} className={aba === 'salvas' ? 'simulacao-aba-ativa' : ''} onClick={() => setAba('salvas')}>
          Salvas{lista.length > 0 && ` (${lista.length})`}
        </button>
      </div>

      <div hidden={aba !== 'editor'}>
        <EditorSimulacao
          key={rascunho.chave}
          rascunho={rascunho}
          ocultar={ocultar}
          onSalvo={(salva) => setRascunho((atual) => ({ ...atual, id: salva.id, nome: salva.nome }))}
          onNova={nova}
        />
      </div>
      {aba === 'salvas' && (
        <SimulacoesSalvas ocultar={ocultar} rascunhoId={rascunho.id} onAbrir={(simulacao) => abrir(simulacao)} onDuplicar={(simulacao) => abrir(simulacao, true)} />
      )}
    </div>
  )
}

export default Simulacao
