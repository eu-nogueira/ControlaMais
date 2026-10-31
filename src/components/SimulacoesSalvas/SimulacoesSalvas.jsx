import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdCompareArrows, MdContentCopy, MdDeleteOutline, MdEmojiEvents, MdFolderOpen, MdHistory } from 'react-icons/md'
import { carregarSimulacoes, removerSimulacao } from '../../store/simulacoes'
import { cenarioAtual, escolherMelhorCenario, simularEntrada } from '../../utils/simulacao'
import { formatarMoeda } from '../../utils/formatar'
import useMesAtual from '../../hooks/useMesAtual'
import { VEREDITOS } from '../Simulacao/vereditos'
import './SimulacoesSalvas.css'

const MAXIMO_COMPARACAO = 3
const LETRAS = ['A', 'B', 'C']

const formatarPercentual = (fracao) => `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const formatarData = (iso) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

function descreverAcao({ descricao, acao, quantidade }) {
  return acao === 'quitar' ? `Quitar ${descricao}` : `Antecipar ${quantidade} de ${descricao}`
}

function SeloVeredito({ veredito }) {
  const info = VEREDITOS[veredito]
  if (!info) return null
  return <span className={`salvas-selo salvas-selo-${veredito}`}>{info.rotulo}</span>
}

function ItemSalvo({ simulacao, aberta, selecionada, podeSelecionar, ocultar, onAlternar, onAbrir, onDuplicar }) {
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const dispatch = useDispatch()
  const { resumo } = simulacao
  const formatar = (valor) => formatarMoeda(valor, ocultar)

  function handleExcluir() {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true)
      return
    }
    dispatch(removerSimulacao(simulacao.id))
  }

  return (
    <li className={`salvas-item ${selecionada ? 'salvas-item-selecionado' : ''}`}>
      <div className='salvas-item-topo'>
        <div>
          <strong>{simulacao.nome}</strong>
          <span>
            Criada em {formatarData(simulacao.criadoEm)}
            {simulacao.atualizadoEm !== simulacao.criadoEm && ` · alterada em ${formatarData(simulacao.atualizadoEm)}`}
            {aberta && ' · aberta no editor'}
          </span>
        </div>
        <SeloVeredito veredito={resumo.veredito} />
      </div>

      <dl className='salvas-item-dados'>
        <div>
          <dt>Empréstimo</dt>
          <dd>{formatar(resumo.emprestimo.valor)} em {resumo.emprestimo.parcelas} × {formatar(resumo.emprestimo.valorParcela)}</dd>
        </div>
        <div>
          <dt>Parcelas do mês</dt>
          <dd>{formatar(resumo.parcelasMesAntes)} → {formatar(resumo.parcelasMesDepois)}</dd>
        </div>
        <div>
          <dt>Economia líquida</dt>
          <dd className={resumo.atingeMeta ? 'valor-positivo' : 'valor-negativo'}>
            {formatar(resumo.economiaLiquida)}/mês (meta {formatar(resumo.meta)})
          </dd>
        </div>
        <div>
          <dt>Escolhas</dt>
          <dd>{resumo.acoes.length > 0 ? resumo.acoes.map(descreverAcao).join('; ') : 'Nenhuma dívida quitada ou antecipada'}</dd>
        </div>
        {resumo.recomendada && (
          <div>
            <dt>Alternativa recomendada</dt>
            <dd>{resumo.recomendada}</dd>
          </div>
        )}
      </dl>
      <small className='salvas-item-nota'>Valores do dia em que foi salva.</small>

      <div className='salvas-item-acoes'>
        <label className={`salvas-comparar ${!podeSelecionar && !selecionada ? 'salvas-comparar-desativado' : ''}`}>
          <input type='checkbox' checked={selecionada} disabled={!podeSelecionar && !selecionada} onChange={onAlternar} />
          Comparar
        </label>
        <div>
          <button type='button' onClick={onAbrir}><MdFolderOpen size={18} />Abrir</button>
          <button type='button' onClick={onDuplicar}><MdContentCopy size={18} />Duplicar</button>
          <button
            type='button'
            className={`salvas-excluir ${confirmarExclusao ? 'salvas-excluir-confirmar' : ''}`}
            onClick={handleExcluir}
            onBlur={() => setConfirmarExclusao(false)}
          >
            <MdDeleteOutline size={18} />
            {confirmarExclusao ? 'Confirmar' : 'Excluir'}
          </button>
        </div>
      </div>
    </li>
  )
}

// Recalcula as simulações escolhidas com os dados atuais e compara com não contratar.
function Comparacao({ simulacoes, ocultar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const mesAtual = useMesAtual()
  const formatar = (valor) => formatarMoeda(valor, ocultar)

  const cenarios = simulacoes.map((simulacao, indice) => ({
    letra: LETRAS[indice],
    simulacao,
    ...simularEntrada({ contas, fechamento, mesAtual, entrada: simulacao.entrada, formatar })
  }))
  const atual = cenarioAtual(contas)
  const melhor = escolherMelhorCenario(cenarios)

  const linhas = [
    {
      rotulo: 'Resultado',
      valores: cenarios.map(({ resultado }) => <SeloVeredito key='v' veredito={resultado.veredito} />),
      atual: 'Situação atual'
    },
    {
      rotulo: 'Empréstimo',
      valores: cenarios.map(({ emprestimo }) => `${formatar(emprestimo.valor)} em ${emprestimo.parcelas}x`),
      atual: 'Nenhum'
    },
    {
      rotulo: 'Parcelas do mês',
      valores: cenarios.map(({ resultado }) => formatar(resultado.comparativo.parcelasMesDepois)),
      atual: formatar(atual.parcelasMes)
    },
    {
      rotulo: 'Economia líquida por mês',
      valores: cenarios.map(({ resultado }) => (
        <span key='e' className={resultado.resumo.atingeMeta ? 'valor-positivo' : 'valor-negativo'}>{formatar(resultado.resumo.economiaLiquida)}</span>
      )),
      atual: formatar(0)
    },
    {
      rotulo: 'Meta de liberação',
      valores: cenarios.map(({ resultado }) => `${formatar(resultado.resumo.meta)} (${formatarPercentual(resultado.resumo.percentualMeta)}) · ${resultado.resumo.atingeMeta ? 'atinge' : 'não atinge'}`),
      atual: '—'
    },
    {
      rotulo: 'Custo do empréstimo',
      valores: cenarios.map(({ emprestimo }) => formatar(emprestimo.custo)),
      atual: formatar(0)
    },
    {
      rotulo: 'Total ainda a pagar',
      valores: cenarios.map(({ resultado }) => formatar(resultado.comparativo.totalAbertoDepois)),
      atual: formatar(atual.totalAberto)
    },
    {
      rotulo: 'Riscos',
      valores: cenarios.map(({ resultado }) => resultado.riscos.length),
      atual: '—'
    },
  ]

  let conclusao
  if (melhor) {
    const { resultado, emprestimo } = melhor
    conclusao = `${melhor.letra}. ${melhor.simulacao.nome} é o melhor cenário: ${VEREDITOS[resultado.veredito].rotulo.toLowerCase()}, `
      + `libera ${formatar(resultado.resumo.economiaLiquida)} por mês (meta de ${formatar(resultado.resumo.meta)}) `
      + `e as parcelas do mês passam de ${formatar(atual.parcelasMes)} para ${formatar(resultado.comparativo.parcelasMesDepois)}, `
      + `com custo de ${formatar(emprestimo.custo)} no empréstimo.`
      + (resultado.riscos.length > 0 ? ` Atenção a ${resultado.riscos.length === 1 ? '1 risco' : `${resultado.riscos.length} riscos`} apontado(s) na simulação.` : '')
  } else {
    conclusao = 'Nenhum dos cenários comparados atinge a meta de liberação mensal com segurança. O melhor resultado é não contratar o empréstimo e manter os pagamentos atuais.'
  }

  const ausentes = cenarios.filter((cenario) => cenario.dividasAusentes.length > 0)

  return (
    <section className='salvas-comparacao' aria-label='Comparação de cenários'>
      <h2><MdCompareArrows size={20} aria-hidden='true' />Comparação de cenários</h2>
      <p className='salvas-dica'>Recalculada com seus dados de hoje; os valores podem diferir do dia em que cada simulação foi salva.</p>

      <div className='salvas-tabela-rolagem'>
        <table className='salvas-tabela'>
          <thead>
            <tr>
              <th scope='col' />
              {cenarios.map((cenario) => (
                <th key={cenario.simulacao.id} scope='col' className={melhor === cenario ? 'salvas-coluna-melhor' : ''}>
                  <span className='salvas-letra'>{cenario.letra}</span>{cenario.simulacao.nome}
                </th>
              ))}
              <th scope='col' className={!melhor ? 'salvas-coluna-melhor' : ''}>
                <span className='salvas-letra'>{String.fromCharCode(65 + cenarios.length)}</span>Não contratar
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.rotulo}>
                <th scope='row'>{linha.rotulo}</th>
                {linha.valores.map((valor, indice) => (
                  <td key={cenarios[indice].simulacao.id} className={melhor === cenarios[indice] ? 'salvas-coluna-melhor' : ''}>{valor}</td>
                ))}
                <td className={!melhor ? 'salvas-coluna-melhor' : ''}>{linha.atual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className='salvas-conclusao'>
        <MdEmojiEvents size={20} aria-hidden='true' />
        <span>{conclusao}</span>
      </p>
      <p className='salvas-dica'>
        Critério: só vale contratar se o resultado for "Vantajoso" ou "Exige cautela"; entre eles, vence o de melhor resultado,
        depois a maior economia líquida por mês e, por fim, o menor total ainda a pagar.
      </p>
      {ausentes.length > 0 && (
        <p className='salvas-dica'>
          Algumas dívidas não existem mais e foram desconsideradas: {ausentes.map((cenario) => `${cenario.letra} (${cenario.dividasAusentes.join(', ')})`).join('; ')}.
        </p>
      )}
    </section>
  )
}

function SimulacoesSalvas({ ocultar, rascunhoId, onAbrir, onDuplicar }) {
  const { lista, carregando, erro } = useSelector((state) => state.simulacoes)
  const [selecionadas, setSelecionadas] = useState([])
  const dispatch = useDispatch()

  // Mantém só as selecionadas que ainda existem (uma pode ter sido excluída).
  const escolhidas = selecionadas.map((id) => lista.find((simulacao) => simulacao.id === id)).filter(Boolean)

  function alternar(id) {
    setSelecionadas((atuais) => (atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id].slice(-MAXIMO_COMPARACAO)))
  }

  if (erro) {
    return (
      <div className='salvas-vazio' role='alert'>
        <p>Não foi possível carregar as simulações salvas.</p>
        <span>{erro}</span>
        <button type='button' className='botao botao-secundario' onClick={() => dispatch(carregarSimulacoes())}>Tentar novamente</button>
      </div>
    )
  }

  if (carregando && lista.length === 0) return <p className='salvas-dica'>Carregando simulações...</p>

  if (lista.length === 0) {
    return (
      <div className='salvas-vazio'>
        <MdHistory size={40} />
        <p>Nenhuma simulação salva.</p>
        <span>Monte uma simulação e use "Salvar simulação" para consultar, duplicar e comparar cenários depois.</span>
      </div>
    )
  }

  return (
    <div className='salvas'>
      <p className='salvas-dica'>Marque até {MAXIMO_COMPARACAO} simulações em "Comparar" para ver lado a lado com não contratar o empréstimo.</p>

      {escolhidas.length > 0 && <Comparacao simulacoes={escolhidas} ocultar={ocultar} />}

      <ul className='salvas-lista'>
        {lista.map((simulacao) => (
          <ItemSalvo
            key={simulacao.id}
            simulacao={simulacao}
            aberta={simulacao.id === rascunhoId}
            selecionada={selecionadas.includes(simulacao.id)}
            podeSelecionar={escolhidas.length < MAXIMO_COMPARACAO}
            ocultar={ocultar}
            onAlternar={() => alternar(simulacao.id)}
            onAbrir={() => onAbrir(simulacao)}
            onDuplicar={() => onDuplicar(simulacao)}
          />
        ))}
      </ul>
    </div>
  )
}

export default SimulacoesSalvas
