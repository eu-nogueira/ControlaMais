import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdPerson, MdPeopleAlt, MdRemove } from 'react-icons/md'
import { adicionarConta, editarConta } from '../../store/extrato'
import { formatarMoeda } from '../../utils/formatar'
import { calcularUsoCartoes, encontrarCartao, mesmoCartao } from '../../utils/cartoes'
import { TIPOS_DESPESA } from '../../utils/dashboard'
import './FormConta.css'

function hojeISO() {
  const data = new Date()
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset())
  return data.toISOString().slice(0, 10)
}

// Com `conta`, o formulário edita a movimentação existente em vez de criar uma nova.
function FormConta({ tipoInicial = 'Receita', conta, onConcluir }) {
  const [descricao, setDescricao] = useState(conta?.descricao ?? '')
  const [valor, setValor] = useState(conta ? String(conta.valorFormatado).replace('.', ',') : '')
  const [tipoConta, setTipoConta] = useState(conta?.tipoConta ?? tipoInicial)
  const [parcela, setParcela] = useState(conta?.parcela ? String(conta.parcela) : '1')
  const [responsavel, setResponsavel] = useState(conta?.responsavel ?? '')
  const [dataVencimento, setDataVencimento] = useState(conta?.dataVencimento ?? '')
  const [cadastroData, setCadastroData] = useState(conta?.dataCadastro ?? hojeISO)
  const [selected, setSelected] = useState(conta?.selected ?? true)
  const [anotarPara, setAnotarPara] = useState(conta?.anotarPara ?? '')
  const [ehCartao, setEhCartao] = useState(Boolean(conta?.cartao))
  const [cartao, setCartao] = useState(conta?.cartao ?? '')
  const [contaFixa, setContaFixa] = useState(conta?.contaFixa ?? false)
  const categoriaInicial = conta?.categoria ?? ''
  const tipoConhecido = TIPOS_DESPESA.includes(categoriaInicial)
  const [tipoDespesa, setTipoDespesa] = useState(tipoConhecido ? categoriaInicial : categoriaInicial ? 'Outros' : '')
  const [outroTipo, setOutroTipo] = useState(tipoConhecido ? '' : categoriaInicial)
  const [salvando, setSalvando] = useState(false)
  const cartoesCadastrados = useSelector((state) => state.cartoes.lista)
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const dispatch = useDispatch()

  const despesa = tipoConta === 'Despesa'
  const valorFormatado = +valor.replace(',', '.')
  const totalParcelas = Number(parcela) || 0
  const parcelasPagas = conta?.parcelaPaga || 0
  // Na edição, o próprio gasto sai do cálculo para não ser contado duas vezes no limite.
  const outrasContas = conta ? contas.filter((item) => item.id !== conta.id) : contas
  const cartaoEscolhido = encontrarCartao(calcularUsoCartoes(cartoesCadastrados, outrasContas, fechamento), cartao)

  const pendentes = [
    !(valorFormatado > 0) && 'valor',
    !descricao.trim() && 'descrição',
    despesa && !contaFixa && totalParcelas < 1 && 'parcelas',
    despesa && !contaFixa && totalParcelas >= 1 && totalParcelas < parcelasPagas && `parcelas (já há ${parcelasPagas} pagas)`,
    despesa && !selected && !responsavel.trim() && 'quem vai te pagar',
    despesa && ehCartao && !cartao.trim() && 'cartão usado',
  ].filter(Boolean)

  function alterarParcela(quantidade) {
    setParcela(String(Math.max(1, totalParcelas + quantidade)))
  }

  function resumoDespesa() {
    if (contaFixa) return resumoContaFixa()
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

  function resumoContaFixa() {
    const valorTexto = valorFormatado > 0 ? formatarMoeda(valorFormatado) : 'O valor'
    const acompanhamento = 'Acompanhe na aba Parcelas; contas fixas não somam em "Falta pagar".'

    if (selected) {
      return anotarPara.trim()
        ? `${valorTexto} será descontado do seu saldo todo mês e ficará em "A pagar" para ${anotarPara.trim()}. ${acompanhamento}`
        : `${valorTexto} será descontado do seu saldo todo mês, sem data para terminar. ${acompanhamento}`
    }

    return responsavel.trim()
      ? `Seu saldo não muda. ${valorTexto} ficará em "A receber" de ${responsavel.trim()} todo mês. ${acompanhamento}`
      : `Seu saldo não muda. ${valorTexto} ficará em "A receber" da pessoa que vai te pagar todo mês. ${acompanhamento}`
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

  function avisoCartao() {
    if (cartoesCadastrados.length === 0) return 'Cadastre seus cartões na aba Cartões para acompanhar o limite.'
    if (!cartao.trim()) return 'Escolha um cartão cadastrado ou digite o nome.'
    if (!cartaoEscolhido) return 'Cartão não cadastrado: o limite dele não será controlado.'

    const disponivel = `Disponível no ${cartaoEscolhido.nome}: ${formatarMoeda(cartaoEscolhido.disponivel)}.`
    const totalCompra = contaFixa ? valorFormatado : valorFormatado * Math.max(totalParcelas, 1)
    return totalCompra > cartaoEscolhido.disponivel ? `${disponivel} Este gasto passa do limite disponível.` : disponivel
  }

  async function handleAdicao(event) {
    event.preventDefault()
    if (pendentes.length > 0 || salvando) return

    setSalvando(true)
    try {
      await dispatch((conta ? editarConta : adicionarConta)({
        ...(conta && { id: conta.id }),
        descricao: descricao.trim(),
        dataCadastro: cadastroData || hojeISO(),
        valorFormatado,
        tipoConta,
        responsavel: despesa ? responsavel.trim() : '',
        parcela: despesa && !contaFixa ? parcela : '',
        contaFixa: despesa && contaFixa,
        dataVencimento: despesa ? dataVencimento : '',
        selected: despesa && selected,
        anotarPara: despesa && selected ? anotarPara.trim() : '',
        cartao: despesa && ehCartao ? (cartaoEscolhido?.nome ?? cartao.trim()) : '',
        categoria: !despesa ? '' : tipoDespesa === 'Outros' ? outroTipo.trim() || 'Outros' : tipoDespesa
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
        <span>{!despesa ? 'Quanto você recebeu?' : contaFixa ? 'Qual o valor por mês?' : totalParcelas > 1 ? 'Qual o valor de cada parcela?' : 'Quanto foi gasto?'}</span>
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
            <legend>Tipo de despesa <em>(opcional)</em></legend>
            <div className='form-cartoes' role='group' aria-label='Tipo de despesa'>
              {[...TIPOS_DESPESA, 'Outros'].map((tipo) => (
                <button
                  key={tipo}
                  type='button'
                  aria-pressed={tipoDespesa === tipo}
                  className={`form-cartoes-opcao ${tipoDespesa === tipo ? 'form-cartoes-opcao-ativa' : ''}`}
                  onClick={() => setTipoDespesa(tipoDespesa === tipo ? '' : tipo)}
                >
                  {tipo}
                </button>
              ))}
            </div>
            {tipoDespesa === 'Outros' && (
              <label className='form-campo'>
                <span>Qual tipo?</span>
                <input type='text' placeholder='Ex.: Saúde, Educação, Casa' value={outroTipo} onChange={(e) => setOutroTipo(e.target.value)} />
              </label>
            )}
            <small className='form-dica'>Serve apenas para o Dashboard, no gráfico de pizza que mostra para onde seus gastos estão indo.</small>
          </fieldset>

          <fieldset className='form-secao'>
            <legend>Pagamento</legend>

            <label className='form-checkbox'>
              <input type='checkbox' checked={contaFixa} onChange={(e) => setContaFixa(e.target.checked)} />
              <span>Conta fixa</span>
              <small>
                {contaFixa
                  ? 'Cobrada todo mês, sem número de parcelas (ex.: aluguel, financiamento longo).'
                  : 'Marque para despesas mensais sem fim definido, como aluguel.'}
              </small>
            </label>

            <div className='form-linha'>
              {!contaFixa && (
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
              )}

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
              <div className='form-campo'>
                <span id='rotulo-cartao'>Qual cartão foi usado?</span>
                {cartoesCadastrados.length > 0 && (
                  <div className='form-cartoes' role='group' aria-label='Cartões cadastrados'>
                    {cartoesCadastrados.map((item) => (
                      <button
                        key={item.id}
                        type='button'
                        aria-pressed={mesmoCartao(item.nome, cartao)}
                        className={`form-cartoes-opcao ${mesmoCartao(item.nome, cartao) ? 'form-cartoes-opcao-ativa' : ''}`}
                        onClick={() => setCartao(item.nome)}
                      >
                        {item.nome}{item.final && ` •••• ${item.final}`}
                      </button>
                    ))}
                  </div>
                )}
                <input aria-labelledby='rotulo-cartao' type='text' placeholder='Ex.: Nubank, Itaú' value={cartao} onChange={(e) => setCartao(e.target.value)} />
                <small aria-live='polite'>{avisoCartao()}</small>
              </div>
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
          {salvando ? 'Salvando...' : conta ? 'Salvar alterações' : despesa ? 'Adicionar despesa' : 'Adicionar receita'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-pendentes'>Preencha: {pendentes.join(', ')}.</small>
        )}
      </div>
    </form>
  )
}

export default FormConta
