import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { registrarMovimento } from '../../store/metas'
import { formatarMoeda, juntarLista, lerValor } from '../../utils/formatar'
import { hojeISO } from '../../utils/mes'
import { mensagemErro } from '../../services/erros'
import './FormMeta.css'

// Guardar ou resgatar dinheiro de uma meta. Não cria movimentação no extrato nem altera o saldo.
function FormMovimentoMeta({ meta, guardado, acaoInicial = 'guardar', sugestao, onConcluir }) {
  const [acao, setAcao] = useState(acaoInicial)
  const [valor, setValor] = useState(acaoInicial === 'guardar' && sugestao ? String(sugestao).replace('.', ',') : '')
  const [data, setData] = useState(hojeISO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const resgate = acao === 'resgatar'
  const numero = lerValor(valor)

  const pendentes = [
    !(numero > 0) && 'valor',
    resgate && numero > guardado + 0.005 && `valor até ${formatarMoeda(guardado)}`,
    !data && 'data',
  ].filter(Boolean)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pendentes.length > 0 || salvando) return

    setSalvando(true)
    setErro('')
    try {
      await dispatch(registrarMovimento({ metaId: meta.id, valor: resgate ? -numero : numero, data })).unwrap()
      onConcluir()
    } catch (error) {
      setErro(mensagemErro(error))
      setSalvando(false)
    }
  }

  return (
    <form className='form-meta' onSubmit={handleSubmit}>
      <div className='form-meta-segmento' role='radiogroup' aria-label='Ação'>
        {[['guardar', 'Guardar'], ['resgatar', 'Resgatar']].map(([valorAcao, rotulo]) => (
          <button
            key={valorAcao}
            type='button'
            role='radio'
            aria-checked={acao === valorAcao}
            disabled={valorAcao === 'resgatar' && guardado <= 0}
            className={`form-meta-segmento-opcao ${acao === valorAcao ? 'form-meta-segmento-ativo' : ''}`}
            onClick={() => setAcao(valorAcao)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className='form-meta-linha'>
        <label className='form-meta-campo'>
          <span>Valor</span>
          <input type='text' inputMode='decimal' placeholder='0,00' value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
        </label>

        <label className='form-meta-campo'>
          <span>Data</span>
          <input type='date' value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>

      <small className='form-meta-dica'>
        {resgate
          ? `Disponível em ${meta.nome}: ${formatarMoeda(guardado)}.`
          : 'Use o dinheiro que sobrou na conta. Guardar não altera o saldo disponível.'}
      </small>

      {erro && <p className='form-meta-erro' role='alert'>{erro}</p>}

      <div className='form-meta-acao'>
        <button type='submit' className='botao botao-primario' disabled={pendentes.length > 0 || salvando}>
          {salvando ? 'Salvando...' : resgate ? 'Resgatar' : 'Guardar'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-meta-pendentes'>Preencha: {juntarLista(pendentes)}.</small>
        )}
      </div>
    </form>
  )
}

export default FormMovimentoMeta
