import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { salvarMeta } from '../../store/metas'
import { formatarMoeda } from '../../utils/formatar'
import { formatarMes } from '../../utils/mes'
import { mensagemErro } from '../../services/erros'
import '../FormMeta/FormMeta.css'
import './RecalcularMeta.css'

const nomeMes = (mes) => formatarMes(mes).toLowerCase()

// Pergunta se a meta que não será alcançada no prazo deve ser recalculada.
// Recalcular leva o prazo para o mês em que, no ritmo atual, a meta é alcançada.
function RecalcularMeta({ meta, situacao, ocultar, onEscolherPrazo, onDispensar, onConcluir }) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const prazo = meta.prazo.slice(0, 7)

  async function handleRecalcular() {
    if (salvando) return
    setSalvando(true)
    setErro('')
    try {
      await dispatch(salvarMeta({
        id: meta.id,
        nome: meta.nome,
        tipo: meta.tipo,
        valorAlvo: meta.valorAlvo,
        prazo: `${situacao.previsao}-01`
      })).unwrap()
      onConcluir()
    } catch (error) {
      setErro(mensagemErro(error))
      setSalvando(false)
    }
  }

  return (
    <div className='form-meta'>
      <div className='recalcular-meta-texto'>
        <p>
          {situacao.atrasada
            ? <>O prazo de <strong>{meta.nome}</strong> terminou em {nomeMes(prazo)} e ainda faltam <strong>{formatarMoeda(situacao.restante, ocultar)}</strong>.</>
            : <>No ritmo atual, <strong>{meta.nome}</strong> não será alcançada até {nomeMes(prazo)}. Faltam <strong>{formatarMoeda(situacao.restante, ocultar)}</strong>.</>}
        </p>
        <p>
          {situacao.previsao
            ? <>Você tem guardado em média {formatarMoeda(situacao.ritmo, ocultar)} por mês. Nesse ritmo, a meta é alcançada em <strong>{nomeMes(situacao.previsao)}</strong>.</>
            : <>Ainda não há valores guardados para calcular um novo prazo.</>}
        </p>
        <p>Deseja recalcular a meta?</p>
      </div>

      {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}

      <div className='form-meta-acao'>
        {situacao.previsao && (
          <button type='button' className='botao botao-primario' onClick={handleRecalcular} disabled={salvando}>
            {salvando ? 'Recalculando...' : `Mudar o prazo para ${nomeMes(situacao.previsao)}`}
          </button>
        )}
        <button
          type='button'
          className={`botao ${situacao.previsao ? 'botao-secundario' : 'botao-primario'}`}
          onClick={onEscolherPrazo}
          disabled={salvando}
        >
          Escolher outro prazo ou valor
        </button>
        <button type='button' className='botao recalcular-meta-dispensar' onClick={onDispensar} disabled={salvando}>
          Agora não
        </button>
      </div>
    </div>
  )
}

export default RecalcularMeta
