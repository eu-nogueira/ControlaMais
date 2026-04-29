import { useSelector } from 'react-redux'
import './Saldo.css'

function Saldo() {
    const saldo = useSelector((state) => state.extrato.saldoTotal)
    const receitaMes = useSelector((state) => state.extrato.saldoTotal - state.extrato.despesaMes)
    const despesaMes = useSelector((state) => state.extrato.despesaMes)
    console.log('aqui', saldo)
  return (
    <div className='saldo'>
        <div className="saldoTotal">
            <h1>Saldo total</h1>
            <h2 className={ saldo >= 0 ? 'saldoAtual' : 'saldoAtualNegativo'}>R$ {saldo.toFixed(2) || 0}</h2>
        </div>
        <div className="receitasDespesas">
            <div className="receitas">
                <h3>Receitas(mês)</h3>
                <h3 className='saldoAtual'>R$ {receitaMes.toFixed(2) || 0}</h3>
                <h3 className='saldoAtual'>+ 0%</h3>
            </div>
            <div className="despesas">
                <h3>Despesas(mês)</h3>
                <h3 className='saldoAtualNegativo'>R$ {despesaMes.toFixed(2) || 0}</h3>
                <h3 className='saldoAtualNegativo'>- 0%</h3>
            </div>
        </div>
    </div>
  )
}

export default Saldo