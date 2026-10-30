import { MdAdd, MdCreditCard, MdHome, MdPeopleAlt, MdReceiptLong } from 'react-icons/md'
import './Navegacao.css'

const ABAS = [
  { valor: 'inicio', rotulo: 'Início', icone: <MdHome size={24} /> },
  { valor: 'extrato', rotulo: 'Extrato', icone: <MdReceiptLong size={24} /> },
  { valor: 'parcelas', rotulo: 'Parcelas', icone: <MdCreditCard size={24} /> },
  { valor: 'valores', rotulo: 'Valores', icone: <MdPeopleAlt size={24} /> },
]

function Navegacao({ aba, onAlterarAba, onNovaConta }) {
  return (
    <>
      <nav className='navegacao' aria-label='Navegação principal'>
        <div className='navegacao-marca'>
          <span className='navegacao-logo' aria-hidden='true'>C+</span>
          <strong>Controla+</strong>
        </div>

        <button className='botao botao-primario navegacao-nova' onClick={() => onNovaConta('Receita')}>
          <MdAdd size={20} />
          Nova movimentação
        </button>

        {ABAS.map(({ valor, rotulo, icone }) => (
          <button
            key={valor}
            className={`navegacao-item ${aba === valor ? 'navegacao-item-ativo' : ''}`}
            aria-current={aba === valor ? 'page' : undefined}
            onClick={() => onAlterarAba(valor)}
          >
            {icone}
            <span>{rotulo}</span>
          </button>
        ))}
      </nav>

      <button className='navegacao-fab' onClick={() => onNovaConta('Receita')} aria-label='Nova movimentação'>
        <MdAdd size={28} />
      </button>
    </>
  )
}

export default Navegacao
