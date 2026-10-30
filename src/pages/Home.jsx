import './Home.css'
import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdAdd, MdChevronRight, MdPeopleAlt, MdReceiptLong, MdRemove } from 'react-icons/md'
import Cabecalho from '../components/Cabecalho/Cabecalho'
import Saldo from '../components/Saldo/Saldo'
import Extrato from '../components/Extrato/Extrato'
import Total from '../components/Total/Total'
import Navegacao from '../components/Navegacao/Navegacao'
import Modal from '../components/Modal/Modal'
import FormConta from '../components/FormConta/FormConta'
import DetalheConta from '../components/DetalheConta/DetalheConta'
import { limparErro } from '../store/extrato'
import supabase from '../services/supabase'

const TITULOS = {
  inicio: 'Início',
  extrato: 'Extrato',
  valores: 'Valores por pessoa',
}

function Home() {
  const [aba, setAba] = useState('inicio')
  const [ocultarValores, setOcultarValores] = useState(false)
  const [novaConta, setNovaConta] = useState(null)
  const [contaSelecionada, setContaSelecionada] = useState(null)
  const carregando = useSelector((state) => state.extrato.carregando)
  const erro = useSelector((state) => state.extrato.erro)
  const dispatch = useDispatch()

  const fecharNovaConta = useCallback(() => setNovaConta(null), [])
  const fecharDetalhe = useCallback(() => setContaSelecionada(null), [])

  function alterarAba(novaAba) {
    setAba(novaAba)
    window.scrollTo({ top: 0 })
  }

  const acoesRapidas = [
    { rotulo: 'Receita', icone: <MdAdd size={24} />, acao: () => setNovaConta('Receita') },
    { rotulo: 'Despesa', icone: <MdRemove size={24} />, acao: () => setNovaConta('Despesa') },
    { rotulo: 'Extrato', icone: <MdReceiptLong size={24} />, acao: () => alterarAba('extrato') },
    { rotulo: 'Valores', icone: <MdPeopleAlt size={24} />, acao: () => alterarAba('valores') },
  ]

  return (
    <div className='app'>
      <Navegacao aba={aba} onAlterarAba={alterarAba} onNovaConta={setNovaConta} />

      <main className='app-conteudo'>
        <Cabecalho
          titulo={TITULOS[aba]}
          ocultar={ocultarValores}
          onAlternarOcultar={() => setOcultarValores(!ocultarValores)}
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
          <DetalheConta id={contaSelecionada} ocultar={ocultarValores} onFechar={fecharDetalhe} />
        </Modal>
      )}
    </div>
  )
}

export default Home
