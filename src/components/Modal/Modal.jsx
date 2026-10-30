import { useEffect } from 'react'
import { MdClose } from 'react-icons/md'
import './Modal.css'

function Modal({ titulo, onFechar, children }) {
  useEffect(() => {
    function handleTecla(event) {
      if (event.key === 'Escape') onFechar()
    }

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleTecla)

    return () => {
      document.body.style.overflow = overflowAnterior
      window.removeEventListener('keydown', handleTecla)
    }
  }, [onFechar])

  return (
    <div className='modal-overlay' onClick={onFechar}>
      <div
        className='modal'
        role='dialog'
        aria-modal='true'
        aria-label={titulo}
        onClick={(event) => event.stopPropagation()}
      >
        <span className='modal-alca' aria-hidden='true' />
        <header className='modal-cabecalho'>
          <h2>{titulo}</h2>
          <button className='modal-fechar' onClick={onFechar} aria-label='Fechar'>
            <MdClose size={22} />
          </button>
        </header>
        <div className='modal-conteudo'>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
