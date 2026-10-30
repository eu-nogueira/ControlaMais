import { useState } from 'react'
import { useSelector } from 'react-redux'
import { MdNorthEast, MdReceiptLong, MdSouthWest } from 'react-icons/md'
import { formatarMoeda } from '../../utils/formatar'
import './Extrato.css'

const FILTROS = [
  { valor: 'Todos', rotulo: 'Todos' },
  { valor: 'Receita', rotulo: 'Receitas' },
  { valor: 'Despesa', rotulo: 'Despesas' },
]

function agruparPorData(contas) {
  return contas.reduce((grupos, conta) => {
    const ultimoGrupo = grupos[grupos.length - 1]
    if (ultimoGrupo && ultimoGrupo.data === conta.dataCadastro) {
      ultimoGrupo.contas.push(conta)
    } else {
      grupos.push({ data: conta.dataCadastro, contas: [conta] })
    }
    return grupos
  }, [])
}

function Extrato({ ocultar, limite, comFiltro, onSelecionar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato) || []
  const [filtro, setFiltro] = useState('Todos')

  const contasFiltradas = [...contas]
    .reverse()
    .filter((conta) => filtro === 'Todos' || conta.tipoConta === filtro)
    .slice(0, limite)

  const grupos = agruparPorData(contasFiltradas)

  return (
    <div className='extrato'>
      {comFiltro && (
        <div className='extrato-filtros' role='tablist' aria-label='Filtrar movimentações'>
          {FILTROS.map((item) => (
            <button
              key={item.valor}
              role='tab'
              aria-selected={filtro === item.valor}
              className={`extrato-filtro ${filtro === item.valor ? 'extrato-filtro-ativo' : ''}`}
              onClick={() => setFiltro(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      )}

      {grupos.length === 0 ? (
        <div className='extrato-vazio'>
          <MdReceiptLong size={40} />
          <p>Ainda não há registros aqui.</p>
          <span>Suas movimentações aparecerão nesta lista.</span>
        </div>
      ) : (
        grupos.map((grupo, indice) => (
          <section key={`${grupo.data}-${indice}`} className='extrato-grupo'>
            <h3 className='extrato-data'>{grupo.data}</h3>
            <ul className='extrato-lista'>
              {grupo.contas.map((conta) => {
                const despesa = conta.tipoConta === 'Despesa'
                return (
                  <li key={conta.id}>
                    <button className='extrato-item' onClick={() => onSelecionar(conta.id)}>
                      <span className={`extrato-icone ${despesa ? 'extrato-icone-despesa' : 'extrato-icone-receita'}`}>
                        {despesa ? <MdNorthEast /> : <MdSouthWest />}
                      </span>
                      <span className='extrato-info'>
                        <span className='extrato-descricao'>{conta.descricao}</span>
                        <span className='extrato-detalhe'>
                          {conta.tipoConta}
                          {despesa && Number(conta.parcela) > 1 && ` · ${conta.parcelaPaga || 0}/${conta.parcela} parcelas`}
                          {despesa && !conta.selected && (conta.responsavel ? ` · ${conta.responsavel} vai pagar` : ' · outra pessoa paga')}
                        </span>
                      </span>
                      <span className={`extrato-valor ${despesa ? (conta.selected ? 'valor-negativo' : 'extrato-valor-neutro') : 'valor-positivo'}`}>
                        {despesa ? '− ' : '+ '}
                        {formatarMoeda(conta.valorFormatado, ocultar)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

export default Extrato
