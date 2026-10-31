import './Home.css'
import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdCalculate, MdChevronRight, MdPeopleAlt, MdReceiptLong, MdRemove } from 'react-icons/md'
import Cabecalho from '../components/Cabecalho/Cabecalho'
import Saldo from '../components/Saldo/Saldo'
import Extrato from '../components/Extrato/Extrato'
import Total from '../components/Total/Total'
import Parcelamentos from '../components/Parcelamentos/Parcelamentos'
import Cartoes from '../components/Cartoes/Cartoes'
import Dashboard from '../components/Dashboard/Dashboard'
import Simulacao from '../components/Simulacao/Simulacao'
import Navegacao from '../components/Navegacao/Navegacao'
import Modal from '../components/Modal/Modal'
import FormConta from '../components/FormConta/FormConta'
import DetalheConta from '../components/DetalheConta/DetalheConta'
import MinhaConta from '../components/MinhaConta/MinhaConta'
import Notificacoes from '../components/Notificacoes/Notificacoes'
import { limparErro } from '../store/extrato'
import { limparErroCartoes } from '../store/cartoes'
import supabase from '../services/supabase'
import { gravarNotificacoesLidas, lerNotificacoesLidas } from '../services/notificacoesLidas'
import { gerarNotificacoes } from '../utils/notificacoes'
import useHoje from '../hooks/useHoje'

const TITULOS = {
  inicio: 'Início',
  extrato: 'Extrato',
  parcelas: 'Parcelamentos',
  cartoes: 'Cartões',
  dashboard: 'Dashboard',
  simulacao: 'Simulação',
  valores: 'Valores por pessoa',
}

function Home({ saudacao, usuario }) {
  const [aba, setAba] = useState('inicio')
  const [ocultarValores, setOcultarValores] = useState(false)
  const [novaConta, setNovaConta] = useState(null)
  const [contaSelecionada, setContaSelecionada] = useState(null)
  const [contaEditada, setContaEditada] = useState(null)
  const [minhaContaAberta, setMinhaContaAberta] = useState(false)
  const [notificacoesLidas, setNotificacoesLidas] = useState(() => lerNotificacoesLidas(usuario.id))
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(null)
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const carregando = useSelector((state) => state.extrato.carregando)
  const erro = useSelector((state) => state.extrato.erro)
  const erroCartoes = useSelector((state) => state.cartoes.erro)
  const dispatch = useDispatch()

  const fecharNovaConta = useCallback(() => setNovaConta(null), [])
  const fecharDetalhe = useCallback(() => setContaSelecionada(null), [])
  const fecharEdicao = useCallback(() => setContaEditada(null), [])

  function editarConta(conta) {
    setContaSelecionada(null)
    setContaEditada(conta)
  }
  const fecharMinhaConta = useCallback(() => setMinhaContaAberta(false), [])
  const fecharNotificacoes = useCallback(() => setNotificacoesAbertas(null), [])

  const hoje = useHoje()
  const notificacoes = gerarNotificacoes(contas, hoje)
  const notificacoesNovas = notificacoes.filter((notificacao) => !notificacoesLidas.includes(notificacao.id))

  // Abrir o sino marca tudo como lido; as que eram novas ficam destacadas enquanto a lista está aberta.
  function abrirNotificacoes() {
    const ids = notificacoes.map((notificacao) => notificacao.id)
    setNotificacoesAbertas(notificacoesNovas.map((notificacao) => notificacao.id))
    setNotificacoesLidas(ids)
    gravarNotificacoesLidas(usuario.id, ids)
  }

  function alterarAba(novaAba) {
    setAba(novaAba)
    window.scrollTo({ top: 0 })
  }

  const acoesRapidas = [
    { rotulo: 'Receita', icone: <MdAdd size={24} />, acao: () => setNovaConta('Receita') },
    { rotulo: 'Despesa', icone: <MdRemove size={24} />, acao: () => setNovaConta('Despesa') },
    { rotulo: 'Extrato', icone: <MdReceiptLong size={24} />, acao: () => alterarAba('extrato') },
    { rotulo: 'Valores', icone: <MdPeopleAlt size={24} />, acao: () => alterarAba('valores') },
    { rotulo: 'Simular', icone: <MdCalculate size={24} />, acao: () => alterarAba('simulacao') },
  ]

  return (
    <div className='app'>
      <Navegacao aba={aba} onAlterarAba={alterarAba} onNovaConta={setNovaConta} onAbrirConta={() => setMinhaContaAberta(true)} />

      <main className='app-conteudo'>
        <Cabecalho
          titulo={TITULOS[aba]}
          saudacao={saudacao}
          ocultar={ocultarValores}
          notificacoesNovas={carregando ? 0 : notificacoesNovas.length}
          onAlternarOcultar={() => setOcultarValores(!ocultarValores)}
          onAbrirNotificacoes={abrirNotificacoes}
          onAbrirConta={() => setMinhaContaAberta(true)}
          onSair={() => supabase.auth.signOut()}
        >
          {aba === 'inicio' && <Saldo ocultar={ocultarValores} />}
        </Cabecalho>

        <div className='pagina'>
          {erro && (
            <div className='app-erro' role='alert'>
              <span>Não foi possível sincronizar com o servidor: {erro}</span>
              <button onClick={() => dispatch(limparErro())}>Fechar</button>
            </div>
          )}

          {erroCartoes && (
            <div className='app-erro' role='alert'>
              <span>Não foi possível sincronizar os cartões: {erroCartoes}</span>
              <button onClick={() => dispatch(limparErroCartoes())}>Fechar</button>
            </div>
          )}

          {carregando && <p className='app-carregando'>Carregando movimentações...</p>}

          {!carregando && aba === 'inicio' && (
            <>
              <nav className='acoes-rapidas' aria-label='Ações rápidas'>
                {acoesRapidas.map(({ rotulo, icone, acao }) => (
                  <button key={rotulo} className='acao-rapida' onClick={acao}>
                    <span className='acao-rapida-icone'>{icone}</span>
                    <span>{rotulo}</span>
                  </button>
                ))}
              </nav>

              <section>
                <div className='secao-cabecalho'>
                  <h2>Últimas movimentações</h2>
                  <button className='secao-link' onClick={() => alterarAba('extrato')}>
                    Ver tudo <MdChevronRight size={18} />
                  </button>
                </div>
                <Extrato ocultar={ocultarValores} limite={5} onSelecionar={setContaSelecionada} />
              </section>
            </>
          )}

          {!carregando && aba === 'extrato' && (
            <Extrato ocultar={ocultarValores} comFiltro onSelecionar={setContaSelecionada} />
          )}

          {!carregando && aba === 'parcelas' && <Parcelamentos ocultar={ocultarValores} />}

          {!carregando && aba === 'cartoes' && <Cartoes ocultar={ocultarValores} />}

          {!carregando && aba === 'dashboard' && <Dashboard ocultar={ocultarValores} />}

          {!carregando && aba === 'simulacao' && <Simulacao ocultar={ocultarValores} />}

          {!carregando && aba === 'valores' && <Total ocultar={ocultarValores} />}
        </div>
      </main>

      {novaConta && (
        <Modal titulo='Nova movimentação' onFechar={fecharNovaConta}>
          <FormConta tipoInicial={novaConta} onConcluir={fecharNovaConta} />
        </Modal>
      )}

      {contaSelecionada && (
        <Modal titulo='Detalhes da movimentação' onFechar={fecharDetalhe}>
          <DetalheConta id={contaSelecionada} ocultar={ocultarValores} onEditar={editarConta} onFechar={fecharDetalhe} />
        </Modal>
      )}

      {contaEditada && (
        <Modal titulo='Editar movimentação' onFechar={fecharEdicao}>
          <FormConta conta={contaEditada} onConcluir={fecharEdicao} />
        </Modal>
      )}

      {notificacoesAbertas && (
        <Modal titulo='Notificações' onFechar={fecharNotificacoes}>
          <Notificacoes
            notificacoes={notificacoes}
            novas={notificacoesAbertas}
            ocultar={ocultarValores}
            onVerParcelas={() => {
              fecharNotificacoes()
              alterarAba('parcelas')
            }}
          />
        </Modal>
      )}

      {minhaContaAberta && (
        <Modal titulo='Minha conta' onFechar={fecharMinhaConta}>
          <MinhaConta usuario={usuario} />
        </Modal>
      )}
    </div>
  )
}

export default Home
