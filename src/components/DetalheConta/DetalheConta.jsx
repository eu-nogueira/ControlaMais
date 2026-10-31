import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdCheck, MdDeleteOutline, MdEdit } from 'react-icons/md'
import { alterarParcelaPaga, removerConta } from '../../store/extrato'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { ehContaFixa, totalParcelasDe } from '../../utils/parcelas'
import './DetalheConta.css'

function DetalheConta({ id, ocultar, onEditar, onFechar }) {
  const conta = useSelector((state) => state.extrato.contasExtrato.find((item) => item.id === id))
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const dispatch = useDispatch()

  if (!conta) return null

  const despesa = conta.tipoConta === 'Despesa'
  const fixa = ehContaFixa(conta)
  const totalParcelas = totalParcelasDe(conta)
  const parcelasPagas = conta.parcelaPaga || 0
  const quitada = totalParcelas > 1 && parcelasPagas >= totalParcelas

  function handleParcela() {
    if (parcelasPagas < totalParcelas) {
      dispatch(alterarParcelaPaga({
        id: conta.id,
        parcelaPaga: parcelasPagas + 1
      }))
    }
  }

  function handleDelete() {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true)
      return
    }
    dispatch(removerConta(conta))
    onFechar()
  }

  const linhas = [
    { rotulo: 'Data', valor: formatarDataISO(conta.dataCadastro) },
    despesa && { rotulo: 'Vencimento', valor: formatarDataISO(conta.dataVencimento) || 'Não informado' },
    despesa && { rotulo: 'Quem paga', valor: conta.selected ? 'Eu (sai do meu saldo)' : conta.responsavel || 'Outra pessoa' },
    despesa && conta.selected && conta.anotarPara && { rotulo: 'Vou pagar para', valor: conta.anotarPara },
    despesa && (conta.cartao || !conta.selected) && { rotulo: 'Pagamento', valor: conta.cartao ? `Cartão ${conta.cartao}` : 'Pix' },
    despesa && conta.categoria && { rotulo: 'Tipo de despesa', valor: conta.categoria },
  ].filter(Boolean)

  return (
    <div className='detalhe'>
      <div className='detalhe-topo'>
        <span className={`detalhe-tipo ${despesa ? 'detalhe-tipo-despesa' : 'detalhe-tipo-receita'}`}>
          {conta.tipoConta}
        </span>
        <p className='detalhe-descricao'>{conta.descricao}</p>
        <p className={`detalhe-valor ${despesa ? 'valor-negativo' : 'valor-positivo'}`}>
          {formatarMoeda(conta.valorFormatado, ocultar)}
        </p>
      </div>

      {despesa && totalParcelas > 1 && (
        <div className='detalhe-parcelas'>
          <div className='detalhe-parcelas-texto'>
            <span>{fixa ? 'Conta fixa · meses pagos' : 'Parcelas pagas'}</span>
            <strong>{fixa ? parcelasPagas : `${parcelasPagas} de ${totalParcelas}`}</strong>
          </div>
          {!fixa && (
            <div className='detalhe-parcelas-barra'>
              <span style={{ width: `${Math.min((parcelasPagas / totalParcelas) * 100, 100)}%` }} />
            </div>
          )}
          <button className='botao botao-secundario' onClick={handleParcela} disabled={quitada}>
            <MdCheck size={18} />
            {quitada ? 'Todas as parcelas pagas' : fixa ? 'Registrar mês pago' : 'Registrar parcela paga'}
          </button>
        </div>
      )}

      <dl className='detalhe-lista'>
        {linhas.map((linha) => (
          <div key={linha.rotulo} className='detalhe-linha'>
            <dt>{linha.rotulo}</dt>
            <dd>{linha.valor}</dd>
          </div>
        ))}
      </dl>

      {/* Parcelados e contas fixas são editados pela aba Parcelas. */}
      {!(despesa && totalParcelas > 1) && (
        <button className='botao botao-secundario' onClick={() => onEditar(conta)}>
          <MdEdit size={18} />
          Editar movimentação
        </button>
      )}

      <button className={`botao botao-perigo ${confirmarExclusao ? 'botao-perigo-confirmar' : ''}`} onClick={handleDelete}>
        <MdDeleteOutline size={18} />
        {confirmarExclusao ? 'Toque novamente para confirmar' : 'Excluir movimentação'}
      </button>
    </div>
  )
}

export default DetalheConta
