import './Home.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { App } from '@capacitor/app'
import { MdAdd, MdCalculate, MdChevronRight, MdCloudOff, MdCloudUpload, MdPayment, MdRemove, MdSavings } from 'react-icons/md'
import Cabecalho from '../components/Cabecalho/Cabecalho'
import Saldo from '../components/Saldo/Saldo'
import Extrato from '../components/Extrato/Extrato'
import Total from '../components/Total/Total'
import Parcelamentos from '../components/Parcelamentos/Parcelamentos'
import Cartoes from '../components/Cartoes/Cartoes'
import Dashboard from '../components/Dashboard/Dashboard'
import Simulacao from '../components/Simulacao/Simulacao'
import Metas from '../components/Metas/Metas'
import SobraMes from '../components/SobraMes/SobraMes'
import Navegacao from '../components/Navegacao/Navegacao'
import Modal from '../components/Modal/Modal'
import FormConta from '../components/FormConta/FormConta'
import DetalheConta from '../components/DetalheConta/DetalheConta'
import MinhaConta from '../components/MinhaConta/MinhaConta'
import Notificacoes from '../components/Notificacoes/Notificacoes'
import Tutorial from '../components/Tutorial/Tutorial'
import Atualizacao from '../components/Atualizacao/Atualizacao'
import Copiloto from '../components/Copiloto/Copiloto'
import ResumoMes from '../components/ResumoMes/ResumoMes'
import { PASSOS_GERAL, PASSOS_NOVIDADES, PASSOS_SIMULACAO, VERSAO_NOVIDADES } from '../components/Tutorial/passos'
import { limparErro, limparFalhasEnvio } from '../store/extrato'
import { limparErroCartoes } from '../store/cartoes'
import supabase from '../services/supabase'
import { buscarApkMaisRecente, buscarAtualizacao } from '../services/atualizacao'
import { gravarAvisoAppVisto, gravarNotificacoesLidas, gravarTutorialPulado, lerNotificacoesLidas, lerTutorialPulado } from '../services/notificacoesLidas'
import { gerarAlertasFinanceiros, gerarNotificacoes, gerarNotificacoesRevisao } from '../utils/notificacoes'
import { calcularMeta } from '../utils/metas'
import { APRENDIZADO_VAZIO, aprenderComFormulario } from '../utils/aprendizado'
import { formatarMes } from '../utils/mes'
import useHoje from '../hooks/useHoje'
import useSincronizacao from '../hooks/useSincronizacao'

const TITULOS = {
  inicio: 'Início',
  extrato: 'Extrato',
  parcelas: 'Parcelamentos',
  cartoes: 'Cartões',
  dashboard: 'Dashboards',
  simulacao: 'Simulação',
  metas: 'Metas e reservas',
  valores: 'Acertos entre pessoas',
}

const TUTORIAIS = {
  geral: { titulo: 'Como usar o Controla+', passos: PASSOS_GERAL },
  simulacao: { titulo: 'Como usar a Simulação', passos: PASSOS_SIMULACAO },
  [VERSAO_NOVIDADES]: { titulo: 'Novidades', passos: PASSOS_NOVIDADES },
}

function textoPendencias(quantidade, enviando) {
  if (quantidade === 0) return 'Sem internet: mostrando os dados salvos neste aparelho.'
  const alteracoes = `${quantidade} ${quantidade === 1 ? 'alteração feita' : 'alterações feitas'} sem internet`
  if (enviando) return `Enviando ${alteracoes}...`
  return `${alteracoes} ${quantidade === 1 ? 'aguarda' : 'aguardam'} conexão. O envio é automático.`
}

function Home({ saudacao, usuario }) {
  const [aba, setAba] = useState('inicio')
  const [ocultarValores, setOcultarValores] = useState(false)
  const [novaConta, setNovaConta] = useState(null)
  const [contaSelecionada, setContaSelecionada] = useState(null)
  const [contaEditada, setContaEditada] = useState(null)
  const [copilotoAberto, setCopilotoAberto] = useState(false)
  // O chat abre já na análise de dicas quando vem do aviso de saldo no sino ou do resumo do mês.
  const [copilotoComDicas, setCopilotoComDicas] = useState(false)
  // Abertos a partir das dicas do Marcão: Simulação e formulário de meta já preenchidos.
  const [pedidoSimulacao, setPedidoSimulacao] = useState(null)
  const [pedidoMeta, setPedidoMeta] = useState(null)
  // Mês recém-quitado: mostra o resumo automático do Marcão.
  const [resumoMes, setResumoMes] = useState(null)
  const [sugestaoConta, setSugestaoConta] = useState(null)
  // Campos que o Marcão preencheu por padrão, por movimentação: ficam no perfil (valem em todos os aparelhos).
  const [revisoes, setRevisoes] = useState(() => usuario.user_metadata?.revisoesCopiloto ?? {})
  const revisoesAtuais = useRef(revisoes)
  // O que o usuário ensinou ao Marcão no chat ("roxinho é o Nubank"): também fica no perfil.
  const [aprendizado, setAprendizado] = useState(() => usuario.user_metadata?.aprendizadoCopiloto ?? APRENDIZADO_VAZIO)
  const aprendizadoAtual = useRef(aprendizado)
  // Sem internet o perfil não é salvo: fica marcado para reenviar quando a conexão voltar.
  const perfilPendente = useRef(false)
  const [minhaContaAberta, setMinhaContaAberta] = useState(false)
  const [notificacoesLidas, setNotificacoesLidas] = useState(() => lerNotificacoesLidas(usuario.id))
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(null)
  const [tutorialEscolhido, setTutorialEscolhido] = useState(null)
  const [tutoriaisVistos, setTutoriaisVistos] = useState(() => usuario.user_metadata?.tutoriais ?? {})
  const [atualizacao, setAtualizacao] = useState(null)
  const [atualizacaoAdiada, setAtualizacaoAdiada] = useState(null)
  const [apk, setApk] = useState(null)
  const [tutorialPulado, setTutorialPulado] = useState(() => lerTutorialPulado(usuario.id))
  const [sobraPerguntada, setSobraPerguntada] = useState(() => usuario.user_metadata?.sobraPerguntada ?? '')
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const metas = useSelector((state) => state.metas.lista)
  const metasCarregadas = useSelector((state) => state.metas.carregado)
  const carregando = useSelector((state) => state.extrato.carregando)
  const erro = useSelector((state) => state.extrato.erro)
  const erroCartoes = useSelector((state) => state.cartoes.erro)
  const fila = useSelector((state) => state.extrato.fila)
  const sincronizando = useSelector((state) => state.extrato.sincronizando)
  const semConexao = useSelector((state) => state.extrato.semConexao)
  const falhasEnvio = useSelector((state) => state.extrato.falhasEnvio)
  const idsSincronizados = useSelector((state) => state.extrato.idsSincronizados)
  const dispatch = useDispatch()
  useSincronizacao(usuario.id)

  const fecharNovaConta = useCallback(() => setNovaConta(null), [])
  const fecharDetalhe = useCallback(() => setContaSelecionada(null), [])
  const fecharEdicao = useCallback(() => setContaEditada(null), [])
  const fecharCopiloto = useCallback(() => setCopilotoAberto(false), [])
  const fecharSugestao = useCallback(() => setSugestaoConta(null), [])

  const store = useStore()

  const salvarPerfil = useCallback((dados) => {
    supabase.auth.updateUser({ data: dados })
      .then(({ error }) => {
        if (error) perfilPendente.current = true
      })
      .catch(() => {
        perfilPendente.current = true
      })
  }, [])

  useEffect(() => {
    function reenviarPerfil() {
      if (!perfilPendente.current) return
      perfilPendente.current = false
      salvarPerfil({ revisoesCopiloto: revisoesAtuais.current, aprendizadoCopiloto: aprendizadoAtual.current })
    }
    window.addEventListener('online', reenviarPerfil)
    return () => window.removeEventListener('online', reenviarPerfil)
  }, [salvarPerfil])

  // Parte sempre da versão mais recente (o Marcão pode registrar vários lançamentos em sequência)
  // e descarta avisos de movimentações que já foram apagadas.
  const atualizarRevisoes = useCallback((alterar) => {
    const existentes = new Set(store.getState().extrato.contasExtrato.map((conta) => String(conta.id)))
    const novas = Object.fromEntries(Object.entries(alterar(revisoesAtuais.current)).filter(([id]) => existentes.has(id)))
    revisoesAtuais.current = novas
    setRevisoes(novas)
    salvarPerfil({ revisoesCopiloto: novas })
  }, [store, salvarPerfil])

  // Movimentação registrada sem internet ganha o id definitivo ao ser enviada: o aviso de revisão acompanha.
  useEffect(() => {
    const trocas = Object.entries(idsSincronizados).filter(([idLocal]) => revisoesAtuais.current[idLocal])
    if (trocas.length === 0) return
    atualizarRevisoes((atuais) => {
      const novas = { ...atuais }
      trocas.forEach(([idLocal, idDefinitivo]) => {
        novas[idDefinitivo] = novas[idLocal]
        delete novas[idLocal]
      })
      return novas
    })
  }, [idsSincronizados, atualizarRevisoes])

  // Campos que o Marcão preencheu por padrão viram aviso no sino até a movimentação ser revisada.
  // O chat continua aberto para registrar outras movimentações.
  function registrarPeloCopiloto(conta, camposAssumidos) {
    if (camposAssumidos.length > 0) atualizarRevisoes((atuais) => ({ ...atuais, [conta.id]: camposAssumidos }))
  }

  const salvarAprendizado = useCallback((novo) => {
    aprendizadoAtual.current = novo
    setAprendizado(novo)
    salvarPerfil({ aprendizadoCopiloto: novo })
  }, [salvarPerfil])

  const fecharResumoMes = useCallback(() => setResumoMes(null), [])

  function abrirCopiloto(comDicas) {
    setCopilotoComDicas(comDicas)
    setCopilotoAberto(true)
  }

  function abrirSimulacaoSugerida({ nome, entrada }) {
    setCopilotoAberto(false)
    alterarAba('simulacao')
    setPedidoSimulacao((atual) => ({ chave: (atual?.chave ?? 0) + 1, nome, entrada }))
  }

  function abrirMetaSugerida(sugestao) {
    setCopilotoAberto(false)
    alterarAba('metas')
    setPedidoMeta((atual) => ({ chave: (atual?.chave ?? 0) + 1, sugestao }))
  }

  function revisarSugestao(sugestao) {
    setCopilotoAberto(false)
    setSugestaoConta(sugestao)
  }

  // Tipo de despesa trocado no formulário em algo que o Marcão propôs: ele aprende para a próxima vez.
  function aprenderDoFormulario(proposta, salva) {
    const novo = aprenderComFormulario(aprendizadoAtual.current, proposta, salva)
    if (novo) salvarAprendizado(novo)
  }

  function concluirSugestao(salva) {
    aprenderDoFormulario(sugestaoConta, salva)
    fecharSugestao()
  }

  function concluirEdicao(salva) {
    // Só as movimentações do Marcão com aviso de revisão ensinam; nas demais, a correção
    // entra no histórico do Extrato e conta na escolha do tipo mais usado.
    if (revisoes[contaEditada?.id]) {
      aprenderDoFormulario(contaEditada, salva)
      atualizarRevisoes((atuais) => Object.fromEntries(Object.entries(atuais).filter(([id]) => id !== String(contaEditada.id))))
    }
    fecharEdicao()
  }

  function editarConta(conta) {
    setContaSelecionada(null)
    setContaEditada(conta)
  }
  const fecharMinhaConta = useCallback(() => setMinhaContaAberta(false), [])
  const fecharNotificacoes = useCallback(() => setNotificacoesAbertas(null), [])

  // Procura nova versão ao abrir e sempre que o app volta para o primeiro plano.
  // Falha na verificação não impede o uso: tenta de novo na próxima vez.
  useEffect(() => {
    const verificar = () => buscarAtualizacao().then(setAtualizacao).catch(() => {})
    verificar()
    const ouvinte = App.addListener('resume', verificar)
    return () => {
      ouvinte.then((handle) => handle.remove())
    }
  }, [])

  // No navegador de um Android, oferece o APK em Minha conta. Sem versão publicada ou com falha, nada aparece.
  useEffect(() => {
    buscarApkMaisRecente().then(setApk).catch(() => {})
  }, [])

  // "Agora não" adia a versão até o app ser aberto de novo; a obrigatória não pode ser adiada.
  const atualizacaoAberta = atualizacao && (atualizacao.obrigatoria || atualizacao.codigo_versao !== atualizacaoAdiada) ? atualizacao : null
  const adiarAtualizacao = useCallback(() => setAtualizacaoAdiada(atualizacao?.codigo_versao ?? null), [atualizacao])

  // Cada tutorial abre sozinho uma vez: o geral no primeiro acesso, as novidades para quem já usava
  // o app e o da simulação na primeira visita ao módulo. Depois só abre quando pedido (Minha conta
  // ou "Como funciona" na Simulação).
  const tutorialAutomatico = carregando
    ? null
    : !tutoriaisVistos.geral ? 'geral'
      : !tutoriaisVistos[VERSAO_NOVIDADES] ? VERSAO_NOVIDADES
        : aba === 'simulacao' && !tutoriaisVistos.simulacao ? 'simulacao' : null
  const tutorialAberto = tutorialEscolhido ?? tutorialAutomatico

  // Fechar, pular ou concluir marca como visto. O registro fica no perfil do usuário (Supabase);
  // se não for salvo, o tutorial volta a aparecer no próximo acesso.
  // O tutorial geral já inclui as novidades: quem o vê não precisa do tour de novidades depois.
  const fecharTutorial = useCallback(() => {
    setTutorialEscolhido(null)
    const marcar = tutorialAberto === 'geral' ? ['geral', VERSAO_NOVIDADES] : [tutorialAberto]
    if (marcar.every((chave) => tutoriaisVistos[chave])) return
    const vistos = { ...tutoriaisVistos, ...Object.fromEntries(marcar.map((chave) => [chave, true])) }
    setTutoriaisVistos(vistos)
    supabase.auth.updateUser({ data: { tutoriais: vistos } })
  }, [tutoriaisVistos, tutorialAberto])

  // Pular o tutorial geral num navegador Android deixa no sino o aviso de como baixar o app.
  function pularTutorial() {
    if (tutorialAberto === 'geral' && apk) {
      gravarTutorialPulado(usuario.id)
      setTutorialPulado(true)
    }
    fecharTutorial()
  }

  // O passo do app para Android só aparece no navegador do Android, quando há APK publicado.
  const passosTutorial = tutorialAberto
    ? TUTORIAIS[tutorialAberto].passos.filter((passo) => !passo.soAndroid || apk)
    : []

  function abrirTutorial(chave) {
    setMinhaContaAberta(false)
    setTutorialEscolhido(chave)
  }

  const hoje = useHoje()
  const notificacoes = [
    ...(apk && tutorialPulado ? [{ id: 'baixar-app', tipo: 'app' }] : []),
    ...gerarAlertasFinanceiros(contas, fechamento, hoje.slice(0, 7)),
    ...gerarNotificacoesRevisao(contas, revisoes),
    ...gerarNotificacoes(contas, hoje),
  ]
  const notificacoesNovas = notificacoes.filter((notificacao) => !notificacoesLidas.includes(notificacao.id))

  // Abrir o sino marca tudo como lido; as que eram novas ficam destacadas enquanto a lista está aberta.
  function abrirNotificacoes() {
    const ids = notificacoes.map((notificacao) => notificacao.id)
    setNotificacoesAbertas(notificacoesNovas.map((notificacao) => notificacao.id))
    setNotificacoesLidas(ids)
    gravarNotificacoesLidas(usuario.id, ids)
  }

  // Depois que um mês é fechado com sobra, pergunta uma vez se o usuário quer guardar parte dela
  // em uma meta ainda não alcançada. O último mês perguntado fica no perfil (vale em todos os aparelhos).
  const metasEmAberto = metas
    .filter((meta) => meta.status === 'ativa')
    .map((meta) => ({ meta, situacao: calcularMeta(meta, hoje.slice(0, 7)) }))
    .filter(({ situacao }) => !situacao.atingida)
  const sobraAberta = !carregando && metasCarregadas && !tutorialAberto && !atualizacaoAberta && !resumoMes
    && fechamento?.saldo > 0 && fechamento.mes > sobraPerguntada && metasEmAberto.length > 0

  const fecharSobra = useCallback(() => {
    setSobraPerguntada(fechamento.mes)
    supabase.auth.updateUser({ data: { sobraPerguntada: fechamento.mes } })
  }, [fechamento])

  function alterarAba(novaAba) {
    // Sair da aba descarta o que o Marcão tinha preenchido nela.
    if (novaAba !== 'simulacao') setPedidoSimulacao(null)
    if (novaAba !== 'metas') setPedidoMeta(null)
    setAba(novaAba)
    window.scrollTo({ top: 0 })
  }

  const acoesRapidas = [
    { rotulo: 'Receita', icone: <MdAdd size={24} />, acao: () => setNovaConta('Receita') },
    { rotulo: 'Despesa', icone: <MdRemove size={24} />, acao: () => setNovaConta('Despesa') },
    { rotulo: 'Metas', icone: <MdSavings size={24} />, acao: () => alterarAba('metas') },
    { rotulo: 'Cartões', icone: <MdPayment size={24} />, acao: () => alterarAba('cartoes') },
    { rotulo: 'Simular', icone: <MdCalculate size={24} />, acao: () => alterarAba('simulacao') },
  ]

  return (
    <div className='app'>
      <Navegacao aba={aba} onAlterarAba={alterarAba} onNovaConta={setNovaConta} onRegistrarPorTexto={() => abrirCopiloto(false)} onAbrirConta={() => setMinhaContaAberta(true)} />

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
          {aba === 'inicio' && <Saldo ocultar={ocultarValores} onMesQuitado={setResumoMes} />}
        </Cabecalho>

        <div className='pagina'>
          {erro && (
            <div className='app-erro' role='alert'>
              <span>Não foi possível sincronizar com o servidor: {erro}</span>
              <button onClick={() => dispatch(limparErro())}>Fechar</button>
            </div>
          )}

          {(fila.length > 0 || semConexao) && (
            <div className='app-aviso' role='status'>
              {sincronizando ? <MdCloudUpload size={20} aria-hidden='true' /> : <MdCloudOff size={20} aria-hidden='true' />}
              <span>{textoPendencias(fila.length, sincronizando)}</span>
            </div>
          )}

          {falhasEnvio.length > 0 && (
            <div className='app-erro' role='alert'>
              <span>{falhasEnvio.join(' ')} Os dados foram atualizados com o que está salvo no servidor.</span>
              <button onClick={() => dispatch(limparFalhasEnvio())}>Fechar</button>
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
                <Extrato limite={5} onSelecionar={setContaSelecionada} />
              </section>
            </>
          )}

          {!carregando && aba === 'extrato' && (
            <Extrato comFiltro onSelecionar={setContaSelecionada} />
          )}

          {!carregando && aba === 'parcelas' && <Parcelamentos />}

          {!carregando && aba === 'cartoes' && <Cartoes />}

          {!carregando && aba === 'dashboard' && <Dashboard />}

          {!carregando && aba === 'simulacao' && (
            <Simulacao key={pedidoSimulacao?.chave ?? 'simulacao'} pedido={pedidoSimulacao} onAbrirTutorial={() => abrirTutorial('simulacao')} />
          )}

          {!carregando && aba === 'metas' && <Metas key={pedidoMeta?.chave ?? 'metas'} ocultar={ocultarValores} sugestaoInicial={pedidoMeta?.sugestao} />}

          {!carregando && aba === 'valores' && <Total />}
        </div>
      </main>

      {novaConta && (
        <Modal titulo='Nova movimentação' onFechar={fecharNovaConta}>
          <FormConta tipoInicial={novaConta} onConcluir={fecharNovaConta} />
        </Modal>
      )}

      {contaSelecionada && (
        <Modal titulo='Detalhes da movimentação' onFechar={fecharDetalhe}>
          <DetalheConta id={contaSelecionada} onEditar={editarConta} onFechar={fecharDetalhe} />
        </Modal>
      )}

      {contaEditada && (
        <Modal titulo='Editar movimentação' onFechar={fecharEdicao}>
          <FormConta conta={contaEditada} onConcluir={concluirEdicao} />
        </Modal>
      )}

      {copilotoAberto && (
        <Modal titulo='Marcão' onFechar={fecharCopiloto}>
          <Copiloto
            key={copilotoComDicas ? 'dicas' : 'chat'}
            iniciarDicas={copilotoComDicas}
            aprendizado={aprendizado}
            onAprender={salvarAprendizado}
            onRegistrado={registrarPeloCopiloto}
            onRevisar={revisarSugestao}
            onSimular={abrirSimulacaoSugerida}
            onCriarMeta={abrirMetaSugerida}
          />
        </Modal>
      )}

      {sugestaoConta && (
        <Modal titulo='Revisar movimentação' onFechar={fecharSugestao}>
          <FormConta sugestao={sugestaoConta} onConcluir={concluirSugestao} />
        </Modal>
      )}

      {notificacoesAbertas && (
        <Modal titulo='Notificações' onFechar={fecharNotificacoes}>
          <Notificacoes
            notificacoes={notificacoes}
            novas={notificacoesAbertas}
            onVerParcelas={() => {
              fecharNotificacoes()
              alterarAba('parcelas')
            }}
            onRevisar={(conta) => {
              fecharNotificacoes()
              setContaEditada(conta)
            }}
            onPedirDicas={() => {
              fecharNotificacoes()
              abrirCopiloto(true)
            }}
            onAbrirConta={() => {
              gravarAvisoAppVisto(usuario.id)
              setTutorialPulado(false)
              fecharNotificacoes()
              setMinhaContaAberta(true)
            }}
          />
        </Modal>
      )}

      {minhaContaAberta && (
        <Modal titulo='Minha conta' onFechar={fecharMinhaConta}>
          <MinhaConta usuario={usuario} urlApk={apk?.url_apk} onAbrirTutorial={abrirTutorial} />
        </Modal>
      )}

      {tutorialAberto && (
        <Modal titulo={TUTORIAIS[tutorialAberto].titulo} onFechar={fecharTutorial}>
          <Tutorial key={tutorialAberto} passos={passosTutorial} onConcluir={fecharTutorial} onPular={pularTutorial} />
        </Modal>
      )}

      {resumoMes && (
        <Modal titulo={`Resumo de ${formatarMes(resumoMes).toLowerCase()}`} onFechar={fecharResumoMes}>
          <ResumoMes
            mes={resumoMes}
            onFechar={fecharResumoMes}
            onConversar={() => {
              fecharResumoMes()
              abrirCopiloto(true)
            }}
          />
        </Modal>
      )}

      {sobraAberta && (
        <Modal titulo='Guardar a sobra do mês' onFechar={fecharSobra}>
          <SobraMes mes={fechamento.mes} sobra={fechamento.saldo} metas={metasEmAberto} ocultar={ocultarValores} onConcluir={fecharSobra} />
        </Modal>
      )}

      {atualizacaoAberta && (
        <Modal titulo='Atualização disponível' onFechar={adiarAtualizacao} fixo={atualizacaoAberta.obrigatoria}>
          <Atualizacao key={atualizacaoAberta.codigo_versao} versao={atualizacaoAberta} onAdiar={adiarAtualizacao} />
        </Modal>
      )}
    </div>
  )
}

export default Home
