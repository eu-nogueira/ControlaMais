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
  const [parcela, setParcela] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const dispatch = useDispatch()

  function handleAdicao() {
    const data = new Date()
    const dataCadastro = new Intl.DateTimeFormat(
      'pt-BR'
    ).format(data)
    const id = crypto.randomUUID()
    const valorFormatado = +valor.replace(',', '.')
    if(valorFormatado > 0 && descricao) {
    dispatch(adicionarConta({ 
      id, 
      descricao, 
      dataCadastro, 
      valorFormatado, 
      tipoConta,
      responsavel,
      parcela,
      dataVencimento
    }))
    }
    setValor('')
    setDescricao('')
    setParcela('')
    setDataVencimento('')
    setResponsavel('')
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
          <input type="text" name="" id="" placeholder='Valor R$' value={valor} onChange={(e) => setValor(e.target.value)}/>
          {tipoConta === 'Despesa' &&
            <>
              <input type="Number" name="" id="" placeholder='Parcelas' value={parcela} onChange={(e) => setParcela(e.target.value)}/>
              <input type="date" name="" id="" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)}/>
              <input type="text" name="" id="" placeholder='Responsável' value={responsavel} onChange={(e) => setResponsavel(e.target.value)}/>
            </>
          }
          <button className='btn' disabled={!descricao || 
          !valor || 
          tipoConta === 'Despesa' && !parcela || 
          tipoConta === 'Despesa' && !responsavel}
           onClick={() => handleAdicao()}>Inserir</button>
      </div>
    </>
  )
}

export default Home