import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdArrowDownward, MdArrowUpward, MdTaskAlt } from 'react-icons/md'
import { quitarMesesAnteriores } from '../../store/extrato'
import { formatarMoeda } from '../../utils/formatar'
import { formatarMes } from '../../utils/mes'
import { calcularPeriodo, mesesParaFechar, simularFechamento } from '../../utils/saldo'
import useMesAtual from '../../hooks/useMesAtual'
import './Saldo.css'

function Saldo({ ocultar }) {
    const contas = useSelector((state) => state.extrato.contasExtrato)
    const fechamento = useSelector((state) => state.extrato.fechamento)
    const [confirmarQuitacao, setConfirmarQuitacao] = useState(false)
    const [quitando, setQuitando] = useState(false)
    const mesAtual = useMesAtual()
    const dispatch = useDispatch()

    const { saldoInicial, receitas: receitaMes, despesas: despesaMes, saldo } = calcularPeriodo(contas, fechamento)
    const porcentagemComprometimento = receitaMes > 0 ? (despesaMes / receitaMes) * 100 : 0
    const larguraBarra = Math.min(porcentagemComprometimento, 100)

    const mesesAbertos = mesesParaFechar(contas, fechamento, mesAtual)
    const sobra = mesesAbertos.length > 0
        ? simularFechamento(contas, fechamento, mesesAbertos).fechamentos.at(-1).saldo
        : 0
    const nomeMeses = mesesAbertos.map((mes) => formatarMes(mes).replace(/ de \d{4}$/, '').toLowerCase()).join(', ')

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
        <p className='saldo-rotulo'>Saldo disponível</p>
        <p className={`saldo-valor ${saldo < 0 ? 'saldo-valor-negativo' : ''}`}>
            {formatarMoeda(saldo, ocultar)}
        </p>
        {saldoInicial !== 0 && (
            <p className='saldo-sobra'>Inclui {formatarMoeda(saldoInicial, ocultar)} que sobraram de {formatarMes(fechamento.mes).toLowerCase()}</p>
        )}

        <div className='saldo-mes'>
            <div className='saldo-mes-item'>
                <span className='saldo-mes-icone saldo-mes-icone-receita'><MdArrowDownward /></span>
                <div>
                    <p className='saldo-mes-rotulo'>Receitas do mês</p>
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
                    Fecha {nomeMeses}: leva {formatarMoeda(sobra, ocultar)} de sobra para este mês e registra a parcela paga nos parcelamentos que você paga.
                </p>
            </div>
        )}
    </section>
  )
}

export default Saldo
