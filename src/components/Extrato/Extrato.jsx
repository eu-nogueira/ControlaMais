import { useDispatch, useSelector } from 'react-redux'
import './Extrato.css'
import { MdDelete } from 'react-icons/md'
import { CiCircleMore } from "react-icons/ci";
import { removerConta } from '../../store/extrato'
import { useState } from 'react';
import Modal from '../Modal/Modal';

function Extrato() {
  const contas = useSelector((state) => state.extrato.contasExtrato) || []
  const [modal, setModal] = useState(false)
  const dispatch = useDispatch()

  function handleDelete(conta) {
    dispatch(removerConta(conta))
  }

  function verMais() {
    setModal(!modal)
  }

  return (
    <>
    { modal && < Modal handleModal={setModal} />}

    <div className='extrato'>
        <h1>Extrato</h1>
          {contas?.length > 0 ? (
          <table>
              <thead>
                <tr>
                  <th>Data cadastro</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th onClick={() => verMais()} style={{cursor: 'pointer'}}><CiCircleMore size={20} /></th>
                </tr>
              </thead>
              <tbody>
              {contas.map((conta, index) => (
                      <tr key={index} className={conta.tipoConta === 'Despesa' ? 'despesa' : 'receita'}>
                        <td>{conta.dataCadastro}</td>
                        <td>{conta.descricao}</td>
                        <td>R${conta.valorFormatado.toFixed(2).replace('.', ',')}</td>
                        <td><button className='btn-delete' onClick={() => handleDelete(conta)}>< MdDelete/></button></td>
                      </tr>
              ))}
                </tbody>
                </table>
            )  : (
              <table>
                <tbody>
                  <tr colSpan = "5">
                    <td><h3>Ainda não há registros aqui.</h3></td>
                  </tr>
                </tbody>
              </table>
            )}
    </div>
  </>
  )
}

export default Extrato