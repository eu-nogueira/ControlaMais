import { useState } from 'react'
import { formatarMoeda } from '../../utils/formatar'
import './GraficoPizza.css'

const TAMANHO = 160
const RAIO = 60
const ESPESSURA = 24
const CIRCUNFERENCIA = 2 * Math.PI * RAIO
const ESPACO = 2

const formatarPercentual = (valor) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

function GraficoPizza({ titulo, descricao, fatias, vazio, rodape, ocultar }) {
  const [ativa, setAtiva] = useState(null)
  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0)
  const fatiaAtiva = fatias.find((fatia) => fatia.chave === ativa)
  const percentual = (valor) => (total > 0 ? (valor / total) * 100 : 0)
  const legenda = [...fatias].sort((a, b) => b.valor - a.valor)

  const arcos = fatias.map((fatia, indice) => {
    const comprimento = (fatia.valor / total) * CIRCUNFERENCIA
    const anteriores = fatias.slice(0, indice).reduce((soma, anterior) => soma + anterior.valor, 0)
    return {
      fatia,
      visivel: Math.max(comprimento - (fatias.length > 1 ? ESPACO : 0), 1),
      inicio: (anteriores / total) * CIRCUNFERENCIA
    }
  })

  function alternar(chave) {
    setAtiva((atual) => (atual === chave ? null : chave))
  }

  return (
    <section className='grafico-pizza'>
      <header>
        <h2>{titulo}</h2>
        {descricao && <p>{descricao}</p>}
      </header>

      {fatias.length === 0 ? (
        <p className='grafico-pizza-vazio'>{vazio}</p>
      ) : (
        <div className='grafico-pizza-corpo'>
          <div className='grafico-pizza-anel'>
            <svg viewBox={`0 0 ${TAMANHO} ${TAMANHO}`} role='img' aria-label={`${titulo}: gráfico de pizza. Valores na lista ao lado.`}>
              <g transform={`rotate(-90 ${TAMANHO / 2} ${TAMANHO / 2})`}>
                {arcos.map(({ fatia, visivel, inicio }) => (
                  <circle
                    key={fatia.chave}
                    className={`grafico-pizza-fatia ${ativa && ativa !== fatia.chave ? 'grafico-pizza-fatia-apagada' : ''}`}
                    cx={TAMANHO / 2}
                    cy={TAMANHO / 2}
                    r={RAIO}
                    fill='none'
                    stroke={fatia.cor}
                    strokeWidth={fatia.chave === ativa ? ESPESSURA + 6 : ESPESSURA}
                    strokeDasharray={`${visivel} ${CIRCUNFERENCIA - visivel}`}
                    strokeDashoffset={-inicio}
                    onMouseEnter={() => setAtiva(fatia.chave)}
                    onMouseLeave={() => setAtiva(null)}
                    onClick={() => alternar(fatia.chave)}
                  />
                ))}
              </g>
            </svg>
            <div className='grafico-pizza-centro' aria-live='polite'>
              <span>{fatiaAtiva ? fatiaAtiva.rotulo : 'Total'}</span>
              <strong>{formatarMoeda(fatiaAtiva ? fatiaAtiva.valor : total, ocultar)}</strong>
              {fatiaAtiva && <small>{formatarPercentual(percentual(fatiaAtiva.valor))}</small>}
            </div>
          </div>

          <ul className='grafico-pizza-legenda'>
            {legenda.map((fatia) => (
              <li key={fatia.chave}>
                <button
                  className={fatia.chave === ativa ? 'grafico-pizza-legenda-ativa' : ''}
                  aria-pressed={fatia.chave === ativa}
                  onClick={() => alternar(fatia.chave)}
                  onMouseEnter={() => setAtiva(fatia.chave)}
                  onMouseLeave={() => setAtiva(null)}
                >
                  <span className='grafico-pizza-cor' style={{ background: fatia.cor }} aria-hidden='true' />
                  <span className='grafico-pizza-rotulo'>{fatia.rotulo}</span>
                  <span className='grafico-pizza-valor'>
                    <strong>{formatarMoeda(fatia.valor, ocultar)}</strong>
                    <small>{formatarPercentual(percentual(fatia.valor))}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rodape && <p className='grafico-pizza-rodape'>{rodape}</p>}
    </section>
  )
}

export default GraficoPizza
