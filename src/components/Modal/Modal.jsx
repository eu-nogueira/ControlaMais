import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import './Modal.css'


function Modal({ handleModal }) {
    const contas = useSelector((state) => state.extrato.contasExtrato) || []
    const [parcelaPaga, setParcelaPaga] = useState(0)
    const [parcelaSelecionada, setParcelaSelecionada] = useState('')

   function handleParcela(parcela, index) {
    setParcelaPaga(prev => {
        const atual = prev[index] || 0
        if (atual < parcela) {
            return {
                ...prev,
                [index]: atual + 1
            }
        }
        return prev
    })
}

  return (
    <div className='modalContas'>
        <button className='btnCloseModal' onClick={() => handleModal(false)}>X</button>
        <table>
            <thead>
                <tr>
                    <th>Tipo conta</th>
                    <th>Data vencimento</th>
                    <th>Parcelas</th>
                    <th>Responsável</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                {contas.map((conta, index) => (
                    <tr key={index} className={conta.tipoConta === 'Despesa' ? 'despesa' : 'receita'}>
                    <td>{conta.tipoConta}</td>
                    <td>{conta.dataVencimento}</td>
                    <td onClick={() => handleParcela(conta.parcela, index)}>
                        {conta.tipoConta === 'Despesa' && `${parcelaPaga[index] || 0}/`}
                        {conta.parcela}
                    </td>
                    <td>{conta.responsavel}</td>
                    <td>R${conta.valorFormatado.toFixed(2).replace('.', ',')}</td>
                </tr>
                    ))}
            </tbody>
        </table>
    </div>
  )
}

export default Modal