import { useState } from 'react'
import './Tutorial.css'

// Tutorial em passos, exibido dentro de um Modal. Concluir ou fechar o modal chamam onConcluir;
// Pular chama onPular, se informado, ou onConcluir.
function Tutorial({ passos, onConcluir, onPular = onConcluir }) {
  const [indice, setIndice] = useState(0)
  const passo = passos[indice]
  const ultimo = indice === passos.length - 1

  return (
    <div className='tutorial'>
      <div className='tutorial-progresso'>
        <div className='tutorial-progresso-topo'>
          <span>Passo {indice + 1} de {passos.length}</span>
          {!ultimo && (
            <button type='button' className='tutorial-pular' onClick={onPular}>Pular</button>
          )}
        </div>
        <div className='tutorial-barra' aria-hidden='true'>
          <span style={{ width: `${((indice + 1) / passos.length) * 100}%` }} />
        </div>
      </div>

      <div className='tutorial-passo' key={indice} aria-live='polite'>
        <span className='tutorial-icone' aria-hidden='true'>{passo.icone}</span>
        <h3>{passo.titulo}</h3>
        <div className='tutorial-texto'>{passo.conteudo}</div>
      </div>

      <div className='tutorial-acoes'>
        <button type='button' className='botao botao-secundario' onClick={() => setIndice(indice - 1)} disabled={indice === 0}>Voltar</button>
        <button type='button' className='botao botao-primario' onClick={ultimo ? onConcluir : () => setIndice(indice + 1)}>
          {ultimo ? 'Concluir' : 'Próximo'}
        </button>
      </div>
    </div>
  )
}

export default Tutorial
