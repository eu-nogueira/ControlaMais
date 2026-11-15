import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdPerson, MdPeopleAlt, MdRemove } from 'react-icons/md'
import { adicionarConta, editarConta } from '../../store/extrato'
import { formatarMoeda, juntarLista } from '../../utils/formatar'
import { calcularUsoCartoes, encontrarCartao, mesmoCartao } from '../../utils/cartoes'
import { TIPOS_DESPESA } from '../../utils/dashboard'
import { nomesDasPessoas, unificarNome } from '../../utils/acertos'
import { deslocarMes, formatarMes } from '../../utils/mes'
import { mesSaldoPeloVencimento, mesesParaFechar } from '../../utils/saldo'
import useMesAtual from '../../hooks/useMesAtual'
import './FormConta.css'

const nomeMes = (mes) => formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()

function hojeISO() {
  const data = new Date()
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset())
  return data.toISOString().slice(0, 10)
}

// Na edição, só marca a escolha quando o saldo salvo difere do que o vencimento indicaria.
function origemSaldoInicial(conta) {
  if (!conta?.mesSaldo) return ''
  const mesCadastro = conta.dataCadastro.slice(0, 7)
  const atual = conta.mesSaldo < mesCadastro
  const peloVencimento = Boolean(conta.dataVencimento) && conta.dataVencimento.slice(0, 7) <= mesCadastro
  if (atual === peloVencimento && conta.dataVencimento) return ''
  return atual ? 'atual' : 'proximo'
}

// Com `conta`, o formulário edita a movimentação existente em vez de criar uma nova.
// Com `sugestao` (vinda do Copiloto), cria uma nova já preenchida com os campos interpretados.
function FormConta({ tipoInicial = 'Receita', conta, sugestao, onConcluir }) {
  const inicial = conta ?? sugestao
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valor, setValor] = useState(inicial?.valorFormatado ? String(inicial.valorFormatado).replace('.', ',') : '')
  const [tipoConta, setTipoConta] = useState(inicial?.tipoConta ?? tipoInicial)
  const [parcela, setParcela] = useState(inicial?.parcela ? String(inicial.parcela) : '1')
  const [responsavel, setResponsavel] = useState(inicial?.responsavel ?? '')
  const [dataVencimento, setDataVencimento] = useState(inicial?.dataVencimento ?? '')
  const [cadastroData, setCadastroData] = useState(inicial?.dataCadastro ?? hojeISO)
  const [selected, setSelected] = useState(inicial?.selected ?? true)
  const [anotarPara, setAnotarPara] = useState(inicial?.anotarPara ?? '')
  const [ehCartao, setEhCartao] = useState(Boolean(inicial?.cartao || inicial?.ehCartao))
  const [cartao, setCartao] = useState(inicial?.cartao ?? '')
  const [contaFixa, setContaFixa] = useState(inicial?.contaFixa ?? false)
  // '' segue o vencimento; 'atual' desconta do saldo do mês passado; 'proximo', do próximo salário.
  const [origemSaldo, setOrigemSaldo] = useState(() => origemSaldoInicial(conta))
  const categoriaInicial = inicial?.categoria ?? ''
  const tipoConhecido = TIPOS_DESPESA.includes(categoriaInicial)
  const [tipoDespesa, setTipoDespesa] = useState(tipoConhecido ? categoriaInicial : categoriaInicial ? 'Outros' : '')
  const [outroTipo, setOutroTipo] = useState(tipoConhecido ? '' : categoriaInicial)
  const [salvando, setSalvando] = useState(false)
  const cartoesCadastrados = useSelector((state) => state.cartoes.lista)
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const mesAtual = useMesAtual()
  const dispatch = useDispatch()

  const despesa = tipoConta === 'Despesa'
  const valorFormatado = +valor.replace(',', '.')
  const totalParcelas = Number(parcela) || 0
  const parcelasPagas = conta?.parcelaPaga || 0
  // Na edição, o próprio gasto sai do cálculo para não ser contado duas vezes no limite.
  const outrasContas = conta ? contas.filter((item) => item.id !== conta.id) : contas
  // Comprando no cartão de quem você vai pagar, seus cartões ficam de fora: o limite deles não muda.
  const cartaoDeTerceiro = despesa && selected && Boolean(anotarPara.trim())
  const cartaoEscolhido = cartaoDeTerceiro ? undefined : encontrarCartao(calcularUsoCartoes(cartoesCadastrados, outrasContas, fechamento), cartao)

  // Vencimento a partir de dois meses à frente: sai do saldo do mês anterior ao vencimento
  // (vence 05/01 → saldo de dezembro), que ainda está por vir.
  const mesFuturo = despesa ? mesSaldoPeloVencimento(dataVencimento, mesAtual, cadastroData || hojeISO()) : ''

  // Despesa do mês atual com o mês passado ainda não quitado: o vencimento decide de qual saldo ela sai.
  // Vencendo até o mês atual, sai do saldo exibido; depois disso, fica para o próximo salário.
  const mesesAbertos = mesesParaFechar(outrasContas, fechamento, mesAtual)
  const mesPassado = mesesAbertos[mesesAbertos.length - 1]
  const decidirPeloVencimento = despesa && selected && !mesFuturo && Boolean(mesPassado) && (cadastroData || hojeISO()).slice(0, 7) === mesAtual
  const descontaPeloVencimento = Boolean(dataVencimento) && dataVencimento.slice(0, 7) <= mesAtual
  // A escolha do usuário (saldo atual ou próximo salário) tem prioridade sobre o vencimento.
  const descontaDoSaldoAtual = origemSaldo ? origemSaldo === 'atual' : descontaPeloVencimento

  const pendentes = [
    !(valorFormatado > 0) && 'valor',
    !descricao.trim() && 'descrição',
    despesa && !contaFixa && totalParcelas < 1 && 'parcelas',
    despesa && !contaFixa && totalParcelas >= 1 && totalParcelas < parcelasPagas && `parcelas (já há ${parcelasPagas} pagas)`,
    despesa && !selected && !responsavel.trim() && 'quem vai te pagar',
    despesa && ehCartao && !cartao.trim() && 'cartão usado',
    decidirPeloVencimento && !origemSaldo && !dataVencimento && 'vencimento ou de onde descontar',
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
    if (cartaoDeTerceiro) return `Cartão de ${anotarPara.trim()}: não entra no limite dos seus cartões.`
    if (cartoesCadastrados.length === 0) return 'Cadastre seus cartões na aba Cartões para acompanhar o limite.'
    if (!cartao.trim()) return 'Escolha um cartão cadastrado ou digite o nome.'
    if (!cartaoEscolhido) return 'Cartão não cadastrado: o limite dele não será controlado.'

    const disponivel = `Disponível no ${cartaoEscolhido.nome}: ${formatarMoeda(cartaoEscolhido.disponivel)}.`
    const totalCompra = contaFixa ? valorFormatado : valorFormatado * Math.max(totalParcelas, 1)
    return totalCompra > cartaoEscolhido.disponivel ? `${disponivel} Este gasto passa do limite disponível.` : disponivel
  }

  function mesSaldoEscolhido() {
    if (mesFuturo) return mesFuturo
    if (decidirPeloVencimento) return descontaDoSaldoAtual ? mesPassado : mesAtual
    // Depois de quitado o mês passado, a despesa segue no saldo em que foi descontada. Um mês futuro
    // vindo de um vencimento que foi alterado não vale mais.
    return despesa && selected && conta?.mesSaldo && conta.mesSaldo <= mesAtual ? conta.mesSaldo : ''
  }

  function avisoOrigemSaldo() {
    if (origemSaldo === 'atual') return `Será descontada do saldo atual (${nomeMes(mesPassado)}), independente do vencimento.`
    if (origemSaldo === 'proximo') return `Fica para o próximo salário (${nomeMes(mesAtual)}), independente do vencimento.`
    if (!dataVencimento) return `As contas de ${nomeMes(mesPassado)} ainda não foram quitadas: escolha de onde descontar ou informe o vencimento.`
    return descontaPeloVencimento
      ? `Vence em ${nomeMes(mesAtual)}: será descontada do saldo atual.`
      : `Vence depois de ${nomeMes(mesAtual)}: fica para o próximo salário.`
  }

  async function handleAdicao(event) {
    event.preventDefault()
    if (pendentes.length > 0 || salvando) return

    setSalvando(true)
    try {
      const salva = await dispatch((conta ? editarConta : adicionarConta)({
        ...(conta && { id: conta.id }),
        descricao: descricao.trim(),
        dataCadastro: cadastroData || hojeISO(),
        valorFormatado,
        tipoConta,
        // A mesma pessoa escrita de outro jeito ("nagano store") usa a grafia já cadastrada,
        // para não aparecer como outra pessoa nos acertos.
        responsavel: despesa ? unificarNome(responsavel, outrasContas) : '',
        parcela: despesa && !contaFixa ? parcela : '',
        contaFixa: despesa && contaFixa,
        dataVencimento: despesa ? dataVencimento : '',
        selected: despesa && selected,
        anotarPara: despesa && selected ? unificarNome(anotarPara, outrasContas) : '',
        cartao: despesa && ehCartao ? (cartaoEscolhido?.nome ?? cartao.trim()) : '',
        categoria: !despesa ? '' : tipoDespesa === 'Outros' ? outroTipo.trim() || 'Outros' : tipoDespesa,
        mesSaldo: mesSaldoEscolhido()
      })).unwrap()
      onConcluir(salva)
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
            <small className='form-dica'>Serve apenas para os Dashboards, no comparativo com o mês anterior e no gráfico que mostra para onde seus gastos estão indo.</small>
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
                <span>Vencimento {(!decidirPeloVencimento || origemSaldo) && <em>(opcional)</em>}</span>
                <input type='date' value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
              </label>
            </div>

            {mesFuturo && (
              <p className='form-resumo' aria-live='polite'>
                {selected
                  ? `Vence em ${nomeMes(deslocarMes(mesFuturo, 1))}: sai do saldo de ${nomeMes(mesFuturo)}, e não do saldo atual.`
                  : `Vence em ${nomeMes(deslocarMes(mesFuturo, 1))}: entra nos acertos de ${nomeMes(mesFuturo)}.`}
              </p>
            )}

            {decidirPeloVencimento && (
              <div className='form-campo'>
                <span id='rotulo-origem-saldo'>De onde descontar?</span>
                <div className='form-cartoes' role='radiogroup' aria-labelledby='rotulo-origem-saldo'>
                  {[
                    ['', 'Pelo vencimento'],
                    ['atual', `Saldo atual (${nomeMes(mesPassado)})`],
                    ['proximo', `Próximo salário (${nomeMes(mesAtual)})`],
                  ].map(([opcao, rotulo]) => (
                    <button
                      key={opcao || 'vencimento'}
                      type='button'
                      role='radio'
                      aria-checked={origemSaldo === opcao}
                      className={`form-cartoes-opcao ${origemSaldo === opcao ? 'form-cartoes-opcao-ativa' : ''}`}
                      onClick={() => setOrigemSaldo(opcao)}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
                <small aria-live='polite'>{avisoOrigemSaldo()}</small>
              </div>
            )}
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
                <input type='text' placeholder='Ex.: Ana' value={anotarPara} onChange={(e) => setAnotarPara(e.target.value)} list='form-pessoas' autoComplete='off' />
                <small>Use quando a compra foi feita no cartão ou no nome de outra pessoa.</small>
              </label>
            ) : (
              <label className='form-campo'>
                <span>Quem vai te pagar?</span>
                <input type='text' placeholder='Ex.: João' value={responsavel} onChange={(e) => setResponsavel(e.target.value)} list='form-pessoas' autoComplete='off' />
              </label>
            )}

            <label className='form-checkbox'>
              <input type='checkbox' checked={ehCartao} onChange={(e) => setEhCartao(e.target.checked)} />
              <span>É cartão?</span>
              <small>{ehCartao ? 'Informe o cartão usado na compra.' : 'Desmarcado, o pagamento fica registrado como Pix.'}</small>
            </label>
            {ehCartao && (
              <div className='form-campo'>
                <span id='rotulo-cartao'>{cartaoDeTerceiro ? `Qual cartão de ${anotarPara.trim()} foi usado?` : 'Qual cartão foi usado?'}</span>
                {cartoesCadastrados.length > 0 && !cartaoDeTerceiro && (
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

      {/* Sugere os nomes já usados nos acertos enquanto a pessoa é digitada. */}
      <datalist id='form-pessoas'>
        {nomesDasPessoas(outrasContas).map((nome) => <option key={nome} value={nome} />)}
      </datalist>

      <label className='form-campo'>
        <span>Data da movimentação</span>
        <input type='date' value={cadastroData} onChange={(e) => setCadastroData(e.target.value)} />
      </label>

      <div className='form-acao'>
        <button type='submit' className='botao botao-primario' disabled={pendentes.length > 0 || salvando}>
          {salvando ? 'Salvando...' : conta ? 'Salvar alterações' : despesa ? 'Adicionar despesa' : 'Adicionar receita'}
        </button>
        {pendentes.length > 0 && (
          <small className='form-pendentes'>Preencha: {juntarLista(pendentes)}.</small>
        )}
      </div>
    </form>
  )
}

export default FormConta
