import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { salvarMeta } from '../../store/metas'
import { formatarMoeda, juntarLista, lerValor } from '../../utils/formatar'
import { deslocarMes, formatarMes } from '../../utils/mes'
import { MESES_RESERVA, planejarMetaDinamica } from '../../utils/metas'
import { mensagemErro } from '../../services/erros'
import ValoresMensais from '../ValoresMensais/ValoresMensais'
import './FormMeta.css'

const TIPOS = [
  { valor: 'meta', rotulo: 'Meta', descricao: 'Um objetivo com valor e prazo, como uma viagem ou um carro.' },
  { valor: 'reserva', rotulo: 'Reserva', descricao: 'Dinheiro guardado sem prazo, como a reserva de emergência.' },
  { valor: 'dinamica', rotulo: 'Meta dinâmica', descricao: 'Economia progressiva: o valor guardado aumenta um pouco a cada mês.' },
]

const DURACAO_MAXIMA = 600

const paraTexto = (valor) => (valor === null || valor === undefined ? '' : String(valor).replace('.', ','))

function FormMeta({ meta, mesAtual, sugestaoReserva, onConcluir }) {
  const [tipo, setTipo] = useState(meta?.tipo ?? 'meta')
  const [nome, setNome] = useState(meta?.nome ?? '')
  const [valorAlvo, setValorAlvo] = useState(paraTexto(meta?.valorAlvo))
  const [prazo, setPrazo] = useState(meta?.prazo ? meta.prazo.slice(0, 7) : '')
  const [valorInicial, setValorInicial] = useState(paraTexto(meta?.valorInicial))
  const [incremento, setIncremento] = useState(paraTexto(meta?.incremento))
  const [duracao, setDuracao] = useState(meta?.duracao ? String(meta.duracao) : '')
  const [inicio, setInicio] = useState(meta?.inicio ? meta.inicio.slice(0, 7) : mesAtual)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const reserva = tipo === 'reserva'
  const dinamica = tipo === 'dinamica'
  const valor = lerValor(valorAlvo)
  const numeroInicial = lerValor(valorInicial)
  const numeroIncremento = incremento.trim() ? lerValor(incremento) : 0
  const meses = Number(duracao)

  // Depósitos já registrados são preservados: a duração não pode deixar nenhum deles de fora.
  const ultimoMesRegistrado = Math.max(0, ...(meta?.movimentos ?? []).map((movimento) => movimento.mesReferencia || 0))

  const dinamicaValida = numeroInicial > 0 && numeroIncremento >= 0 && Number.isInteger(meses) && meses >= 1 && meses <= DURACAO_MAXIMA
  const plano = dinamica && dinamicaValida && inicio ? planejarMetaDinamica(numeroInicial, numeroIncremento, meses) : null

  const pendentes = dinamica
    ? [
      !nome.trim() && 'nome',
      !(numeroInicial > 0) && 'valor inicial maior que zero',
      !(numeroIncremento >= 0) && 'incremento igual ou maior que zero',
      !(Number.isInteger(meses) && meses >= 1 && meses <= DURACAO_MAXIMA) && `duração de 1 a ${DURACAO_MAXIMA} meses`,
      meses < ultimoMesRegistrado && `duração de pelo menos ${ultimoMesRegistrado} meses (há depósito registrado no mês ${ultimoMesRegistrado})`,
      !inicio && 'data de início',
    ].filter(Boolean)
    : [
      !nome.trim() && 'nome',
      (reserva ? valorAlvo.trim() && !(valor > 0) : !(valor > 0)) && 'valor',
      !reserva && prazo && prazo < mesAtual && 'prazo a partir deste mês',
    ].filter(Boolean)

  // Ao editar, a meta dinâmica não troca de tipo (os depósitos dela são ligados aos meses do plano).
  const tipoBloqueado = (valorTipo) => Boolean(meta) && (meta.tipo === 'dinamica') !== (valorTipo === 'dinamica')

  async function handleSubmit(event) {
    event.preventDefault()
    if (pendentes.length > 0 || salvando) return

    setSalvando(true)
    setErro('')
    try {
      await dispatch(salvarMeta({
        id: meta?.id,
        nome,
        tipo,
        valorAlvo: valorAlvo.trim() ? valor : null,
        prazo: prazo ? `${prazo}-01` : '',
        valorInicial: numeroInicial,
        incremento: numeroIncremento,
        duracao: meses,
        inicio: `${inicio}-01`
      })).unwrap()
      onConcluir()
    } catch (error) {
      setErro(mensagemErro(error))
      setSalvando(false)
    }
  }

  return (
    <form className='form-meta' onSubmit={handleSubmit}>
      <div className='form-meta-campo'>
        <div className='form-meta-segmento form-meta-segmento-tres' role='radiogroup' aria-label='Tipo'>
          {TIPOS.map((item) => (
            <button
              key={item.valor}
              type='button'
              role='radio'
              aria-checked={tipo === item.valor}
              disabled={tipoBloqueado(item.valor)}
              className={`form-meta-segmento-opcao ${tipo === item.valor ? 'form-meta-segmento-ativo' : ''}`}
              onClick={() => setTipo(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        <small>{TIPOS.find((item) => item.valor === tipo).descricao}</small>
      </div>

      <label className='form-meta-campo'>
        <span>Nome</span>
        <input
          type='text'
          placeholder={reserva ? 'Ex.: Reserva de emergência' : dinamica ? 'Ex.: Desafio dos 12 meses' : 'Ex.: Viagem de férias'}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
      </label>

      {dinamica ? (
        <>
          <div className='form-meta-linha'>
            <label className='form-meta-campo'>
              <span>Valor inicial</span>
              <input type='text' inputMode='decimal' placeholder='0,00' value={valorInicial} onChange={(e) => setValorInicial(e.target.value)} />
              <small>Quanto guardar no 1º mês.</small>
            </label>

            <label className='form-meta-campo'>
              <span>Incremento mensal</span>
              <input type='text' inputMode='decimal' placeholder='0,00' value={incremento} onChange={(e) => setIncremento(e.target.value)} />
              <small>Somado ao depósito do mês anterior.</small>
            </label>
          </div>

          <div className='form-meta-linha'>
            <label className='form-meta-campo'>
              <span>Duração (meses)</span>
              <input
                type='number'
                inputMode='numeric'
                min={Math.max(1, ultimoMesRegistrado)}
                max={DURACAO_MAXIMA}
                step='1'
                placeholder='12'
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              />
            </label>

            <label className='form-meta-campo'>
              <span>Início</span>
              <input type='month' value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
          </div>

          {plano && (
            <div className='form-meta-plano'>
              <div>
                <span>1º mês</span>
                <strong>{formatarMoeda(numeroInicial)}</strong>
              </div>
              <div>
                <span>Último mês</span>
                <strong>{formatarMoeda(plano.ultimo)}</strong>
              </div>
              <div>
                <span>Total ao final</span>
                <strong>{formatarMoeda(plano.total)}</strong>
              </div>
              <p>
                De {formatarMes(inicio).toLowerCase()} a {formatarMes(deslocarMes(inicio, meses - 1)).toLowerCase()}.
              </p>
            </div>
          )}

          {plano && <ValoresMensais valorInicial={numeroInicial} incremento={numeroIncremento} duracao={meses} inicio={inicio} />}

          {meta && <small className='form-meta-dica'>Os depósitos já registrados são mantidos; só os valores previstos são recalculados.</small>}
        </>
      ) : (
        <div className='form-meta-linha'>
          <label className='form-meta-campo'>
            <span>{reserva ? <>Valor ideal <em>(opcional)</em></> : 'Valor da meta'}</span>
            <input type='text' inputMode='decimal' placeholder='0,00' value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
          </label>

          {!reserva && (
            <label className='form-meta-campo'>
              <span>Prazo <em>(opcional)</em></span>
              <input type='month' min={mesAtual} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </label>
          )}
        </div>
      )}

      {reserva && sugestaoReserva > 0 && (
        <div className='form-meta-sugestao'>
          <p>
            O recomendado para emergências é guardar {MESES_RESERVA} meses das suas despesas:
            <strong> {formatarMoeda(sugestaoReserva)}</strong>.
          </p>
          <button type='button' onClick={() => setValorAlvo(paraTexto(sugestaoReserva))}>
            Usar este valor
          </button>
        </div>
      )}

      {tipo === 'meta' && <small className='form-meta-dica'>Com prazo, o app calcula quanto guardar por mês para chegar lá.</small>}

      {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}

      <div className='form-meta-acao'>
        <button type='submit' className='botao botao-primario' disabled={pendentes.length > 0 || salvando}>
          {salvando ? 'Salvando...' : meta ? 'Salvar' : reserva ? 'Criar reserva' : 'Criar meta'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-meta-pendentes'>Preencha: {juntarLista(pendentes)}.</small>
        )}
      </div>
    </form>
  )
}

export default FormMeta
