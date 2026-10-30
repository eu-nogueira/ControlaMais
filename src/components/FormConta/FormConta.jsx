import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { MdAdd, MdPerson, MdPeopleAlt, MdRemove } from 'react-icons/md'
import { adicionarConta } from '../../store/extrato'
import { formatarMoeda } from '../../utils/formatar'
import './FormConta.css'

function hojeISO() {
  const data = new Date()
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset())
  return data.toISOString().slice(0, 10)
}

function FormConta({ tipoInicial = 'Receita', onConcluir }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoConta, setTipoConta] = useState(tipoInicial)
  const [parcela, setParcela] = useState('1')
  const [responsavel, setResponsavel] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [cadastroData, setCadastroData] = useState(hojeISO)
  const [selected, setSelected] = useState(true)
  const [anotarPara, setAnotarPara] = useState('')
  const dispatch = useDispatch()

  const despesa = tipoConta === 'Despesa'
  const valorFormatado = +valor.replace(',', '.')
  const totalParcelas = Number(parcela) || 0

  const pendentes = [
    !(valorFormatado > 0) && 'valor',
    !descricao.trim() && 'descrição',
    despesa && totalParcelas < 1 && 'parcelas',
    despesa && !selected && !responsavel.trim() && 'quem vai te pagar',
    despesa && !selected && !anotarPara.trim() && 'em nome de quem foi a compra',
  ].filter(Boolean)

  function alterarParcela(quantidade) {
    setParcela(String(Math.max(1, totalParcelas + quantidade)))
  }

  function resumoDespesa() {
    const valorTexto = valorFormatado > 0 ? formatarMoeda(valorFormatado) : 'O valor'

    if (selected) {
      return anotarPara.trim()
        ? `${valorTexto} será descontado do seu saldo e ficará em "A pagar" para ${anotarPara.trim()}.`
        : `${valorTexto} será descontado do seu saldo e somado às despesas do mês.`
    }

    return responsavel.trim()
      ? `Seu saldo não muda. ${valorTexto} ficará em "A receber" de ${responsavel.trim()}.`
      : 'Seu saldo não muda. O valor ficará em "A receber" da pessoa que vai te pagar.'
  }

  function handleAdicao(event) {
    event.preventDefault()
    if (pendentes.length > 0) return

    const data = cadastroData ? new Date(`${cadastroData}T00:00:00`) : new Date()
    const dataCadastro = new Intl.DateTimeFormat(
      'pt-BR'
    ).format(data)

    dispatch(adicionarConta({
      id: crypto.randomUUID(),
      descricao: descricao.trim(),
      dataCadastro,
      valorFormatado,
      tipoConta,
      responsavel: despesa ? responsavel.trim() : '',
      parcela: despesa ? parcela : '',
      dataVencimento: despesa ? dataVencimento : '',
      selected: despesa && selected,
      anotarPara: despesa ? anotarPara.trim() : ''
    }))
    onConcluir()
  }

  return (
    <form className='form-conta' onSubmit={handleAdicao}>
      <div className='form-segmento' role='radiogroup' aria-label='Tipo de movimentação'>
        {['Receita', 'Despesa'].map((tipo) => (
          <button
            key={tipo}
            type='button'
            role='radio'
            aria-checked={tipoConta === tipo}
            className={`form-segmento-opcao ${tipoConta === tipo ? `form-segmento-ativo-${tipo.toLowerCase()}` : ''}`}
            onClick={() => setTipoConta(tipo)}
          >
            {tipo === 'Receita' ? 'Entrada (receita)' : 'Saída (despesa)'}
          </button>
        ))}
      </div>

      <label className='form-valor'>
        <span>{despesa ? 'Quanto foi gasto?' : 'Quanto você recebeu?'}</span>
        <div className='form-valor-campo'>
          <span aria-hidden='true'>R$</span>
          <input
            type='text'
            inputMode='decimal'
            placeholder='0,00'
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            aria-label='Valor em reais'
            autoFocus
          />
        </div>
      </label>

      <label className='form-campo'>
        <span>{despesa ? 'Com o que foi gasto?' : 'De onde veio?'}</span>
        <input type='text' placeholder={despesa ? 'Ex.: Conta de luz, mercado' : 'Ex.: Salário, venda, Pix'} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>

      {despesa && (
        <>
          <fieldset className='form-secao'>
            <legend>Pagamento</legend>

            <div className='form-linha'>
              <div className='form-campo'>
                <span id='rotulo-parcelas'>Parcelas</span>
                <div className='form-contador' role='group' aria-labelledby='rotulo-parcelas'>
                  <button type='button' onClick={() => alterarParcela(-1)} disabled={totalParcelas <= 1} aria-label='Diminuir parcelas'>
                    <MdRemove size={20} />
                  </button>
                  <input
                    type='number'
                    inputMode='numeric'
                    min='1'
                    value={parcela}
                    onChange={(e) => setParcela(e.target.value)}
                    aria-labelledby='rotulo-parcelas'
                  />
                  <button type='button' onClick={() => alterarParcela(1)} aria-label='Aumentar parcelas'>
                    <MdAdd size={20} />
                  </button>
                </div>
                <small>{totalParcelas <= 1 ? 'À vista' : `Em ${totalParcelas} vezes`}</small>
              </div>

              <label className='form-campo'>
                <span>Vencimento <em>(opcional)</em></span>
                <input type='date' value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className='form-secao'>
            <legend>Quem paga essa despesa?</legend>

            <div className='form-opcoes' role='radiogroup' aria-label='Quem paga essa despesa?'>
              <button
                type='button'
                role='radio'
                aria-checked={selected}
                className={`form-opcao ${selected ? 'form-opcao-ativa' : ''}`}
                onClick={() => setSelected(true)}
              >
                <MdPerson size={22} />
                <strong>Eu pago</strong>
                <small>Sai do meu saldo</small>
              </button>
              <button
                type='button'
                role='radio'
                aria-checked={!selected}
                className={`form-opcao ${!selected ? 'form-opcao-ativa' : ''}`}
                onClick={() => setSelected(false)}
              >
                <MdPeopleAlt size={22} />
                <strong>Outra pessoa</strong>
                <small>Vai me reembolsar</small>
              </button>
            </div>

            {selected ? (
              <label className='form-campo'>
                <span>Vai pagar alguém por essa compra? <em>(opcional)</em></span>
                <input type='text' placeholder='Ex.: Ana' value={anotarPara} onChange={(e) => setAnotarPara(e.target.value)} />
                <small>Use quando a compra foi feita no cartão ou no nome de outra pessoa.</small>
              </label>
            ) : (
              <>
                <label className='form-campo'>
                  <span>Quem vai te pagar?</span>
                  <input type='text' placeholder='Ex.: João' value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
                </label>
                <label className='form-campo'>
                  <span>Em nome de quem foi a compra?</span>
                  <input type='text' placeholder='Ex.: seu nome ou o cartão usado' value={anotarPara} onChange={(e) => setAnotarPara(e.target.value)} />
                  <small>Cartão, conta ou caderneta em que a compra foi anotada.</small>
                </label>
              </>
            )}

            <p className='form-resumo' aria-live='polite'>{resumoDespesa()}</p>
          </fieldset>
        </>
      )}

      <label className='form-campo'>
        <span>Data da movimentação</span>
        <input type='date' value={cadastroData} onChange={(e) => setCadastroData(e.target.value)} />
      </label>

      <div className='form-acao'>
        <button type='submit' className='botao botao-primario' disabled={pendentes.length > 0}>
          {despesa ? 'Adicionar despesa' : 'Adicionar receita'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-pendentes'>Preencha: {pendentes.join(', ')}.</small>
        )}
      </div>
    </form>
  )
}

export default FormConta
