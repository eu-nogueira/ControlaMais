import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdCreditCard, MdDeleteOutline, MdEdit, MdPix, MdRemove } from 'react-icons/md'
import { alterarParcelaPaga, removerConta } from '../../store/extrato'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { ehContaFixa, ehParcelado, estaQuitado, parcelasRestantes } from '../../utils/parcelas'
import Modal from '../Modal/Modal'
import FormConta from '../FormConta/FormConta'
import './Parcelamentos.css'

function ItemParcelamento({ conta, ocultar, onEditar }) {
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const dispatch = useDispatch()

  const fixa = ehContaFixa(conta)
  const totalParcelas = Number(conta.parcela)
  const parcelasPagas = conta.parcelaPaga || 0
  const valorParcela = conta.valorFormatado
  const valorTotal = valorParcela * totalParcelas
  const quitado = estaQuitado(conta)
  const progresso = fixa ? 0 : Math.min((parcelasPagas / totalParcelas) * 100, 100)

  async function alterarParcela(quantidade) {
    setSalvando(true)
    await dispatch(alterarParcelaPaga({
      id: conta.id,
      parcelaPaga: parcelasPagas + quantidade
    }))
    setSalvando(false)
  }

  function handleDelete() {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true)
      return
    }
    dispatch(removerConta(conta))
  }

  const detalhes = [
    fixa ? 'Conta fixa' : `${totalParcelas}x de ${formatarMoeda(valorParcela, ocultar)}`,
    !quitado && conta.dataVencimento && `vence ${formatarDataISO(conta.dataVencimento)}`,
    !conta.selected && (conta.responsavel ? `${conta.responsavel} paga` : 'outra pessoa paga'),
    conta.selected && conta.anotarPara && `para ${conta.anotarPara}`,
  ].filter(Boolean)

  return (
    <li className={`parcelamento ${quitado ? 'parcelamento-quitado' : ''}`}>
      <div className='parcelamento-topo'>
        <div className='parcelamento-info'>
          <strong>{conta.descricao}</strong>
          <span>{detalhes.join(' · ')}</span>
          {(conta.cartao || !conta.selected) && (
            <span className='parcelamento-cartao'>
              {conta.cartao ? <MdCreditCard size={14} aria-hidden='true' /> : <MdPix size={14} aria-hidden='true' />}
              {conta.cartao ? `Cartão: ${conta.cartao}` : 'Pix'}
            </span>
          )}
        </div>
        {/* Conta fixa não tem total: mostra só o valor mensal. */}
        <span className='parcelamento-total'>
          {fixa ? <>{formatarMoeda(valorParcela, ocultar)}<small>/mês</small></> : formatarMoeda(valorTotal, ocultar)}
        </span>
      </div>

      {fixa ? (
        <div className='parcelamento-progresso-texto'>
          <span>Meses pagos</span>
          <strong>{parcelasPagas}</strong>
        </div>
      ) : (
        <div className='parcelamento-progresso'>
          <div className='parcelamento-progresso-texto'>
            <span>{quitado ? 'Quitado' : 'Parcelas pagas'}</span>
            <strong>{parcelasPagas} de {totalParcelas}</strong>
          </div>
          <div
            className='parcelamento-barra'
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={totalParcelas}
            aria-valuenow={parcelasPagas}
            aria-label={`Parcelas pagas de ${conta.descricao}`}
          >
            <span style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      <div className='parcelamento-acoes'>
        <div className='parcelamento-contador' role='group' aria-label={`Parcelas pagas de ${conta.descricao}`}>
          <button onClick={() => alterarParcela(-1)} disabled={salvando || parcelasPagas <= 0} aria-label='Desfazer uma parcela paga'>
            <MdRemove size={20} />
          </button>
          <button onClick={() => alterarParcela(1)} disabled={salvando || quitado} aria-label='Registrar uma parcela paga'>
            <MdAdd size={20} />
          </button>
        </div>

        <div className='parcelamento-botoes'>
          <button className='parcelamento-editar' onClick={() => onEditar(conta)}>
            <MdEdit size={18} />
            Editar
          </button>
          <button
            className={`parcelamento-excluir ${confirmarExclusao ? 'parcelamento-excluir-confirmar' : ''}`}
            onClick={handleDelete}
            onBlur={() => setConfirmarExclusao(false)}
          >
            <MdDeleteOutline size={18} />
            {confirmarExclusao ? 'Confirmar exclusão' : 'Excluir'}
          </button>
        </div>
      </div>
    </li>
  )
}

const FILTROS = [
  { valor: 'pagar', rotulo: 'Eu pago', resumo: 'Falta pagar(total)', rotuloParcelas: 'Parcelas a pagar(mês)', classeValor: 'valor-negativo', vazio: 'Você não tem parcelamentos a pagar.' },
  { valor: 'receber', rotulo: 'Me devem', resumo: 'Falta receber', rotuloParcelas: 'Parcelas a receber', classeValor: 'valor-positivo', vazio: 'Ninguém tem parcelamentos a te pagar.' },
]

function Parcelamentos({ ocultar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const [filtro, setFiltro] = useState(FILTROS[0])
  const [contaEditada, setContaEditada] = useState(null)

  const fecharEdicao = useCallback(() => setContaEditada(null), [])

  const parcelamentos = contas
    .filter(ehParcelado)
    .filter((conta) => (filtro.valor === 'pagar' ? conta.selected : !conta.selected))
    .sort((a, b) => estaQuitado(a) - estaQuitado(b))

  const emAndamento = parcelamentos.filter((conta) => !estaQuitado(conta))
  // "Falta pagar" não inclui contas fixas: elas não têm fim e distorceriam o total.
  const totalRestante = emAndamento
    .filter((conta) => !ehContaFixa(conta))
    .reduce((total, conta) => total + conta.valorFormatado * parcelasRestantes(conta), 0)
  // Soma de uma parcela de cada item em andamento, incluindo contas fixas.
  const totalParcelas = emAndamento.reduce((total, conta) => total + conta.valorFormatado, 0)

  return (
    <div className='parcelamentos'>
      <div className='parcelamentos-filtros' role='tablist' aria-label='Filtrar parcelamentos'>
        {FILTROS.map((item) => (
          <button
            key={item.valor}
            role='tab'
            aria-selected={filtro.valor === item.valor}
            className={`parcelamentos-filtro ${filtro.valor === item.valor ? 'parcelamentos-filtro-ativo' : ''}`}
            onClick={() => setFiltro(item)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {parcelamentos.length === 0 ? (
        <div className='parcelamentos-vazio'>
          <MdCreditCard size={40} />
          <p>{filtro.vazio}</p>
          <span>Despesas com mais de uma parcela e contas fixas aparecerão nesta aba.</span>
        </div>
      ) : (
        <>
          <div className='parcelamentos-resumo'>
            <div>
              <span>{filtro.resumo}</span>
              <strong className={filtro.classeValor}>{formatarMoeda(totalRestante, ocultar)}</strong>
            </div>
            <div>
              <span>{filtro.rotuloParcelas}</span>
              <strong>{formatarMoeda(totalParcelas, ocultar)}</strong>
            </div>
            <div>
              <span>Em andamento</span>
              <strong>{emAndamento.length}</strong>
            </div>
          </div>

          <ul className='parcelamentos-lista'>
            {parcelamentos.map((conta) => (
              <ItemParcelamento key={conta.id} conta={conta} ocultar={ocultar} onEditar={setContaEditada} />
            ))}
          </ul>
        </>
      )}

      {contaEditada && (
        <Modal titulo='Editar parcelamento' onFechar={fecharEdicao}>
          <FormConta conta={contaEditada} onConcluir={fecharEdicao} />
        </Modal>
      )}
    </div>
  )
}

export default Parcelamentos
