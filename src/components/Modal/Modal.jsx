import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import './Modal.css'
import { aumentaParcela } from '../../store/extrato'


function Modal({ handleModal }) {
    const contas = useSelector((state) => state.extrato.contasExtrato) || []
    const [parcelaPaga, setParcelaPaga] = useState(0)
    const [parcelaSelecionada, setParcelaSelecionada] = useState('')
    const dispatch = useDispatch()

function handleParcela(parcela, index, id) {
    const atual = parcelaPaga[index] || 0

    if (atual < parcela) {
        const novoValor = atual + 1

        setParcelaPaga(prev => ({
            ...prev,
            [index]: novoValor
        }))

        dispatch(aumentaParcela({
            id,
            parcelaPaga: novoValor
        }))
    }
}

  return (
    <div className="modalContasOverlay">
        <div className='modalContas'>
            <button className='btnCloseModal' onClick={() => handleModal(false)}>X</button>
            <table>
                <thead>
                    <tr>
                        <th>Tipo conta</th>
                        <th>Data vencimento</th>
                        <th>Data cadastro</th>
                        <th>Descrição</th>
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
                        <td>{conta.dataCadastro}</td>
                        <td>{conta.descricao}</td>
                        <td onClick={() => handleParcela(conta.parcela, index, conta.id)}>
                            {conta.tipoConta === 'Despesa' && `${conta.parcelaPaga || 0}/`}
                            {conta.parcela}
                        </td>
                        <td>{conta.responsavel}</td>
                        <td>R${conta.valorFormatado.toFixed(2).replace('.', ',')}</td>
                    </tr>
                        ))}
                </tbody>
            </table>
        </div>
    </div>
  )
}

export default Modal