import './Saldo.css'

function Saldo() {
  return (
    <div className='saldo'>
        <div className="saldoTotal">
            <h1>Saldo total</h1>
            <h2 className='saldoAtual'>R$ 0,00</h2>
        </div>
        <div className="receitasDespesas">
            <div className="receitas">
                <h3>Receitas(mês)</h3>
                <h3 className='saldoAtual'>R$ 0,00</h3>
                <h3 className='saldoAtual'>+ 0%</h3>
            </div>
            <div className="despesas">
                <h3>Despesas(mês)</h3>
                <h3 className='saldoAtualNegativo'>R$ 0,00</h3>
                <h3 className='saldoAtualNegativo'>- 0%</h3>
            </div>
        </div>
    </div>
  )
}

export default Saldo