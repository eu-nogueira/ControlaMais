import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdArrowForward, MdCheck, MdCheckCircle, MdInfoOutline, MdRemove, MdRemoveCircleOutline, MdShield, MdWarningAmber } from 'react-icons/md'
import { formatarMoeda, lerValor } from '../../utils/formatar'
import { deslocarMes, formatarMes } from '../../utils/mes'
import { LIMITE_META_REDUZIDA, MESES_ANALISE, META_LIBERACAO, META_LIBERACAO_REDUZIDA, descreverCombinacao, estimarRenda, resumoParaSalvar, simularEntrada } from '../../utils/simulacao'
import { carregarSimulacoes, salvarSimulacao } from '../../store/simulacoes'
import SimulacoesSalvas from '../SimulacoesSalvas/SimulacoesSalvas'
import useMesAtual from '../../hooks/useMesAtual'
import { VEREDITOS } from './vereditos'
import './Simulacao.css'


const ACOES = [
  { valor: 'manter', rotulo: 'Manter' },
  { valor: 'antecipar', rotulo: 'Antecipar' },
  { valor: 'quitar', rotulo: 'Quitar' },
]

const paraCampo = (valor) => (valor == null ? '' : valor.toFixed(2).replace('.', ','))
const formatarPercentual = (fracao) => `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const nomeMes = (mes) => formatarMes(mes).toLowerCase()

function origemEstimativa(meses) {
  if (meses.length === 0) return 'Sem receitas registradas em meses anteriores: informe o valor.'
  return `Sugestão: média de receitas de ${meses.length === 1 ? '1 mês anterior' : `${meses.length} meses anteriores`} (estimativa, pode alterar).`
}

function ItemDivida({ operacao, decisao, desconto, mesAtual, ocultar, onDecidir, onDesconto }) {
  const { divida } = operacao
  const quantidade = decisao?.quantidade || 1
  const valorFuturo = divida.futuras * divida.valorParcela
  const descontoNumero = lerValor(desconto || '')

  return (
    <li className='simulacao-divida'>
      <div className='simulacao-divida-topo'>
        <strong>{divida.descricao}</strong>
        <span>
          {divida.fixa
            ? `Conta fixa de ${formatarMoeda(divida.valorParcela, ocultar)} por mês · pode ser apenas antecipada`
            : `${divida.futuras} ${divida.futuras === 1 ? 'parcela futura' : 'parcelas futuras'} de ${formatarMoeda(divida.valorParcela, ocultar)} · ${formatarMoeda(valorFuturo, ocultar)}`}
          {divida.cartao && ` · ${divida.cartao}`}
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
            disabled={acao.valor === 'antecipar' && divida.futuras < 2}
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
            <button type='button' onClick={() => onDecidir({ acao: 'antecipar', quantidade: quantidade + 1 })} disabled={quantidade >= (divida.fixa ? MESES_ANALISE : divida.futuras - 1)} aria-label='Mais uma parcela'>
              <MdAdd size={18} />
            </button>
          </div>
          <span>{quantidade === 1 ? 'parcela' : 'parcelas'}</span>
        </div>
      )}

      {!divida.fixa && (
        <label className='simulacao-campo simulacao-campo-compacto'>
          <span>Desconto se quitar agora <em>(opcional)</em></span>
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
            : ` · sem essa parcela até ${nomeMes(deslocarMes(mesAtual, operacao.quantidade))}`}
        </p>
      )}

      {operacao.acao === 'antecipar' && (
        <p className='simulacao-alerta' role='note'>
          <MdWarningAmber size={18} aria-hidden='true' />
          A parcela de {formatarMoeda(divida.valorParcela, ocultar)} volta a ser cobrada em {nomeMes(deslocarMes(mesAtual, operacao.quantidade + 1))}
          {' '}e soma com a parcela do empréstimo, se ele ainda estiver sendo pago.
        </p>
      )}
    </li>
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
        titulo='Parcelas do mês'
        antes={comparativo.parcelasMesAntes}
        depois={comparativo.parcelasMesDepois}
        composicao={`Depois: ${formatar(comparativo.parcelamentosMesDepois)} de parcelamentos + ${formatar(comparativo.emprestimoMes)} do empréstimo.`}
        diferenca={aumentoMes}
        textoDiferenca={aumentoMes <= 0 ? `Economia de ${formatar(comparativo.economiaMes)} por mês` : `Aumento de ${formatar(aumentoMes)} por mês`}
        alerta={comparativo.maiorMes && `Em ${nomeMes(comparativo.maiorMes.mes)} as parcelas do mês sobem para ${formatar(comparativo.maiorMes.valor)}, quando parcelas antecipadas voltam a ser cobradas.`}
        formatar={formatar}
      />

      <LinhaAntesDepois
        titulo='Total ainda a pagar'
        antes={comparativo.totalAbertoAntes}
        depois={comparativo.totalAbertoDepois}
        composicao={`Antes: parcelas futuras dos parcelamentos. Depois: ${formatar(comparativo.parcelamentosDepois)} de parcelamentos + ${formatar(emprestimo.total)} do empréstimo.${comparativo.temContaFixa ? ' Contas fixas não entram neste total, pois não têm fim.' : ''}`}
        diferenca={comparativo.diferencaTotal}
        textoDiferenca={comparativo.diferencaTotal <= 0
          ? `${formatar(-comparativo.diferencaTotal)} a menos no total`
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

  const [valor, setValor] = useState(inicial?.valor ?? '')
  const [parcelas, setParcelas] = useState(inicial?.parcelas ?? '')
  const [valorParcela, setValorParcela] = useState(inicial?.valorParcela ?? '')
  const [renda, setRenda] = useState(() => inicial?.renda ?? paraCampo(estimativa.renda))
  const [decisoes, setDecisoes] = useState(inicial?.decisoes ?? {})
  const [descontos, setDescontos] = useState(inicial?.descontos ?? {})
  const [nome, setNome] = useState(rascunho.nome)
  const [salvando, setSalvando] = useState(false)
  const [retornoSalvar, setRetornoSalvar] = useState(null)

  const formatar = (numero) => formatarMoeda(numero, ocultar)
  const rendaNumero = lerValor(renda) || 0
  const entradaSalva = { valor, parcelas, valorParcela, renda, decisoes, descontos }
  const { emprestimo, resultado, combinacoes, dividasAusentes } = simularEntrada({ contas, fechamento, mesAtual, entrada: entradaSalva, formatar })

  const { resumo } = resultado
  const veredito = emprestimo.valido ? VEREDITOS[resultado.veredito] : null
  const analisavel = emprestimo.valido && resultado.veredito !== 'invalido'

  // A combinação está em uso quando as quitações escolhidas são exatamente as dela, sem antecipações.
  const quitadasEmUso = resultado.operacoes.filter((operacao) => operacao.acao === 'quitar').map((operacao) => operacao.divida.id).sort().join('|')
  const emUso = (combinacao) => resumo.antecipadas.length === 0 && [...combinacao.ids].sort().join('|') === quitadasEmUso

  function usarCombinacao(ids) {
    setDecisoes(Object.fromEntries(ids.map((id) => [id, { acao: 'quitar' }])))
  }

  const nomeSugerido = emprestimo.valido ? `Empréstimo de ${formatarMoeda(emprestimo.valor)} em ${emprestimo.parcelas}x` : ''

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
        resumo: resumoParaSalvar({ emprestimo, resultado, combinacoes })
      })).unwrap()
      setNome(salva.nome)
      setRetornoSalvar({ erro: false, mensagem: comoNova || !rascunho.id ? 'Simulação salva. Veja em "Salvas".' : 'Alterações salvas.' })
      onSalvo(salva)
    } catch (error) {
      setRetornoSalvar({ erro: true, mensagem: `Não foi possível salvar: ${error.message}` })
    }
    setSalvando(false)
  }

  return (
    <div className='simulacao-editor'>
      {rascunho.id && <p className='simulacao-editando'>Editando a simulação salva <strong>{rascunho.nome}</strong>.</p>}
      {dividasAusentes.length > 0 && (
        <p className='simulacao-alerta' role='note'>
          <MdWarningAmber size={18} aria-hidden='true' />
          Estas dívidas da simulação salva não existem mais e foram desconsideradas: {dividasAusentes.join(', ')}.
        </p>
      )}

      <section className='simulacao-secao'>
        <h2>Empréstimo</h2>
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

      <section className='simulacao-secao'>
        <h2>Dívidas para quitar ou antecipar</h2>

        {resultado.dividas.length === 0 ? (
          <p className='simulacao-dica'>Você não tem parcelamentos com parcelas futuras que você paga.</p>
        ) : (
          <>
            {emprestimo.valido && (
              <div className={`simulacao-uso ${resultado.restante < 0 ? 'simulacao-uso-excedido' : ''}`}>
                <span>Usado: <strong>{formatar(resumo.usado)}</strong> de {formatar(emprestimo.valor)}</span>
                <span>{resultado.restante < 0 ? `Excede ${formatar(-resultado.restante)}` : `Sobra ${formatar(resultado.restante)}`}</span>
              </div>
            )}

            {combinacoes.length > 0 && (
              <div className='simulacao-recomendacoes'>
                <h3>Melhores combinações de quitação</h3>
                <p className='simulacao-dica'>
                  Testamos as combinações que cabem no empréstimo. Prioridade: liberar por mês, já descontando a parcela do empréstimo,
                  ao menos {formatarPercentual(resumo.percentualMeta)} das parcelas atuais ({formatar(resumo.meta)}), nenhum mês com saldo negativo e maior economia mensal.
                  Antecipações parciais podem ser ajustadas na lista abaixo.
                </p>
                <ol>
                  {combinacoes.map((combinacao, indice) => (
                    <li key={combinacao.ids.join('-') || 'nenhuma'}>
                      <div>
                        <strong>{indice + 1}. {descreverCombinacao(combinacao)}</strong>
                        <span>
                          Usa {formatar(combinacao.usado)} · sobra {formatar(combinacao.restante)}
                          {combinacao.economiaMensal > 0 && ` · ${formatar(combinacao.economiaMensal)} a menos por mês`}
                          {combinacao.desconto > 0 && ` · desconto de ${formatar(combinacao.desconto)}`}
                        </span>
                        <span className={combinacao.atingeMeta ? 'valor-positivo' : 'valor-negativo'}>
                          Economia líquida: {formatar(combinacao.economiaLiquida)}/mês · {combinacao.atingeMeta ? 'atinge' : 'não atinge'} a meta de {formatar(combinacao.meta)}
                        </span>
                        {rendaNumero > 0 && (
                          <span className={combinacao.menor.saldo < 0 ? 'valor-negativo' : ''}>
                            Menor saldo projetado: {formatar(combinacao.menor.saldo)} em {nomeMes(combinacao.menor.mes)}
                          </span>
                        )}
                      </div>
                      {emUso(combinacao) ? (
                        <span className='simulacao-usar simulacao-usado'><MdCheck size={16} aria-hidden='true' />Usado</span>
                      ) : (
                        <button type='button' className='simulacao-usar' onClick={() => usarCombinacao(combinacao.ids)}>Usar</button>
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

      {emprestimo.valido && (
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
              <div><dt>Empréstimo</dt><dd>{formatar(emprestimo.valor)}</dd></div>
              <div><dt>Parcelas</dt><dd>{emprestimo.parcelas} × {formatar(emprestimo.valorParcela)}</dd></div>
              <div><dt>Custo adicional</dt><dd>{formatar(emprestimo.custo)}</dd></div>
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
              {resumo.desconto > 0 && <div><dt>Desconto por antecipação</dt><dd>{formatar(resumo.desconto)}</dd></div>}
              <div><dt>Novo compromisso mensal</dt><dd>{formatar(emprestimo.valorParcela)}</dd></div>
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
function Simulacao({ ocultar }) {
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
      <p className='simulacao-aviso'>
        <MdShield size={18} aria-hidden='true' />
        Simulações não alteram suas movimentações, parcelas nem saldo reais.
      </p>

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
