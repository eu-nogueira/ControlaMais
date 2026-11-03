import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdArrowDownward, MdArrowUpward, MdInfoOutline, MdTaskAlt } from 'react-icons/md'
import { quitarMesesAnteriores } from '../../store/extrato'
import { formatarMoeda, juntarLista } from '../../utils/formatar'
import { formatarMes } from '../../utils/mes'
import { calcularSaldoExibido, mesesParaFechar, projetarProximoSalario } from '../../utils/saldo'
import useMesAtual from '../../hooks/useMesAtual'
import './Saldo.css'

function Saldo({ ocultar }) {
    const contas = useSelector((state) => state.extrato.contasExtrato)
    const fechamento = useSelector((state) => state.extrato.fechamento)
    const [confirmarQuitacao, setConfirmarQuitacao] = useState(false)
    const [quitando, setQuitando] = useState(false)
    const [explicacaoAberta, setExplicacaoAberta] = useState(false)
    const mesAtual = useMesAtual()
    const dispatch = useDispatch()

    const { receitas: receitaMes, despesas: despesaMes, saldo, mediaSalarial } = calcularSaldoExibido(contas, fechamento, mesAtual)
    const porcentagemComprometimento = receitaMes > 0 ? (despesaMes / receitaMes) * 100 : 0
    const larguraBarra = Math.min(porcentagemComprometimento, 100)

    const mesesAbertos = mesesParaFechar(contas, fechamento, mesAtual)
    const nomeMeses = juntarLista(mesesAbertos.map((mes) => formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()))
    const proximoSalario = projetarProximoSalario(contas, fechamento, mesAtual)
    const nomeMesAtual = formatarMes(mesAtual).replace(/ de \d{4}$/, '').toLowerCase()
    const nomeMesesMedia = mediaSalarial && juntarLista(mediaSalarial.meses.map((mes) => formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()))

    async function handleQuitar() {
        if (!confirmarQuitacao) {
            setConfirmarQuitacao(true)
            return
        }
        setQuitando(true)
        await dispatch(quitarMesesAnteriores(mesAtual))
        setQuitando(false)
        setConfirmarQuitacao(false)
    }

  return (
    <section className='saldo' aria-label='Resumo do saldo'>
        <div className='saldo-rotulo-linha'>
            <p className='saldo-rotulo'>Saldo disponível</p>
            <button
                type='button'
                className='saldo-info'
                onClick={() => setExplicacaoAberta(!explicacaoAberta)}
                aria-expanded={explicacaoAberta}
                aria-controls='saldo-explicacao'
                aria-label='Como o saldo disponível é calculado'
                title='Como o saldo disponível é calculado'
            >
                <MdInfoOutline size={18} />
            </button>
        </div>
        <p className={`saldo-valor ${saldo < 0 ? 'saldo-valor-negativo' : ''}`}>
            {formatarMoeda(saldo, ocultar)}
        </p>
        <p className='saldo-base'>
            {mediaSalarial
                ? `Considera a média salarial (${mediaSalarial.meses.length === 1 ? `salário de ${nomeMesesMedia}` : `média de ${nomeMesesMedia}`}) até o próximo salário ser registrado`
                : 'Considera o salário do próximo dia de pagamento'}
        </p>
        {explicacaoAberta && (
            <div id='saldo-explicacao' className='saldo-explicacao'>
                <p>
                    O saldo é o <strong>salário que você vai receber no próximo pagamento</strong> reduzindo o que será pago com ele:
                    fatura do cartão de crédito, boletos, parcelas e contas fixas.
                </p>
                <p>
                    <strong>Compras no débito não devem ser registradas</strong>: esse dinheiro já saiu da sua conta e não sai do próximo salário.
                </p>
                <p>
                    O que sobrar no fim do mês fica na conta para gastos no débito e <strong>não passa para o mês seguinte</strong>.
                </p>
                <p>
                    Enquanto as <strong>contas do mês passado não forem quitadas</strong>, ao registrar uma despesa do mês atual você
                    escolhe se ela sai do saldo exibido ou do próximo salário. Sem essa escolha, vale o vencimento: vencendo neste mês,
                    sai do saldo exibido; vencendo depois, fica para o próximo salário.
                </p>
                <p>
                    Depois de quitar o mês passado, enquanto o próximo salário não for registrado, ele é estimado pela
                    <strong> média salarial</strong>: a média das receitas com "salário" na descrição dos 3 últimos meses ou, se ainda não houver 3, a do último mês.
                </p>
                <p>
                    <strong>Exceção:</strong> dinheiro que você emprestou a outra pessoa pode ser registrado como despesa.
                </p>
            </div>
        )}

        <div className='saldo-mes'>
            <div className='saldo-mes-item'>
                <span className='saldo-mes-icone saldo-mes-icone-receita'><MdArrowDownward /></span>
                <div>
                    <p className='saldo-mes-rotulo'>{mediaSalarial ? 'Média salarial' : 'Receitas do mês'}</p>
                    <p className='saldo-mes-valor'>{formatarMoeda(receitaMes, ocultar)}</p>
                </div>
            </div>
            <div className='saldo-mes-item'>
                <span className='saldo-mes-icone saldo-mes-icone-despesa'><MdArrowUpward /></span>
                <div>
                    <p className='saldo-mes-rotulo'>Despesas do mês</p>
                    <p className='saldo-mes-valor'>{formatarMoeda(despesaMes, ocultar)}</p>
                </div>
            </div>
        </div>

        <div className='saldo-comprometimento'>
            <div className='saldo-comprometimento-texto'>
                <span>Renda comprometida</span>
                <strong>{ocultar ? '••%' : `${porcentagemComprometimento.toFixed(1).replace('.', ',')}%`}</strong>
            </div>
            <div
                className='saldo-barra'
                role='progressbar'
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(larguraBarra)}
                aria-label='Renda comprometida'
            >
                <span
                    className={larguraBarra >= 80 ? 'saldo-barra-alerta' : larguraBarra > 65 ? 'saldo-barra-atencao' : ''}
                    style={{ width: `${ocultar ? 0 : larguraBarra}%` }}
                />
            </div>
        </div>

        {mesesAbertos.length > 0 && (
            <div className='saldo-quitar'>
                {proximoSalario && (
                    <div className='saldo-proximo' aria-label={`Saldo do próximo salário (${nomeMesAtual})`}>
                        <div className='saldo-proximo-topo'>
                            <span>Próximo salário ({nomeMesAtual})</span>
                            <strong className={proximoSalario.saldo < 0 ? 'saldo-valor-negativo' : ''}>
                                {formatarMoeda(proximoSalario.saldo, ocultar)}
                            </strong>
                        </div>
                        <p>
                            {proximoSalario.mediaSalarial ? 'Média salarial' : 'Receitas'} de {formatarMoeda(proximoSalario.receitas, ocultar)}
                            {' '}menos {formatarMoeda(proximoSalario.despesas, ocultar)} em parcelas do mês e despesas que ficaram para o próximo salário.
                            Passa a ser o saldo disponível ao quitar o mês passado.
                        </p>
                    </div>
                )}
                <button
                    className={`saldo-quitar-botao ${confirmarQuitacao ? 'saldo-quitar-confirmar' : ''}`}
                    onClick={handleQuitar}
                    onBlur={() => !quitando && setConfirmarQuitacao(false)}
                    disabled={quitando}
                >
                    <MdTaskAlt size={20} />
                    {quitando ? 'Quitando...' : confirmarQuitacao ? 'Toque novamente para confirmar' : 'Contas do mês passado quitadas'}
                </button>
                <p>
                    Fecha {nomeMeses} e registra a parcela paga nos parcelamentos que você paga. O que sobrou não passa para este mês: fica na conta para débito.
                </p>
            </div>
        )}
    </section>
  )
}

export default Saldo
