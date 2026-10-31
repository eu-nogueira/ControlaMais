import { useState } from 'react'
import { useSelector } from 'react-redux'
import { MdChevronLeft, MdChevronRight, MdNorthEast, MdReceiptLong, MdSouthWest } from 'react-icons/md'
import { formatarDataISO, formatarMoeda } from '../../utils/formatar'
import { PRIMEIRO_MES, deslocarData, deslocarMes, formatarMes, mesesEntre } from '../../utils/mes'
import { ultimoMesComDespesa } from '../../utils/dashboard'
import { ehContaFixa, totalParcelasDe } from '../../utils/parcelas'
import useMesAtual from '../../hooks/useMesAtual'
import './Extrato.css'

const FILTROS = [
  { valor: 'Todos', rotulo: 'Todos' },
  { valor: 'Receita', rotulo: 'Receitas' },
  { valor: 'Despesa', rotulo: 'Despesas' },
]

function agruparPorData(itens) {
  return itens.reduce((grupos, item) => {
    const ultimoGrupo = grupos[grupos.length - 1]
    if (ultimoGrupo && ultimoGrupo.data === item.data) {
      ultimoGrupo.itens.push(item)
    } else {
      grupos.push({ data: item.data, itens: [item] })
    }
    return grupos
  }, [])
}

// Parcelados aparecem em todos os meses do parcelamento, no mesmo dia da compra,
// com o número da parcela daquele mês; contas fixas, em todos os meses a partir do cadastro;
// as demais movimentações só no mês em que foram feitas.
function itensDoMes(contas, mes) {
  return contas
    .map((conta) => {
      const parcelas = totalParcelasDe(conta)
      const deslocamento = mesesEntre(conta.dataCadastro.slice(0, 7), mes)
      if (deslocamento < 0 || deslocamento >= parcelas) return null
      return {
        conta,
        data: deslocarData(conta.dataCadastro, deslocamento),
        numeroParcela: parcelas > 1 ? deslocamento + 1 : null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.data.localeCompare(a.data))
}

function Extrato({ ocultar, limite, comFiltro, onSelecionar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato) || []
  const [filtro, setFiltro] = useState('Todos')
  const [mesEscolhido, setMesEscolhido] = useState(null)
  const mesAtual = useMesAtual()

  // Inclui os meses futuros que ainda têm parcela prevista.
  const ultimoMesComConta = contas.reduce((maior, conta) => {
    const mes = conta.dataCadastro.slice(0, 7)
    return mes > maior ? mes : maior
  }, [mesAtual, ultimoMesComDespesa(contas)].sort().pop())
  const ultimoMes = ultimoMesComConta < PRIMEIRO_MES ? PRIMEIRO_MES : ultimoMesComConta
  const mesBase = mesEscolhido ?? mesAtual
  const mes = mesBase < PRIMEIRO_MES ? PRIMEIRO_MES : mesBase > ultimoMes ? ultimoMes : mesBase

  function navegarMes(quantidade) {
    const novoMes = deslocarMes(mes, quantidade)
    setMesEscolhido(novoMes === mesAtual ? null : novoMes)
  }

  const itens = comFiltro
    ? itensDoMes(contas, mes)
    : [...contas].reverse().map((conta) => ({ conta, data: conta.dataCadastro, numeroParcela: null }))

  const itensFiltrados = itens
    .filter(({ conta }) => filtro === 'Todos' || conta.tipoConta === filtro)
    .slice(0, limite)

  const grupos = agruparPorData(itensFiltrados)

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
              {grupo.itens.map(({ conta, numeroParcela }) => {
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
                          {ehContaFixa(conta) && ' · conta fixa'}
                          {despesa && !ehContaFixa(conta) && numeroParcela && ` · parcela ${numeroParcela} de ${conta.parcela}`}
                          {despesa && !ehContaFixa(conta) && !numeroParcela && Number(conta.parcela) > 1 && ` · ${conta.parcelaPaga || 0}/${conta.parcela} parcelas`}
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
