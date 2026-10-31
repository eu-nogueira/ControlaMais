import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdDeleteOutline, MdEdit, MdPayment } from 'react-icons/md'
import Modal from '../Modal/Modal'
import FormCartao from '../FormCartao/FormCartao'
import { removerCartao } from '../../store/cartoes'
import { CORES_CARTAO, calcularUsoCartoes, cartoesSemCadastro } from '../../utils/cartoes'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { ehContaFixa } from '../../utils/parcelas'
import './Cartoes.css'

function detalheCompra(conta, ocultar) {
  const parcelas = Number(conta.parcela) || 1

  return [
    ehContaFixa(conta) ? 'Conta fixa · ocupa uma cobrança mensal' : parcelas > 1 ? `${parcelas}x de ${formatarMoeda(conta.valorFormatado, ocultar)}` : `À vista em ${formatarDataISO(conta.dataCadastro)}`,
    !conta.selected && `${conta.responsavel || 'outra pessoa'} paga`,
  ].filter(Boolean).join(' · ')
}

function ProgressoParcelas({ conta }) {
  const parcelas = Number(conta.parcela)
  const pagas = conta.parcelaPaga || 0
  const restantes = parcelas - pagas

  return (
    <div className='cartao-compra-progresso'>
      <div className='cartao-compra-progresso-texto'>
        <span>Parcelas pagas <strong>{pagas} de {parcelas}</strong></span>
        <span>Faltam <strong>{restantes}</strong></span>
      </div>
      <div
        className='cartao-barra cartao-barra-fina'
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={parcelas}
        aria-valuenow={pagas}
        aria-label={`Parcelas pagas de ${conta.descricao}`}
      >
        <span style={{ width: `${(pagas / parcelas) * 100}%` }} />
      </div>
    </div>
  )
}

function ItemCartao({ cartao, ocultar, onEditar }) {
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const dispatch = useDispatch()

  const estourado = cartao.disponivel < 0
  const percentual = cartao.limite > 0
    ? Math.min((cartao.usado / cartao.limite) * 100, 100)
    : cartao.usado > 0 ? 100 : 0

  function handleDelete() {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true)
      return
    }
    dispatch(removerCartao(cartao.id))
  }

  return (
    <li className='cartao'>
      <div className='cartao-face' style={{ '--cor-cartao': cartao.cor || CORES_CARTAO[0].valor }}>
        <div className='cartao-face-topo'>
          <strong>{cartao.nome}</strong>
          <MdPayment size={24} aria-hidden='true' />
        </div>
        <div className='cartao-face-rodape'>
          <span>{cartao.final ? `•••• ${cartao.final}` : ''}</span>
          {cartao.diaVencimento && <span>Vence dia {cartao.diaVencimento}</span>}
        </div>
      </div>

      <div className='cartao-limite'>
        <div className='cartao-limite-valores'>
          <div>
            <span>Usado</span>
            <strong>{formatarMoeda(cartao.usado, ocultar)}</strong>
          </div>
          <div>
            <span>Disponível</span>
            <strong className={estourado ? 'valor-negativo' : 'valor-positivo'}>{formatarMoeda(cartao.disponivel, ocultar)}</strong>
          </div>
        </div>
        <div
          className={`cartao-barra ${estourado ? 'cartao-barra-estourada' : ''}`}
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentual)}
          aria-label={`Limite usado do cartão ${cartao.nome}`}
        >
          <span style={{ width: `${percentual}%` }} />
        </div>
        <small>
          Limite total de {formatarMoeda(cartao.limite, ocultar)}
          {estourado && ' · limite ultrapassado'}
        </small>
      </div>

      {cartao.compras.length > 0 && (
        <details className='cartao-compras'>
          <summary>
            {cartao.compras.length} {cartao.compras.length === 1 ? 'compra usando' : 'compras usando'} o limite
          </summary>
          <ul>
            {cartao.compras.map(({ conta, emAberto }) => (
              <li key={conta.id}>
                <div className='cartao-compra-topo'>
                  <div>
                    <strong>{conta.descricao}</strong>
                    <span>{detalheCompra(conta, ocultar)}</span>
                  </div>
                  <span className='cartao-compra-valor'>{formatarMoeda(emAberto, ocultar)}</span>
                </div>
                {Number(conta.parcela) > 1 && <ProgressoParcelas conta={conta} />}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className='cartao-acoes'>
        <button className='cartao-acao' onClick={() => onEditar(cartao)}>
          <MdEdit size={18} />
          Editar
        </button>
        <button
          className={`cartao-acao cartao-excluir ${confirmarExclusao ? 'cartao-excluir-confirmar' : ''}`}
          onClick={handleDelete}
          onBlur={() => setConfirmarExclusao(false)}
        >
          <MdDeleteOutline size={18} />
          {confirmarExclusao ? 'Confirmar exclusão' : 'Excluir'}
        </button>
      </div>
    </li>
  )
}

function Cartoes({ ocultar }) {
  const lista = useSelector((state) => state.cartoes.lista)
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const [formulario, setFormulario] = useState(null)

  const fecharFormulario = useCallback(() => setFormulario(null), [])

  const cartoes = calcularUsoCartoes(lista, contas, fechamento)
  const semCadastro = cartoesSemCadastro(lista, contas, fechamento)
  const limiteTotal = cartoes.reduce((total, cartao) => total + cartao.limite, 0)
  const disponivelTotal = cartoes.reduce((total, cartao) => total + cartao.disponivel, 0)

  return (
    <div className='cartoes'>
      {cartoes.length > 0 && (
        <div className='cartoes-resumo'>
          <div>
            <span>Disponível</span>
            <strong className={disponivelTotal < 0 ? 'valor-negativo' : 'valor-positivo'}>{formatarMoeda(disponivelTotal, ocultar)}</strong>
          </div>
          <div>
            <span>Limite total</span>
            <strong>{formatarMoeda(limiteTotal, ocultar)}</strong>
          </div>
        </div>
      )}

      <button className='botao botao-secundario' onClick={() => setFormulario({})}>
        <MdAdd size={20} />
        Novo cartão
      </button>

      {semCadastro.length > 0 && (
        <div className='cartoes-sem-cadastro'>
          <p>Há gastos em cartões que não estão cadastrados, por isso o limite deles não é controlado:</p>
          <div>
            {semCadastro.map((nome) => (
              <button key={nome} onClick={() => setFormulario({ nomeInicial: nome })}>
                <MdAdd size={16} />
                Cadastrar {nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {cartoes.length === 0 ? (
        <div className='cartoes-vazio'>
          <MdPayment size={40} />
          <p>Você ainda não cadastrou cartões.</p>
          <span>Cadastre seus cartões de crédito para acompanhar o limite usado pelos gastos marcados como &quot;É cartão?&quot;.</span>
        </div>
      ) : (
        <ul className='cartoes-lista'>
          {cartoes.map((cartao) => (
            <ItemCartao key={cartao.id} cartao={cartao} ocultar={ocultar} onEditar={(item) => setFormulario({ cartao: item })} />
          ))}
        </ul>
      )}

      {formulario && (
        <Modal titulo={formulario.cartao ? 'Editar cartão' : 'Novo cartão'} onFechar={fecharFormulario}>
          <FormCartao cartao={formulario.cartao} nomeInicial={formulario.nomeInicial} onConcluir={fecharFormulario} />
        </Modal>
      )}
    </div>
  )
}

export default Cartoes
