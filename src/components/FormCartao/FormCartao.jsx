import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { MdCheck } from 'react-icons/md'
import { adicionarCartao, editarCartao } from '../../store/cartoes'
import { CORES_CARTAO } from '../../utils/cartoes'
import { lerValor } from '../../utils/formatar'
import './FormCartao.css'

function FormCartao({ cartao, nomeInicial = '', onConcluir }) {
  const [nome, setNome] = useState(cartao?.nome ?? nomeInicial)
  const [final, setFinal] = useState(cartao?.final ?? '')
  const [limite, setLimite] = useState(cartao ? String(cartao.limite).replace('.', ',') : '')
  const [diaVencimento, setDiaVencimento] = useState(cartao?.diaVencimento ? String(cartao.diaVencimento) : '')
  const [cor, setCor] = useState(cartao?.cor || CORES_CARTAO[0].valor)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dispatch = useDispatch()

  const valorLimite = lerValor(limite)
  const dia = Number(diaVencimento)
  const renomeando = cartao && nome.trim() !== cartao.nome

  const pendentes = [
    !nome.trim() && 'nome',
    !(limite.trim() && valorLimite >= 0) && 'limite',
    final && !/^\d{4}$/.test(final) && '4 últimos dígitos',
    diaVencimento && !(Number.isInteger(dia) && dia >= 1 && dia <= 31) && 'dia de vencimento',
  ].filter(Boolean)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pendentes.length > 0 || salvando) return

    setSalvando(true)
    setErro('')
    const dados = { nome: nome.trim(), final, limite: valorLimite, diaVencimento, cor }

    try {
      if (cartao) {
        await dispatch(editarCartao({ id: cartao.id, nomeAnterior: cartao.nome, ...dados })).unwrap()
      } else {
        await dispatch(adicionarCartao(dados)).unwrap()
      }
      onConcluir()
    } catch (error) {
      setErro(error.message)
      setSalvando(false)
    }
  }

  return (
    <form className='form-cartao' onSubmit={handleSubmit}>
      <label className='form-cartao-campo'>
        <span>Nome do cartão</span>
        <input type='text' placeholder='Ex.: Nubank, Itaú Platinum' value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        <small>Use o mesmo nome ao registrar gastos com &quot;É cartão?&quot; para consumir o limite deste cartão.</small>
        {renomeando && <small>Os gastos registrados como &quot;{cartao.nome}&quot; passarão a usar o novo nome.</small>}
      </label>

      <label className='form-cartao-campo'>
        <span>4 últimos dígitos <em>(opcional)</em></span>
        <input
          type='text'
          inputMode='numeric'
          maxLength={4}
          placeholder='0000'
          value={final}
          onChange={(e) => setFinal(e.target.value.replace(/\D/g, ''))}
        />
        <small>Se preferir, identifique o cartão apenas pelo nome.</small>
      </label>

      <div className='form-cartao-linha'>
        <label className='form-cartao-campo'>
          <span>Limite total</span>
          <input type='text' inputMode='decimal' placeholder='0,00' value={limite} onChange={(e) => setLimite(e.target.value)} />
        </label>

        <label className='form-cartao-campo'>
          <span>Vencimento <em>(opcional)</em></span>
          <input
            type='number'
            inputMode='numeric'
            min='1'
            max='31'
            placeholder='Dia'
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(e.target.value)}
          />
        </label>
      </div>

      <div className='form-cartao-campo'>
        <span id='rotulo-cor-cartao'>Cor</span>
        <div className='form-cartao-cores' role='radiogroup' aria-labelledby='rotulo-cor-cartao'>
          {CORES_CARTAO.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type='button'
              role='radio'
              aria-checked={cor === valor}
              aria-label={rotulo}
              title={rotulo}
              className='form-cartao-cor'
              style={{ background: valor }}
              onClick={() => setCor(valor)}
            >
              {cor === valor && <MdCheck size={18} />}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className='form-cartao-erro' role='alert'>{erro}</p>}

      <div className='form-cartao-acao'>
        <button type='submit' className='botao botao-primario' disabled={pendentes.length > 0 || salvando}>
          {salvando ? 'Salvando...' : cartao ? 'Salvar cartão' : 'Adicionar cartão'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-cartao-pendentes'>Preencha: {pendentes.join(', ')}.</small>
        )}
      </div>
    </form>
  )
}

export default FormCartao
