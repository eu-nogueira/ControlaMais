import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  MdAutorenew, MdCheck, MdCheckCircle, MdChevronLeft, MdChevronRight, MdEdit, MdErrorOutline, MdFlag, MdPause, MdPlayArrow,
  MdRadioButtonUnchecked, MdSchedule, MdUndo
} from 'react-icons/md'
import { alterarStatusMeta, registrarMovimento, removerMovimento } from '../../store/metas'
import { formatarDataISO, formatarMoeda, lerValor } from '../../utils/formatar'
import { deslocarMes, formatarMes, hojeISO, mesesEntre } from '../../utils/mes'
import { calcularMetaDinamica } from '../../utils/metas'
import { mensagemErro } from '../../services/erros'
import '../FormMeta/FormMeta.css'
import './PlanoMetaDinamica.css'

const ESTADOS = {
  concluido: { rotulo: 'Concluído', icone: <MdCheckCircle size={22} /> },
  atrasado: { rotulo: 'Atrasado', icone: <MdErrorOutline size={22} /> },
  atual: { rotulo: 'Este mês', icone: <MdSchedule size={22} /> },
  pendente: { rotulo: 'Pendente', icone: <MdRadioButtonUnchecked size={22} /> },
}

const nomeMes = (mes) => formatarMes(mes).toLowerCase()

const MESES_POR_PAGINA = 12

// Registro do depósito de um mês: valor efetivamente guardado (sugerido o previsto) e a data.
function FormDeposito({ meta, item, onCancelar }) {
  const [valor, setValor] = useState(String(item.valor).replace('.', ','))
  const [data, setData] = useState(hojeISO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const numero = lerValor(valor)
  const valido = numero > 0 && Boolean(data)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!valido || salvando) return

    setSalvando(true)
    setErro('')
    try {
      await dispatch(registrarMovimento({ metaId: meta.id, valor: numero, data, mesReferencia: item.numero })).unwrap()
    } catch (error) {
      setErro(mensagemErro(error))
      setSalvando(false)
    }
  }

  return (
    <form className='plano-deposito' onSubmit={handleSubmit}>
      <div className='form-meta-linha'>
        <label className='form-meta-campo'>
          <span>Valor guardado</span>
          <input type='text' inputMode='decimal' value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
        </label>
        <label className='form-meta-campo'>
          <span>Data</span>
          <input type='date' value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>
      {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}
      <div className='plano-deposito-botoes'>
        <button type='button' className='botao botao-secundario' onClick={onCancelar} disabled={salvando}>Cancelar</button>
        <button type='submit' className='botao botao-primario' disabled={!valido || salvando}>
          {salvando ? <MdAutorenew size={18} className='girando' /> : <MdCheck size={18} />}
          {salvando ? 'Salvando...' : 'Confirmar'}
        </button>
      </div>
    </form>
  )
}

function ItemPlano({ meta, item, ativa, aberto, ocultar, onAbrir, onFechar }) {
  const [confirmarDesfazer, setConfirmarDesfazer] = useState(false)
  const [desfazendo, setDesfazendo] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const { deposito, estado } = item
  const diferente = deposito && Math.round(deposito.valor * 100) !== Math.round(item.valor * 100)

  async function handleDesfazer() {
    if (desfazendo) return
    if (!confirmarDesfazer) {
      setConfirmarDesfazer(true)
      return
    }
    setDesfazendo(true)
    setErro('')
    try {
      await dispatch(removerMovimento(deposito)).unwrap()
    } catch (error) {
      setErro(mensagemErro(error))
      setConfirmarDesfazer(false)
      setDesfazendo(false)
    }
  }

  return (
    <li className={`plano-mes plano-mes-${estado}`}>
      <span className='plano-mes-icone' aria-hidden='true'>{ESTADOS[estado].icone}</span>

      <div className='plano-mes-corpo'>
        <div className='plano-mes-topo'>
          <div>
            <strong>Mês {item.numero}</strong>
            <span>
              {deposito ? `Guardado em ${formatarDataISO(deposito.data)}` : nomeMes(item.mes)}
              {' · '}
              <em className='plano-mes-estado'>{ESTADOS[estado].rotulo}</em>
            </span>
          </div>
          <div className='plano-mes-valor'>
            <strong>{formatarMoeda(deposito ? deposito.valor : item.valor, ocultar)}</strong>
            {diferente && <span>previsto {formatarMoeda(item.valor, ocultar)}</span>}
          </div>
        </div>

        {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}

        {aberto ? (
          <FormDeposito meta={meta} item={item} onCancelar={onFechar} />
        ) : deposito ? (
          <button
            className={`plano-mes-acao ${confirmarDesfazer ? 'plano-mes-acao-confirmar' : ''}`}
            onClick={handleDesfazer}
            onBlur={() => !desfazendo && setConfirmarDesfazer(false)}
            disabled={desfazendo}
            aria-busy={desfazendo}
          >
            {desfazendo ? <MdAutorenew size={16} className='girando' /> : <MdUndo size={16} />}
            {desfazendo ? 'Desfazendo...' : confirmarDesfazer ? 'Confirmar: desfazer depósito' : 'Desfazer'}
          </button>
        ) : ativa && (
          <button className='plano-mes-acao plano-mes-acao-marcar' onClick={onAbrir}>
            <MdCheck size={16} />
            Marcar como guardado
          </button>
        )}
      </div>
    </li>
  )
}

// Planejamento completo de uma meta dinâmica: resumo, ações e a linha do tempo dos depósitos.
function PlanoMetaDinamica({ metaId, mesAtual, ocultar, onEditar }) {
  const meta = useSelector((state) => state.metas.lista.find((item) => item.id === metaId))
  const [mesAberto, setMesAberto] = useState(null)
  const [paginaEscolhida, setPaginaEscolhida] = useState(null)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)
  const [alterando, setAlterando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  if (!meta) return null

  const situacao = calcularMetaDinamica(meta, mesAtual)
  const ativa = meta.status === 'ativa'
  const { proximo } = situacao

  // Linha do tempo em páginas de 12 meses; abre na página do próximo depósito (ou na última, se concluída).
  const totalPaginas = Math.ceil(meta.duracao / MESES_POR_PAGINA)
  const paginaPadrao = Math.floor(((proximo?.numero ?? meta.duracao) - 1) / MESES_POR_PAGINA)
  const pagina = Math.min(paginaEscolhida ?? paginaPadrao, totalPaginas - 1)
  const mesesDaPagina = situacao.meses.slice(pagina * MESES_POR_PAGINA, (pagina + 1) * MESES_POR_PAGINA)
  const primeiroDaPagina = mesesDaPagina[0].numero
  const ultimoDaPagina = mesesDaPagina[mesesDaPagina.length - 1].numero

  function irParaPagina(novaPagina) {
    setMesAberto(null)
    setPaginaEscolhida(novaPagina)
  }

  async function alterarStatus(dados) {
    setAlterando(true)
    setErro('')
    try {
      await dispatch(alterarStatusMeta({ id: meta.id, ...dados })).unwrap()
    } catch (error) {
      setErro(mensagemErro(error))
    }
    setAlterando(false)
    setConfirmarEncerrar(false)
  }

  // Retomar avança o início pelos meses em pausa: os depósitos pendentes não viram atrasados.
  function retomar() {
    const mesesPausados = meta.pausadaEm ? Math.max(mesesEntre(meta.pausadaEm.slice(0, 7), mesAtual), 0) : 0
    alterarStatus({
      status: 'ativa',
      pausadaEm: null,
      inicio: mesesPausados > 0 ? `${deslocarMes(meta.inicio.slice(0, 7), mesesPausados)}-01` : null
    })
  }

  function encerrar() {
    if (!confirmarEncerrar) {
      setConfirmarEncerrar(true)
      return
    }
    alterarStatus({ status: 'encerrada', pausadaEm: null })
  }

  const aviso = situacao.atingida
    ? { classe: 'plano-aviso-concluida', texto: `Meta concluída! Você guardou ${formatarMoeda(situacao.guardado, ocultar)}.` }
    : meta.status === 'pausada'
      ? { classe: 'plano-aviso-pausada', texto: `Pausada desde ${formatarDataISO(meta.pausadaEm)}. Ao retomar, os depósitos pendentes são adiados pelos meses em pausa.` }
      : meta.status === 'encerrada'
        ? { classe: 'plano-aviso-encerrada', texto: 'Meta encerrada. Os depósitos registrados foram mantidos no histórico.' }
        : situacao.atrasados > 0
          ? { classe: 'plano-aviso-atrasada', texto: `${situacao.atrasados} ${situacao.atrasados === 1 ? 'depósito atrasado' : 'depósitos atrasados'}.` }
          : null

  return (
    <div className='plano'>
      {aviso && <p className={`plano-aviso ${aviso.classe}`}>{aviso.texto}</p>}

      <div className='plano-resumo'>
        <div>
          <span>Total previsto</span>
          <strong>{formatarMoeda(situacao.alvo, ocultar)}</strong>
        </div>
        <div>
          <span>Guardado</span>
          <strong className='valor-positivo'>{formatarMoeda(situacao.guardado, ocultar)}</strong>
        </div>
        <div>
          <span>Falta</span>
          <strong>{formatarMoeda(situacao.restante, ocultar)}</strong>
        </div>
        <div>
          <span>Meses concluídos</span>
          <strong>{situacao.mesesConcluidos} de {meta.duracao}</strong>
        </div>
      </div>

      <div className='plano-progresso'>
        <div className='plano-progresso-texto'>
          <span>{ocultar ? '••%' : `${situacao.percentual.toFixed(1).replace('.', ',')}% concluído`}</span>
          {proximo && <span>Próximo: <strong>{formatarMoeda(proximo.valor, ocultar)}</strong> (mês {proximo.numero})</span>}
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
      </div>

      {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}

      <div className='plano-acoes'>
        <button className='meta-acao' onClick={() => onEditar(meta)} disabled={alterando}>
          <MdEdit size={18} />
          Editar
        </button>
        {meta.status === 'ativa' && !situacao.atingida && (
          <button className='meta-acao' onClick={() => alterarStatus({ status: 'pausada', pausadaEm: hojeISO() })} disabled={alterando}>
            <MdPause size={18} />
            Pausar
          </button>
        )}
        {meta.status === 'pausada' && (
          <button className='meta-acao' onClick={retomar} disabled={alterando}>
            <MdPlayArrow size={18} />
            Retomar
          </button>
        )}
        {meta.status !== 'encerrada' && !situacao.atingida && (
          <button
            className={`meta-acao ${confirmarEncerrar ? 'meta-excluir-confirmar' : ''}`}
            onClick={encerrar}
            onBlur={() => !alterando && setConfirmarEncerrar(false)}
            disabled={alterando}
          >
            <MdFlag size={18} />
            {confirmarEncerrar ? 'Confirmar encerramento' : 'Encerrar'}
          </button>
        )}
        {meta.status === 'encerrada' && (
          <button className='meta-acao' onClick={() => alterarStatus({ status: 'ativa', pausadaEm: null })} disabled={alterando}>
            <MdPlayArrow size={18} />
            Reativar
          </button>
        )}
        {alterando && <MdAutorenew size={18} className='girando plano-carregando' aria-label='Salvando' />}
      </div>

      <div className='plano-titulo-linha'>
        <h3 className='plano-titulo'>Planejamento</h3>
        {totalPaginas > 1 && <span>Meses {primeiroDaPagina} a {ultimoDaPagina} de {meta.duracao}</span>}
      </div>

      <ol className='plano-linha' start={primeiroDaPagina}>
        {mesesDaPagina.map((item) => (
          <ItemPlano
            key={item.numero}
            meta={meta}
            item={item}
            ativa={ativa}
            aberto={mesAberto === item.numero && !item.deposito}
            ocultar={ocultar}
            onAbrir={() => setMesAberto(item.numero)}
            onFechar={() => setMesAberto(null)}
          />
        ))}
      </ol>

      {totalPaginas > 1 && (
        <nav className='plano-paginacao' aria-label='Páginas do planejamento'>
          <button className='meta-acao' onClick={() => irParaPagina(pagina - 1)} disabled={pagina === 0}>
            <MdChevronLeft size={20} />
            Anterior
          </button>
          <div className='plano-paginas'>
            {Array.from({ length: totalPaginas }, (_, indice) => (
              <button
                key={indice}
                className={`plano-pagina ${indice === pagina ? 'plano-pagina-ativa' : ''}`}
                onClick={() => irParaPagina(indice)}
                aria-current={indice === pagina ? 'page' : undefined}
                aria-label={`Meses ${indice * MESES_POR_PAGINA + 1} a ${Math.min((indice + 1) * MESES_POR_PAGINA, meta.duracao)}`}
              >
                {indice + 1}
              </button>
            ))}
          </div>
          <button className='meta-acao' onClick={() => irParaPagina(pagina + 1)} disabled={pagina === totalPaginas - 1}>
            Próxima
            <MdChevronRight size={20} />
          </button>
        </nav>
      )}
    </div>
  )
}

export default PlanoMetaDinamica
