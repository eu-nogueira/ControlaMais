import { useSelector } from 'react-redux'
import './Saldo.css'

function Saldo() {
    const saldo = useSelector((state) => state.extrato.saldoTotal) || 0
    const receitaMes = useSelector((state) => state.extrato.saldoTotal - state.extrato.despesaMes) || 0
    const despesaMes = useSelector((state) => state.extrato.despesaMes) || 0
    const porcentagemComprometimento = useSelector((state) => (despesaMes / receitaMes) * 100) || 0
    const porcentagemRestante = ((receitaMes + despesaMes) / receitaMes) * 100 || 0
  return (
    <div className='saldo'>
        <div className="saldoTotal">
            <h1>Saldo total</h1>
            <h2 className={ saldo >= 0 ? 'saldoAtual' : 'saldoAtualNegativo'}>R$ {saldo?.toFixed(2).replace('.', ',')}</h2>
        </div>
        <div className="receitasDespesas">
            <div className="receitas">
                <h3>Receitas(mês)</h3>
                <h3 className='saldoAtual'>R$ {receitaMes?.toFixed(2).replace('.', ',')}</h3>
                <h3 className='saldoAtual'> {porcentagemRestante?.toFixed(2).replace('.', ',')}%</h3>
            </div>
            <div className="despesas">
                <h3>Despesas(mês)</h3>
                <h3 className='saldoAtualNegativo'>R$ {despesaMes?.toFixed(2).replace('.', ',')}</h3>
                <h3 className='saldoAtualNegativo'>{porcentagemComprometimento?.toFixed(2).replace('.', ',')}%</h3>
            </div>
        </div>
    </div>
  )
}

export default Saldo