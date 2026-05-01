import './Home.css'
import Saldo from '../components/Saldo/Saldo'
import Extrato from '../components/Extrato/Extrato'
import { useDispatch } from 'react-redux'
import { useState } from 'react'
import { adicionarConta } from '../store/extrato'

function Home() {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoConta, setTipoConta] = useState('Receita')
  const dispatch = useDispatch()

  function handleAdicao() {
    const data = new Date()
    const dataCadastro = new Intl.DateTimeFormat(
      'pt-BR'
    ).format(data)
    if(valor > 0 && descricao) {
    dispatch(adicionarConta({ descricao, dataCadastro, valor, tipoConta }))
    }
    setValor('')
    setDescricao('')
  }

  return (
    <>
      <div className='pageHome'>
        < Saldo />
        < Extrato />
      </div>
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