import { useEffect, useState } from 'react'
import { MdAdd, MdAutoAwesome, MdCalculate, MdClose, MdEditNote, MdCreditCard, MdHome, MdPayment, MdPeopleAlt, MdPieChart, MdReceiptLong, MdSavings } from 'react-icons/md'
import './Navegacao.css'

const ABAS = [
  { valor: 'inicio', rotulo: 'Início', icone: <MdHome size={24} /> },
  { valor: 'extrato', rotulo: 'Extrato', icone: <MdReceiptLong size={24} /> },
  { valor: 'parcelas', rotulo: 'Parcelas', icone: <MdCreditCard size={24} /> },
  { valor: 'valores', rotulo: 'Acertos', icone: <MdPeopleAlt size={24} /> },
  { valor: 'dashboard', rotulo: 'Dashboards', icone: <MdPieChart size={24} /> },
  // No celular, Metas, Cartões e Simulação ficam fora da barra (acessíveis pelas ações rápidas da tela Início).
  { valor: 'metas', rotulo: 'Metas', icone: <MdSavings size={24} />, soDesktop: true },
  { valor: 'cartoes', rotulo: 'Cartões', icone: <MdPayment size={24} />, soDesktop: true },
  { valor: 'simulacao', rotulo: 'Simulação', icone: <MdCalculate size={24} />, soDesktop: true },
]

// O "+" pergunta como registrar: pelo formulário ou conversando com o Marcão (Copiloto).
function MenuNovaConta({ className, onEscolher }) {
  return (
    <div className={`navegacao-menu ${className}`} role='menu' aria-label='Nova movimentação'>
      <button role='menuitem' className='navegacao-menu-opcao' onClick={() => onEscolher('manual')}>
        <span className='navegacao-menu-icone'><MdEditNote size={22} /></span>
        <span>
          <strong>Registrar manualmente</strong>
          <small>Preencher o formulário</small>
        </span>
      </button>
      <button role='menuitem' className='navegacao-menu-opcao' onClick={() => onEscolher('texto')}>
        <span className='navegacao-menu-icone'><MdAutoAwesome size={20} /></span>
        <span>
          <strong>Falar com o Marcão</strong>
          <small>Escreva e ele registra pra você</small>
        </span>
      </button>
    </div>
  )
}

function Navegacao({ aba, onAlterarAba, onNovaConta, onRegistrarPorTexto, onAbrirConta }) {
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    if (!menuAberto) return
    const handleTecla = (event) => event.key === 'Escape' && setMenuAberto(false)
    window.addEventListener('keydown', handleTecla)
    return () => window.removeEventListener('keydown', handleTecla)
  }, [menuAberto])

  function escolher(opcao) {
    setMenuAberto(false)
    if (opcao === 'texto') onRegistrarPorTexto()
    else onNovaConta('Receita')
  }

  return (
    <>
      <nav className='navegacao' aria-label='Navegação principal'>
        <button className='navegacao-marca' onClick={onAbrirConta} title='Minha conta'>
          <span className='navegacao-logo' aria-hidden='true'>C+</span>
          <strong>Controla+</strong>
        </button>

        <div className='navegacao-nova'>
          <button
            className='botao botao-primario'
            onClick={() => setMenuAberto(!menuAberto)}
            aria-haspopup='menu'
            aria-expanded={menuAberto}
          >
            <MdAdd size={20} />
            Nova movimentação
          </button>
          {menuAberto && <MenuNovaConta className='navegacao-menu-lateral' onEscolher={escolher} />}
        </div>

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

      {menuAberto && (
        <>
          <div className='navegacao-menu-fundo' onClick={() => setMenuAberto(false)} aria-hidden='true' />
          <MenuNovaConta className='navegacao-menu-flutuante' onEscolher={escolher} />
        </>
      )}

      <button
        className='navegacao-fab'
        onClick={() => setMenuAberto(!menuAberto)}
        aria-label={menuAberto ? 'Fechar opções' : 'Nova movimentação'}
        aria-haspopup='menu'
        aria-expanded={menuAberto}
      >
        {menuAberto ? <MdClose size={28} /> : <MdAdd size={28} />}
      </button>
    </>
  )
}

export default Navegacao
