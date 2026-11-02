import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdAutorenew, MdDeleteOutline, MdEdit, MdRemove, MdSavings, MdTimeline } from 'react-icons/md'
import Modal from '../Modal/Modal'
import FormMeta from '../FormMeta/FormMeta'
import FormMovimentoMeta from '../FormMeta/FormMovimentoMeta'
import RecalcularMeta from '../RecalcularMeta/RecalcularMeta'
import PlanoMetaDinamica from '../PlanoMetaDinamica/PlanoMetaDinamica'
import { carregarMetas, dispensarRecalculo, removerMeta, removerMovimento } from '../../store/metas'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { mensagemErro } from '../../services/erros'
import { formatarMes } from '../../utils/mes'
import { MESES_RESERVA, calcularMeta } from '../../utils/metas'
import { calcularSaldoExibido } from '../../utils/saldo'
import useMesAtual from '../../hooks/useMesAtual'
import './Metas.css'

const nomeMes = (mes) => formatarMes(mes).toLowerCase()

function situacaoMeta(meta, situacao, ocultar) {
  if (situacao.atingida) return meta.tipo === 'reserva' ? 'Valor ideal alcançado' : 'Meta alcançada!'
  if (situacao.atrasada) return `O prazo terminou. Faltam ${formatarMoeda(situacao.restante, ocultar)}`
  if (situacao.porMes) return `Guarde ${formatarMoeda(situacao.porMes, ocultar)} por mês até ${nomeMes(meta.prazo.slice(0, 7))}`
  if (situacao.restante > 0) return `Faltam ${formatarMoeda(situacao.restante, ocultar)}`
  return null
}

// O item só some depois que o servidor confirma; até lá o botão fica bloqueado com o carregamento.
function ItemMovimento({ movimento, ocultar }) {
  const [confirmar, setConfirmar] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState(null)
  const dispatch = useDispatch()

  async function handleDelete() {
    if (excluindo) return
    if (!confirmar) {
      setConfirmar(true)
      return
    }
    setExcluindo(true)
    setErro(null)
    try {
      await dispatch(removerMovimento(movimento)).unwrap()
    } catch (error) {
      setErro(mensagemErro(error))
      setConfirmar(false)
      setExcluindo(false)
    }
  }

  return (
    <li>
      <div>
        <strong className={movimento.valor < 0 ? 'valor-negativo' : 'valor-positivo'}>
          {movimento.valor < 0 ? '−' : '+'} {formatarMoeda(Math.abs(movimento.valor), ocultar)}
        </strong>
        <span>{movimento.valor < 0 ? 'Resgate' : 'Guardado'} em {formatarDataISO(movimento.data)}</span>
        {erro && <span className='meta-erro' role='alert'>{erro}</span>}
      </div>
      <button
        className={`meta-movimento-excluir ${confirmar ? 'meta-movimento-excluir-confirmar' : ''}`}
        onClick={handleDelete}
        onBlur={() => !excluindo && setConfirmar(false)}
        disabled={excluindo}
        aria-busy={excluindo}
        aria-label={excluindo ? 'Excluindo registro' : confirmar ? 'Confirmar exclusão do registro' : 'Excluir registro'}
      >
        {excluindo ? <MdAutorenew size={18} className='girando' /> : confirmar ? 'Excluir?' : <MdDeleteOutline size={18} />}
      </button>
    </li>
  )
}

// Editar e excluir, comuns a todos os tipos de meta.
// A meta só some depois que o servidor confirma; até lá o botão fica bloqueado com o carregamento.
function AcoesMeta({ meta, onEditar }) {
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState(null)
  const dispatch = useDispatch()

  async function handleDelete() {
    if (excluindo) return
    if (!confirmarExclusao) {
      setConfirmarExclusao(true)
      return
    }
    setExcluindo(true)
    setErroExclusao(null)
    try {
      await dispatch(removerMeta(meta.id)).unwrap()
    } catch (error) {
      setErroExclusao(mensagemErro(error))
      setConfirmarExclusao(false)
      setExcluindo(false)
    }
  }

  return (
    <>
      {erroExclusao && <p className='meta-erro' role='alert'>Não foi possível excluir: {erroExclusao}</p>}

      <div className='meta-acoes'>
        <button className='meta-acao' onClick={() => onEditar(meta)} disabled={excluindo}>
          <MdEdit size={18} />
          Editar
        </button>
        <button
          className={`meta-acao ${confirmarExclusao ? 'meta-excluir-confirmar' : ''}`}
          onClick={handleDelete}
          onBlur={() => !excluindo && setConfirmarExclusao(false)}
          disabled={excluindo}
          aria-busy={excluindo}
        >
          {excluindo ? <MdAutorenew size={18} className='girando' /> : <MdDeleteOutline size={18} />}
          {excluindo ? 'Excluindo...' : confirmarExclusao ? 'Confirmar exclusão' : 'Excluir'}
        </button>
      </div>
    </>
  )
}

const STATUS_DINAMICA = { pausada: 'Pausada', encerrada: 'Encerrada' }

// Card da meta dinâmica: total previsto, progresso e próximo depósito. O plano completo abre em um modal.
function ItemMetaDinamica({ meta, mesAtual, ocultar, onEditar, onAbrirPlano }) {
  const situacao = calcularMeta(meta, mesAtual)
  const { proximo } = situacao
  const status = situacao.atingida ? 'Concluída' : STATUS_DINAMICA[meta.status]

  return (
    <li className={`meta ${situacao.atingida ? 'meta-atingida' : ''} ${meta.status !== 'ativa' ? 'meta-inativa' : ''}`}>
      <div className='meta-topo'>
        <div>
          <span className='meta-tipo'>Meta dinâmica{status && <em className='meta-status'>{status}</em>}</span>
          <strong>{meta.nome}</strong>
        </div>
        <span className='meta-percentual'>{ocultar ? '••%' : `${Math.floor(situacao.percentual)}%`}</span>
      </div>

      <div className='meta-valores'>
        <div>
          <span>Guardado</span>
          <strong>{formatarMoeda(situacao.guardado, ocultar)}</strong>
        </div>
        <div>
          <span>Total previsto</span>
          <strong>{formatarMoeda(situacao.alvo, ocultar)}</strong>
        </div>
      </div>

      <div
        className='meta-barra'
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(situacao.percentual)}
        aria-label={`Progresso de ${meta.nome}`}
      >
        <span style={{ width: `${ocultar ? 0 : situacao.percentual}%` }} />
      </div>

      <p className={`meta-situacao ${situacao.atrasados > 0 && meta.status === 'ativa' ? 'meta-situacao-atrasada' : ''}`}>
        {situacao.atingida
          ? 'Todos os depósitos foram feitos!'
          : <>Próximo depósito: <strong>{formatarMoeda(proximo.valor, ocultar)}</strong> · mês {proximo.numero} de {meta.duracao}</>}
        {situacao.atrasados > 0 && meta.status === 'ativa' && (
          <span> · {situacao.atrasados} {situacao.atrasados === 1 ? 'atrasado' : 'atrasados'}</span>
        )}
      </p>

      <button className='botao botao-secundario' onClick={() => onAbrirPlano(meta)}>
        <MdTimeline size={20} />
        Ver planejamento ({situacao.mesesConcluidos} de {meta.duracao} meses)
      </button>

      <AcoesMeta meta={meta} onEditar={onEditar} />
    </li>
  )
}

function ItemMeta({ meta, mesAtual, ocultar, onEditar, onMovimentar }) {
  const situacao = calcularMeta(meta, mesAtual)
  const reserva = meta.tipo === 'reserva'
  const texto = situacaoMeta(meta, situacao, ocultar)

  return (
    <li className={`meta ${situacao.atingida ? 'meta-atingida' : ''}`}>
      <div className='meta-topo'>
        <div>
          <span className='meta-tipo'>{reserva ? 'Reserva' : 'Meta'}</span>
          <strong>{meta.nome}</strong>
        </div>
        {situacao.percentual !== null && (
          <span className='meta-percentual'>{ocultar ? '••%' : `${Math.floor(situacao.percentual)}%`}</span>
        )}
      </div>

      <div className='meta-valores'>
        <div>
          <span>Guardado</span>
          <strong>{formatarMoeda(situacao.guardado, ocultar)}</strong>
        </div>
        {meta.valorAlvo && (
          <div>
            <span>{reserva ? 'Valor ideal' : 'Objetivo'}</span>
            <strong>{formatarMoeda(meta.valorAlvo, ocultar)}</strong>
          </div>
        )}
      </div>

      {situacao.percentual !== null && (
        <div
          className='meta-barra'
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(situacao.percentual)}
          aria-label={`Progresso de ${meta.nome}`}
        >
          <span style={{ width: `${ocultar ? 0 : situacao.percentual}%` }} />
        </div>
      )}

      {(texto || situacao.guardadoNoMes !== 0) && (
        <p className={`meta-situacao ${situacao.atrasada ? 'meta-situacao-atrasada' : ''}`}>
          {texto}
          {situacao.guardadoNoMes !== 0 && (
            <span> · Neste mês: {situacao.guardadoNoMes > 0 ? '' : '−'}{formatarMoeda(Math.abs(situacao.guardadoNoMes), ocultar)}</span>
          )}
        </p>
      )}

      <div className='meta-movimentar'>
        <button className='botao botao-primario' onClick={() => onMovimentar(meta, 'guardar', situacao)}>
          <MdAdd size={20} />
          Guardar
        </button>
        <button className='botao botao-secundario' onClick={() => onMovimentar(meta, 'resgatar', situacao)} disabled={situacao.guardado <= 0}>
          <MdRemove size={20} />
          Resgatar
        </button>
      </div>

      {meta.movimentos.length > 0 && (
        <details className='meta-historico'>
          <summary>{meta.movimentos.length} {meta.movimentos.length === 1 ? 'registro' : 'registros'}</summary>
          <ul>
            {meta.movimentos.map((movimento) => (
              <ItemMovimento key={movimento.id} movimento={movimento} ocultar={ocultar} />
            ))}
          </ul>
        </details>
      )}

      <AcoesMeta meta={meta} onEditar={onEditar} />
    </li>
  )
}

function Metas({ ocultar }) {
  const { lista, recalculoDispensado, carregado, carregando, erro } = useSelector((state) => state.metas)
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const [formulario, setFormulario] = useState(null)
  const mesAtual = useMesAtual()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!carregado) dispatch(carregarMetas())
  }, [carregado, dispatch])

  const fecharFormulario = useCallback(() => setFormulario(null), [])
  const editarMeta = (meta) => setFormulario({ tipo: 'meta', meta })

  // Mesmo período do card de saldo.
  const despesasMes = calcularSaldoExibido(contas, fechamento, mesAtual).despesas
  const sugestaoReserva = Math.round(despesasMes * MESES_RESERVA * 100) / 100

  const situacoes = lista.map((meta) => calcularMeta(meta, mesAtual))
  const totalGuardado = situacoes.reduce((total, situacao) => total + situacao.guardado, 0)
  const guardadoNoMes = situacoes.reduce((total, situacao) => total + situacao.guardadoNoMes, 0)

  // Ao abrir o módulo, pergunta (uma meta por vez) se as metas fora do prazo devem ser recalculadas.
  const indiceForaDoPrazo = formulario
    ? -1
    : lista.findIndex((meta, indice) => situacoes[indice].foraDoPrazo && !recalculoDispensado.includes(meta.id))
  const foraDoPrazo = indiceForaDoPrazo >= 0 ? { meta: lista[indiceForaDoPrazo], situacao: situacoes[indiceForaDoPrazo] } : null
  const dispensar = useCallback((id) => dispatch(dispensarRecalculo(id)), [dispatch])

  if (carregando && !carregado) return <p className='app-carregando'>Carregando metas...</p>

  if (erro && !carregado) {
    return (
      <div className='metas-vazio' role='alert'>
        <p>Não foi possível carregar as metas.</p>
        <span>{erro}</span>
        <button className='botao botao-secundario' onClick={() => dispatch(carregarMetas())}>Tentar novamente</button>
      </div>
    )
  }

  return (
    <div className='metas'>
      {lista.length > 0 && (
        <div className='metas-resumo'>
          <div>
            <span>Total guardado</span>
            <strong>{formatarMoeda(totalGuardado, ocultar)}</strong>
          </div>
          <div>
            <span>Neste mês</span>
            <strong className={guardadoNoMes < 0 ? 'valor-negativo' : 'valor-positivo'}>{formatarMoeda(guardadoNoMes, ocultar)}</strong>
          </div>
        </div>
      )}

      {fechamento?.saldo > 0 && (
        <p className='metas-sobra'>
          Em {nomeMes(fechamento.mes)} sobraram <strong>{formatarMoeda(fechamento.saldo, ocultar)}</strong> na conta.
          Que tal guardar parte desse valor?
        </p>
      )}

      <button className='botao botao-secundario' onClick={() => setFormulario({ tipo: 'meta' })}>
        <MdAdd size={20} />
        Nova meta ou reserva
      </button>

      {lista.length === 0 ? (
        <div className='metas-vazio'>
          <MdSavings size={40} />
          <p>Você ainda não tem metas ou reservas.</p>
          <span>
            Crie uma meta para um objetivo, como uma viagem, ou uma reserva de emergência, e registre o que guardar da sobra de cada mês.
            Guardar dinheiro aqui não altera o saldo disponível.
          </span>
        </div>
      ) : (
        <ul className='metas-lista'>
          {lista.map((meta) => (meta.tipo === 'dinamica' ? (
            <ItemMetaDinamica
              key={meta.id}
              meta={meta}
              mesAtual={mesAtual}
              ocultar={ocultar}
              onEditar={editarMeta}
              onAbrirPlano={(item) => setFormulario({ tipo: 'plano', metaId: item.id })}
            />
          ) : (
            <ItemMeta
              key={meta.id}
              meta={meta}
              mesAtual={mesAtual}
              ocultar={ocultar}
              onEditar={editarMeta}
              onMovimentar={(item, acao, situacao) => setFormulario({ tipo: 'movimento', meta: item, acao, situacao })}
            />
          )))}
        </ul>
      )}

      {formulario?.tipo === 'meta' && (
        <Modal titulo={formulario.meta ? 'Editar' : 'Nova meta ou reserva'} onFechar={fecharFormulario}>
          <FormMeta meta={formulario.meta} mesAtual={mesAtual} sugestaoReserva={sugestaoReserva} onConcluir={fecharFormulario} />
        </Modal>
      )}

      {formulario?.tipo === 'plano' && (
        <Modal titulo={lista.find((meta) => meta.id === formulario.metaId)?.nome ?? 'Meta dinâmica'} onFechar={fecharFormulario}>
          <PlanoMetaDinamica metaId={formulario.metaId} mesAtual={mesAtual} ocultar={ocultar} onEditar={editarMeta} />
        </Modal>
      )}

      {foraDoPrazo && (
        <Modal titulo='Meta fora do prazo' onFechar={() => dispensar(foraDoPrazo.meta.id)}>
          <RecalcularMeta
            meta={foraDoPrazo.meta}
            situacao={foraDoPrazo.situacao}
            ocultar={ocultar}
            onEscolherPrazo={() => {
              dispensar(foraDoPrazo.meta.id)
              setFormulario({ tipo: 'meta', meta: foraDoPrazo.meta })
            }}
            onDispensar={() => dispensar(foraDoPrazo.meta.id)}
            onConcluir={() => dispensar(foraDoPrazo.meta.id)}
          />
        </Modal>
      )}

      {formulario?.tipo === 'movimento' && (
        <Modal titulo={formulario.meta.nome} onFechar={fecharFormulario}>
          <FormMovimentoMeta
            meta={formulario.meta}
            guardado={formulario.situacao.guardado}
            acaoInicial={formulario.acao}
            sugestao={formulario.situacao.porMes}
            onConcluir={fecharFormulario}
          />
        </Modal>
      )}
    </div>
  )
}

export default Metas
