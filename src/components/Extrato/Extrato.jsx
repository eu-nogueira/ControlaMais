import { useState } from 'react'
import { useSelector } from 'react-redux'
import { MdChevronLeft, MdChevronRight, MdNorthEast, MdReceiptLong, MdSouthWest } from 'react-icons/md'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { PRIMEIRO_MES, deslocarMes, formatarMes } from '../../utils/mes'
import useMesAtual from '../../hooks/useMesAtual'
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
  const [mesEscolhido, setMesEscolhido] = useState(null)
  const mesAtual = useMesAtual()

  const ultimoMesComConta = contas.reduce((maior, conta) => {
    const mes = conta.dataCadastro.slice(0, 7)
    return mes > maior ? mes : maior
  }, mesAtual)
  const ultimoMes = ultimoMesComConta < PRIMEIRO_MES ? PRIMEIRO_MES : ultimoMesComConta
  const mesBase = mesEscolhido ?? mesAtual
  const mes = mesBase < PRIMEIRO_MES ? PRIMEIRO_MES : mesBase > ultimoMes ? ultimoMes : mesBase

  function navegarMes(quantidade) {
    const novoMes = deslocarMes(mes, quantidade)
    setMesEscolhido(novoMes === mesAtual ? null : novoMes)
  }

  const contasFiltradas = [...contas]
    .reverse()
    .filter((conta) => !comFiltro || conta.dataCadastro.slice(0, 7) === mes)
    .filter((conta) => filtro === 'Todos' || conta.tipoConta === filtro)
    .slice(0, limite)

  const grupos = agruparPorData(contasFiltradas)

  return (
    <div className='extrato'>
      {comFiltro && (
        <div className='extrato-meses'>
          <button onClick={() => navegarMes(-1)} disabled={mes <= PRIMEIRO_MES} aria-label='Mês anterior'>
            <MdChevronLeft size={24} />
          </button>
          <strong aria-live='polite'>{formatarMes(mes)}</strong>
          <button onClick={() => navegarMes(1)} disabled={mes >= ultimoMes} aria-label='Próximo mês'>
            <MdChevronRight size={24} />
          </button>
        </div>
      )}

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
          <p>{comFiltro ? `Nenhuma movimentação em ${formatarMes(mes).toLowerCase()}.` : 'Ainda não há registros aqui.'}</p>
          <span>Suas movimentações aparecerão nesta lista.</span>
        </div>
      ) : (
        grupos.map((grupo, indice) => (
          <section key={`${grupo.data}-${indice}`} className='extrato-grupo'>
            <h3 className='extrato-data'>{formatarDataISO(grupo.data)}</h3>
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
