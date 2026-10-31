import { MdAdd, MdCalculate, MdCreditCard, MdHome, MdPayment, MdPeopleAlt, MdPieChart, MdReceiptLong } from 'react-icons/md'
import './Navegacao.css'

const ABAS = [
  { valor: 'inicio', rotulo: 'Início', icone: <MdHome size={24} /> },
  { valor: 'extrato', rotulo: 'Extrato', icone: <MdReceiptLong size={24} /> },
  { valor: 'parcelas', rotulo: 'Parcelas', icone: <MdCreditCard size={24} /> },
  { valor: 'cartoes', rotulo: 'Cartões', icone: <MdPayment size={24} /> },
  { valor: 'dashboard', rotulo: 'Dashboard', icone: <MdPieChart size={24} /> },
  // No celular, Valores e Simulação ficam fora da barra (acessíveis pelas ações rápidas da tela Início).
  { valor: 'valores', rotulo: 'Valores', icone: <MdPeopleAlt size={24} />, soDesktop: true },
  { valor: 'simulacao', rotulo: 'Simulação', icone: <MdCalculate size={24} />, soDesktop: true },
]

function Navegacao({ aba, onAlterarAba, onNovaConta, onAbrirConta }) {
  return (
    <>
      <nav className='navegacao' aria-label='Navegação principal'>
        <button className='navegacao-marca' onClick={onAbrirConta} title='Minha conta'>
          <span className='navegacao-logo' aria-hidden='true'>C+</span>
          <strong>Controla+</strong>
        </button>

        <button className='botao botao-primario navegacao-nova' onClick={() => onNovaConta('Receita')}>
          <MdAdd size={20} />
          Nova movimentação
        </button>

        {ABAS.map(({ valor, rotulo, icone, soDesktop }) => (
          <button
            key={valor}
            className={`navegacao-item ${soDesktop ? 'navegacao-item-desktop' : ''} ${aba === valor ? 'navegacao-item-ativo' : ''}`}
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
