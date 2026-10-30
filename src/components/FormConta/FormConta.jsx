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
  const [ehCartao, setEhCartao] = useState(false)
  const [cartao, setCartao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const dispatch = useDispatch()

  const despesa = tipoConta === 'Despesa'
  const valorFormatado = +valor.replace(',', '.')
  const totalParcelas = Number(parcela) || 0

  const pendentes = [
    !(valorFormatado > 0) && 'valor',
    !descricao.trim() && 'descrição',
    despesa && totalParcelas < 1 && 'parcelas',
    despesa && !selected && !responsavel.trim() && 'quem vai te pagar',
    despesa && ehCartao && !cartao.trim() && 'cartão usado',
  ].filter(Boolean)

  function alterarParcela(quantidade) {
    setParcela(String(Math.max(1, totalParcelas + quantidade)))
  }

  function resumoDespesa() {
    if (totalParcelas > 1) return resumoParcelado()

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

  function resumoParcelado() {
    const parcelaTexto = valorFormatado > 0 ? `A parcela de ${formatarMoeda(valorFormatado)}` : 'A parcela'
    const totalTexto = valorFormatado > 0 ? ` (total de ${formatarMoeda(valorFormatado * totalParcelas)})` : ''
    const acompanhamento = `Acompanhe as ${totalParcelas} parcelas${totalTexto} na aba Parcelas.`

    if (selected) {
      return anotarPara.trim()
        ? `${parcelaTexto} será descontada do seu saldo e ficará em "A pagar" para ${anotarPara.trim()}. ${acompanhamento}`
        : `${parcelaTexto} será descontada do seu saldo e somada às despesas do mês. ${acompanhamento}`
    }

    return responsavel.trim()
      ? `Seu saldo não muda. ${parcelaTexto} ficará em "A receber" de ${responsavel.trim()}. ${acompanhamento}`
      : `Seu saldo não muda. ${parcelaTexto} ficará em "A receber" da pessoa que vai te pagar. ${acompanhamento}`
  }

  async function handleAdicao(event) {
    event.preventDefault()
    if (pendentes.length > 0 || salvando) return

    setSalvando(true)
    try {
      await dispatch(adicionarConta({
        descricao: descricao.trim(),
        dataCadastro: cadastroData || hojeISO(),
        valorFormatado,
        tipoConta,
        responsavel: despesa ? responsavel.trim() : '',
        parcela: despesa ? parcela : '',
        dataVencimento: despesa ? dataVencimento : '',
        selected: despesa && selected,
        anotarPara: despesa && selected ? anotarPara.trim() : '',
        cartao: despesa && ehCartao ? cartao.trim() : ''
      })).unwrap()
      onConcluir()
    } catch {
      setSalvando(false)
    }
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
        <span>{!despesa ? 'Quanto você recebeu?' : totalParcelas > 1 ? 'Qual o valor de cada parcela?' : 'Quanto foi gasto?'}</span>
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
                <small>
                  {totalParcelas <= 1
                    ? 'À vista'
                    : `Em ${totalParcelas} vezes${valorFormatado > 0 ? ` · total ${formatarMoeda(valorFormatado * totalParcelas)}` : ''}`}
                </small>
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
              <label className='form-campo'>
                <span>Quem vai te pagar?</span>
                <input type='text' placeholder='Ex.: João' value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
              </label>
            )}

            <label className='form-checkbox'>
              <input type='checkbox' checked={ehCartao} onChange={(e) => setEhCartao(e.target.checked)} />
              <span>É cartão?</span>
              <small>{ehCartao ? 'Informe o cartão usado na compra.' : 'Desmarcado, o pagamento fica registrado como Pix.'}</small>
            </label>
            {ehCartao && (
              <label className='form-campo'>
                <span>Qual cartão foi usado?</span>
                <input type='text' placeholder='Ex.: Nubank, Itaú' value={cartao} onChange={(e) => setCartao(e.target.value)} />
              </label>
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
        <button type='submit' className='botao botao-primario' disabled={pendentes.length > 0 || salvando}>
          {salvando ? 'Salvando...' : despesa ? 'Adicionar despesa' : 'Adicionar receita'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-pendentes'>Preencha: {pendentes.join(', ')}.</small>
        )}
      </div>
    </form>
  )
}

export default FormConta
