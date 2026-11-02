import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { registrarMovimento } from '../../store/metas'
import { formatarMoeda, lerValor } from '../../utils/formatar'
import { formatarMes, hojeISO } from '../../utils/mes'
import { mensagemErro } from '../../services/erros'
import '../FormMeta/FormMeta.css'
import './SobraMes.css'

// A sugestão nunca passa desta fração da sobra; o usuário pode digitar um valor maior.
const LIMITE_SUGESTAO = 0.35

// Valor sugerido: o que falta guardar no mês para a meta, limitado a LIMITE_SUGESTAO da sobra.
function sugestaoPara(item, sobra) {
  const limite = Math.floor(sobra * LIMITE_SUGESTAO * 100) / 100
  const valor = item.situacao.porMes ?? (item.situacao.restante > 0 ? item.situacao.restante : limite)
  return String(Math.min(valor, limite)).replace('.', ',')
}

// Pergunta, depois que um mês é fechado com sobra, se o usuário quer guardar parte dela em uma meta.
// `metas`: [{ meta, situacao }] das metas e reservas que ainda não foram alcançadas.
function SobraMes({ mes, sobra, metas, ocultar, onConcluir }) {
  const [metaId, setMetaId] = useState(metas[0].meta.id)
  const [valor, setValor] = useState(() => sugestaoPara(metas[0], sobra))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const numero = lerValor(valor)

  function escolher(item) {
    setMetaId(item.meta.id)
    setValor(sugestaoPara(item, sobra))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!(numero > 0) || salvando) return

    setSalvando(true)
    setErro('')
    try {
      // Na meta dinâmica, o valor vira o depósito do próximo mês do plano.
      const escolhida = metas.find((item) => item.meta.id === metaId)
      const mesReferencia = escolhida.meta.tipo === 'dinamica' ? escolhida.situacao.proximo.numero : null
      await dispatch(registrarMovimento({ metaId, valor: numero, data: hojeISO(), mesReferencia })).unwrap()
      onConcluir()
    } catch (error) {
      setErro(mensagemErro(error))
      setSalvando(false)
    }
  }

  return (
    <form className='form-meta' onSubmit={handleSubmit}>
      <p className='sobra-mes-texto'>
        Em {formatarMes(mes).toLowerCase()} sobraram <strong>{formatarMoeda(sobra, ocultar)}</strong> na conta.
        Quer guardar parte desse valor em uma meta?
      </p>

      <div className='sobra-mes-metas' role='radiogroup' aria-label='Meta'>
        {metas.map((item) => (
          <button
            key={item.meta.id}
            type='button'
            role='radio'
            aria-checked={metaId === item.meta.id}
            className={`sobra-mes-meta ${metaId === item.meta.id ? 'sobra-mes-meta-ativa' : ''}`}
            onClick={() => escolher(item)}
          >
            <strong>{item.meta.nome}</strong>
            <span>
              {formatarMoeda(item.situacao.guardado, ocultar)}
              {item.situacao.alvo ? ` de ${formatarMoeda(item.situacao.alvo, ocultar)}` : ' guardados'}
              {item.meta.tipo === 'dinamica'
                ? ` · depósito do mês ${item.situacao.proximo.numero}: ${formatarMoeda(item.situacao.porMes, ocultar)}`
                : item.situacao.porMes ? ` · ${formatarMoeda(item.situacao.porMes, ocultar)} por mês` : ''}
            </span>
          </button>
        ))}
      </div>

      <label className='form-meta-campo'>
        <span>Valor para guardar</span>
        <input type='text' inputMode='decimal' placeholder='0,00' value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>

      <small className='form-meta-dica'>Guardar não altera o saldo disponível: o dinheiro sai da sobra que ficou na conta.</small>

      {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}

      <div className='form-meta-acao'>
        <button type='submit' className='botao botao-primario' disabled={!(numero > 0) || salvando}>
          {salvando ? 'Guardando...' : 'Guardar'}
        </button>
        <button type='button' className='botao botao-secundario' onClick={onConcluir} disabled={salvando}>
          Agora não
        </button>
      </div>
    </form>
  )
}

export default SobraMes
