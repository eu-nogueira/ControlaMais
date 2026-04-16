import './Home.css'
import Saldo from '../components/Saldo/Saldo'
import Extrato from '../components/Extrato/Extrato'

function Home() {
  return (
    <>
    < Saldo />
    < Extrato />
      <div className="insert">
        <select name="selecaoDespesaReceita" className='selecaoDespesaReceita'>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <p className='info' title='Escolha se deseja cadastrar uma receita ou uma despesa'>i</p>
        <input type="text" name="" id="" placeholder='Descrição'/>
        <button className='btn'>Inserir</button>
      </div>
    </>
  )
}

export default Home