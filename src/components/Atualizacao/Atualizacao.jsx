import { useState } from 'react'
import { MdSystemUpdate } from 'react-icons/md'
import { baixarEInstalar } from '../../services/atualizacao'
import { mensagemErro } from '../../services/erros'
import './Atualizacao.css'

// Aviso de nova versão, exibido dentro de um Modal. Baixa o APK e abre o instalador do Android;
// a instalação em si é confirmada pelo usuário na tela do sistema.
function Atualizacao({ versao, onAdiar }) {
  const [etapa, setEtapa] = useState('aviso')
  const [progresso, setProgresso] = useState(null)
  const [erro, setErro] = useState(null)

  async function atualizar() {
    setEtapa('baixando')
    setProgresso(null)
    setErro(null)
    try {
      await baixarEInstalar(versao, setProgresso)
      setEtapa('instalando')
    } catch (error) {
      setErro(mensagemErro(error))
      setEtapa('aviso')
    }
  }

  return (
    <div className='atualizacao'>
      <div className='atualizacao-topo'>
        <span className='atualizacao-icone' aria-hidden='true'><MdSystemUpdate size={26} /></span>
        <div>
          <h3>Versão {versao.nome_versao} disponível</h3>
          <p>{versao.obrigatoria ? 'Esta atualização é necessária para continuar usando o app.' : 'Atualize para ter as últimas melhorias.'}</p>
        </div>
      </div>

      {versao.notas && (
        <div className='atualizacao-notas'>
          <strong>O que mudou</strong>
          <p>{versao.notas}</p>
        </div>
      )}

      {etapa === 'baixando' && (
        <div className='atualizacao-progresso' role='status'>
          <span>{progresso === null ? 'Baixando...' : `Baixando... ${Math.round(progresso * 100)}%`}</span>
          <div className='atualizacao-barra' aria-hidden='true'>
            <span className={progresso === null ? 'atualizacao-barra-indefinida' : ''} style={progresso === null ? undefined : { width: `${progresso * 100}%` }} />
          </div>
        </div>
      )}

      {etapa === 'instalando' && (
        <p className='atualizacao-dica' role='status'>
          Confirme a instalação na tela do Android. Se for pedido, permita instalar apps desta fonte e volte para concluir.
        </p>
      )}

      {erro && <p className='atualizacao-erro' role='alert'>Não foi possível baixar a atualização: {erro}</p>}

      <div className={versao.obrigatoria ? 'atualizacao-acoes atualizacao-acoes-unica' : 'atualizacao-acoes'}>
        {!versao.obrigatoria && (
          <button type='button' className='botao botao-secundario' onClick={onAdiar} disabled={etapa === 'baixando'}>Agora não</button>
        )}
        <button type='button' className='botao botao-primario' onClick={atualizar} disabled={etapa === 'baixando'}>
          {etapa === 'instalando' ? 'Abrir instalador novamente' : etapa === 'baixando' ? 'Baixando...' : 'Atualizar'}
        </button>
      </div>
    </div>
  )
}

export default Atualizacao
