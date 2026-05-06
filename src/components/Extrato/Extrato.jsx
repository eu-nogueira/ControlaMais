import { useDispatch, useSelector } from 'react-redux'
import './Extrato.css'
import { MdDelete } from 'react-icons/md'
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
          <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
          {contas?.length > 0 ?
              contas.map((conta, index) => (
                      <tr key={index} className={conta.tipoConta === 'Despesa' ? 'despesa' : 'receita'}>
                        <td>{conta.tipoConta}</td>
                        <td>{conta.dataCadastro}</td>
                        <td>{conta.descricao}</td>
                        <td>R${conta.valorFormatado.toFixed(2).replace('.', ',')}</td>
                        <td><button className='btn-delete' onClick={() => handleDelete(conta)}>< MdDelete/></button></td>
                      </tr>
              ))
              : 
              <tr colSpan = "5">
                <td><h3>Ainda não há registros aqui.</h3></td>
              </tr>
            }
            </tbody>
          </table>
    </div>
  )
}

export default Extrato