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
  const [usaDataCadastro, setUsaDataCadastro] = useState(false)
  const [cadastroData, setCadastroData] = useState('')
  const [selected, setSelected] = useState(false)
  const dispatch = useDispatch()

  function handleAdicao() {
    let dataCadastro;

    if(usaDataCadastro) {
      const data = new Date(cadastroData)
       dataCadastro = new Intl.DateTimeFormat(
      'pt-BR'
    ).format(data)

    } else {

    const data = new Date()
       dataCadastro = new Intl.DateTimeFormat(
      'pt-BR'
    ).format(data)
    }
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
      dataVencimento,
      selected
    }))
    }
    setValor('')
    setDescricao('')
    setParcela('')
    setDataVencimento('')
    setResponsavel('')
    setCadastroData('')
    setUsaDataCadastro(false)
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
          <input type="text" className='infosAdicionais' placeholder='Descrição' value={descricao} onChange={(e) => setDescricao(e.target.value)}/>
          <input type="text" className='infosAdicionais' placeholder='Valor R$' value={valor} onChange={(e) => setValor(e.target.value)}/>
          {tipoConta === 'Despesa' &&
            <>
              <input type="Number" className='infosAdicionais' placeholder='Parcelas' value={parcela} onChange={(e) => setParcela(e.target.value)}/>
              <label> Data de vencimento</label>
              <input type="date" className='infosAdicionais' value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)}/>
              {usaDataCadastro ?
              <>
                <label>Data de cadastro:</label>
                <input type="date" className='infosAdicionais' value={cadastroData} onChange={(e) => setCadastroData(e.target.value)}/> 
              </>
              :
              <>
                <label>Deseja alterar a data de cadastro?</label>
                <input type="checkbox" checked={usaDataCadastro} onClick={() => setUsaDataCadastro(true)}/>
              </>
              }
              <input type="text" className='infosAdicionais' placeholder='Responsável' value={responsavel} onChange={(e) => setResponsavel(e.target.value)}/>
              <label>Deseja adicionar este valor nas suas despesas?</label>
              <input type="checkbox" className='selecione' value={selected} onClick={() => setSelected(!selected)}/>
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