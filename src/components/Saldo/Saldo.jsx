import { useSelector } from 'react-redux'
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md'
import { formatarMoeda } from '../../utils/formatar'
import './Saldo.css'

function Saldo({ ocultar }) {
    const saldo = useSelector((state) => state.extrato.saldoTotal) || 0
    const receitaMes = useSelector((state) => state.extrato.saldoTotal - state.extrato.despesaMes) || 0
    const despesaMes = Math.abs(useSelector((state) => state.extrato.despesaMes) || 0)
    const porcentagemComprometimento = receitaMes > 0 ? (despesaMes / receitaMes) * 100 : 0
    const larguraBarra = Math.min(porcentagemComprometimento, 100)

  return (
    <section className='saldo' aria-label='Resumo do saldo'>
        <p className='saldo-rotulo'>Saldo disponível</p>
        <p className={`saldo-valor ${saldo < 0 ? 'saldo-valor-negativo' : ''}`}>
            {formatarMoeda(saldo, ocultar)}
        </p>

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
                    className={larguraBarra >= 80 ? 'saldo-barra-alerta' : ''}
                    style={{ width: `${ocultar ? 0 : larguraBarra}%` }}
                />
            </div>
        </div>
    </section>
  )
}

export default Saldo
