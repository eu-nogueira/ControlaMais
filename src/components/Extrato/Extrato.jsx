import { useDispatch, useSelector } from 'react-redux'
import './Extrato.css'
import { removerConta } from '../../store/extrato'

function Extrato() {
  const contas = useSelector((state) => state.extrato.contasExtrato) || []
  const dispatch = useDispatch()

  function handleDelete(conta) {
    dispatch(removerConta(conta))
  }

  return (
    <div className='extrato'>
        <h1>Extrato</h1>
        <ul>
          {contas?.length > 0 ?
              contas.map((conta, index) => (
                <li key={index} style={conta.tipoConta === 'Despesa' ? {color: '#ef4444'} : {color: 'white'}}>
                  {conta.tipoConta} {conta.dataCadastro} - {conta.descricao} - R$ {conta.valorFormatado.toFixed(2).replace('.', ',')}
                  <button className='btn-delete' onClick={() => handleDelete(conta)}>Excluir</button>
                </li>
              ))
            : 
              <h3>Ainda não há registros aqui.</h3>
          }
        </ul>
    </div>
  )
}

export default Extrato