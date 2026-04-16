import './Home.css'
import Saldo from '../components/Saldo/Saldo'
import Extrato from '../components/Extrato/Extrato'
import { useDispatch } from 'react-redux'
import { useState } from 'react'
import { adicionarConta } from '../store/extrato'

function Home() {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoConta, setTipoConta] = useState('')
  const dispatch = useDispatch()

  function handleAdicao() {
    const data = new Date()
    const dataCadastro = `${data.getDate()}/${data.getMonth() +1}/${data.getFullYear()} ${data.getHours()}:${data.getMinutes()}`
    dispatch(adicionarConta({ descricao, dataCadastro, valor, tipoConta }))
  }

  return (
    <>
    < Saldo />
    < Extrato />
      <div className="insert">
        <select name="selecaoDespesaReceita" className='selecaoDespesaReceita' onChange={(e) => setTipoConta(e.target.value)}>
          <option value="Receita" selected>Receita</option>
          <option value="Despesa">Despesa</option>
        </select>
        <p className='info' title='Escolha se deseja cadastrar uma receita ou uma despesa'>i</p>
        <input type="text" name="" id="" placeholder='Descrição' value={descricao} onChange={(e) => setDescricao(e.target.value)}/>
        <input type="text" name="" id="" placeholder='Valor' value={valor} onChange={(e) => setValor(e.target.value)}/>
        <button className='btn' onClick={() => handleAdicao()}>Inserir</button>
      </div>
    </>
  )
}

export default Home