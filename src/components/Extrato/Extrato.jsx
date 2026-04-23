import { useSelector } from 'react-redux'
import './Extrato.css'

function Extrato() {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  return (
    <div className='extrato'>
        <h1>Extrato</h1>
        <ul>
          {contas.length > 0 ?
              contas.map((conta, index) => (
                <li key={index} style={conta.tipoConta === 'Despesa' ? {color: 'red'} : {color: 'white'}}>
                  {conta.tipoConta} {conta.dataCadastro} - {conta.descricao} - R$ {conta.valor}
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