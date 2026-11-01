import { useCallback, useEffect, useRef, useState } from 'react'
import { formatarMoeda, juntarLista } from '../../utils/formatar'
import { formatarMes } from '../../utils/mes'
import { projetarDisponivel } from '../../utils/simulacao'
import './Projecao.css'

const PERIODOS = [3, 6, 9, 12]
const ALTURA = 240
const MARGEM = { topo: 16, direita: 24, base: 28, esquerda: 64 }
const LARGURA_PADRAO = 600
// Abaixo disso a sobra é considerada estável entre o primeiro e o último mês.
const LIMITE_ESTAVEL = 0.01

const SERIES = [
  { chave: 'sobra', rotulo: 'Sobra após as parcelas', classe: 'projecao-serie-sobra' },
  { chave: 'parcelas', rotulo: 'Parcelas do mês', classe: 'projecao-serie-parcelas' },
  { chave: 'renda', rotulo: 'Renda média', classe: 'projecao-serie-renda' },
]

const formatoEixo = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const formatoMesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })

function mesCurto(mes) {
  const [ano, numero] = mes.split('-').map(Number)
  return formatoMesCurto.format(new Date(ano, numero - 1, 1)).replace(' de ', '/').replace('.', '')
}

// Divisões "redondas" do eixo vertical (1, 2, 2,5 ou 5 × potência de 10).
function escalaVertical(minimo, maximo) {
  const bruto = (maximo - minimo) / 4 || 1
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((fator) => fator * potencia).find((valor) => valor >= bruto)
  const inicio = Math.floor(minimo / passo) * passo
  const fim = Math.ceil(maximo / passo) * passo
  const marcas = []
  for (let valor = inicio; valor <= fim + passo / 2; valor += passo) marcas.push(Math.round(valor * 100) / 100)
  return { inicio, fim, marcas }
}

function tendencia(pontos, renda, formatar) {
  const primeiro = pontos[0].sobra
  const ultimo = pontos.at(-1).sobra
  const diferenca = ultimo - primeiro
  const final = formatarMes(pontos.at(-1).mes).toLowerCase()
  if (Math.abs(diferenca) <= renda * LIMITE_ESTAVEL) return `A sobra fica estável em cerca de ${formatar(ultimo)} por mês até ${final}.`
  return diferenca > 0
    ? `A sobra irá aumentar ${formatar(diferenca)}: de ${formatar(primeiro)} que sobra atualmente irá para ${formatar(ultimo)} por mês em ${final}.`
    : `A sobra irá diminuir ${formatar(-diferenca)}: de ${formatar(primeiro)} que sobra atualmente irá para ${formatar(ultimo)} por mês em ${final}.`
}

function Projecao({ contas, mesAtual }) {
  const [periodo, setPeriodo] = useState(6)
  const [largura, setLargura] = useState(LARGURA_PADRAO)
  const [ativo, setAtivo] = useState(null)
  const grafico = useRef(null)

  // Mede a largura disponível para desenhar o SVG em pixels reais (textos sem distorção).
  const medir = useCallback((elemento) => {
    grafico.current = elemento
    if (!elemento) return undefined
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(entrada.contentRect.width, 280)))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  // No toque, a caixinha do mês continua aberta ao soltar o dedo e fecha ao tocar fora do gráfico.
  useEffect(() => {
    if (ativo === null) return undefined
    function fecharFora(event) {
      if (grafico.current && !grafico.current.contains(event.target)) setAtivo(null)
    }
    document.addEventListener('pointerdown', fecharFora)
    return () => document.removeEventListener('pointerdown', fecharFora)
  }, [ativo])

  const formatar = (valor) => formatarMoeda(valor)
  const { renda, mesesRenda, pontos } = projetarDisponivel(contas, mesAtual, periodo)

  const cabecalho = (
    <header className='projecao-cabecalho'>
      <div>
        <h2>Projeção dos próximos meses</h2>
        <p>Quanto sobra da renda média depois das parcelas e contas fixas de cada mês.</p>
      </div>
      <div className='projecao-periodos' role='radiogroup' aria-label='Período da projeção'>
        {PERIODOS.map((meses) => (
          <button
            key={meses}
            type='button'
            role='radio'
            aria-checked={periodo === meses}
            className={periodo === meses ? 'projecao-periodo-ativo' : ''}
            onClick={() => {
              setPeriodo(meses)
              setAtivo(null)
            }}
          >
            {meses} meses
          </button>
        ))}
      </div>
    </header>
  )

  if (renda === null) {
    return (
      <section className='projecao'>
        {cabecalho}
        <p className='projecao-vazio'>Sem receitas registradas em meses anteriores para estimar a renda média. Registre suas receitas para ver a projeção.</p>
      </section>
    )
  }

  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base
  const valores = pontos.flatMap((ponto) => [ponto.renda, ponto.parcelas, ponto.sobra])
  const escala = escalaVertical(Math.min(0, ...valores), Math.max(...valores))
  const x = (indice) => MARGEM.esquerda + (pontos.length === 1 ? larguraUtil / 2 : (indice / (pontos.length - 1)) * larguraUtil)
  const y = (valor) => MARGEM.topo + (1 - (valor - escala.inicio) / (escala.fim - escala.inicio)) * alturaUtil
  const caminho = (chave) => pontos.map((ponto, indice) => `${indice === 0 ? 'M' : 'L'}${x(indice)},${y(ponto[chave])}`).join(' ')
  // Sem espaço para todos os rótulos, mostra um mês sim, outro não, sempre com o primeiro e o
  // último; o vizinho do último sai para os dois não se sobreporem.
  const saltoRotulo = larguraUtil / pontos.length < 48 ? 2 : 1
  const mostrarRotulo = (indice) => indice === pontos.length - 1
    || (indice % saltoRotulo === 0 && !(saltoRotulo > 1 && indice === pontos.length - 2))
  const pontoAtivo = ativo !== null ? pontos[ativo] : null

  function apontar(event) {
    const caixa = event.currentTarget.getBoundingClientRect()
    const posicao = ((event.clientX - caixa.left) / caixa.width) * largura
    const indice = Math.round(((posicao - MARGEM.esquerda) / larguraUtil) * (pontos.length - 1))
    setAtivo(Math.min(Math.max(indice, 0), pontos.length - 1))
  }

  function navegar(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const passo = event.key === 'ArrowRight' ? 1 : -1
      setAtivo((atual) => Math.min(Math.max((atual ?? (passo > 0 ? -1 : pontos.length)) + passo, 0), pontos.length - 1))
    } else if (event.key === 'Escape') {
      setAtivo(null)
    }
  }

  return (
    <section className='projecao'>
      {cabecalho}

      <p className='projecao-resumo'>{tendencia(pontos, renda, formatar)}</p>

      <ul className='projecao-legenda'>
        {SERIES.map((serie) => (
          <li key={serie.chave}>
            <span className={`projecao-legenda-marca ${serie.classe}`} aria-hidden='true' />
            {serie.rotulo}
          </li>
        ))}
      </ul>

      <div className='projecao-grafico' ref={medir} style={{ height: ALTURA }}>
        <svg
          width={largura}
          height={ALTURA}
          role='img'
          aria-label={`Gráfico de linha da projeção de ${periodo} meses. ${tendencia(pontos, renda, formatar)} Use as setas para percorrer os meses ou veja a tabela abaixo.`}
          tabIndex={0}
          onPointerMove={apontar}
          onPointerDown={apontar}
          onPointerLeave={(event) => event.pointerType === 'mouse' && setAtivo(null)}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={navegar}
          onBlur={() => setAtivo(null)}
        >
          {escala.marcas.map((marca) => (
            <g key={marca}>
              <line className={marca === 0 ? 'projecao-zero' : 'projecao-grade'} x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(marca)} y2={y(marca)} />
              <text className='projecao-eixo' x={MARGEM.esquerda - 8} y={y(marca)} dy='0.32em' textAnchor='end'>{formatoEixo.format(marca)}</text>
            </g>
          ))}

          {pontos.map((ponto, indice) => mostrarRotulo(indice) && (
            <text key={ponto.mes} className='projecao-eixo' x={x(indice)} y={ALTURA - 8} textAnchor='middle'>{mesCurto(ponto.mes)}</text>
          ))}

          {pontoAtivo && <line className='projecao-cursor' x1={x(ativo)} x2={x(ativo)} y1={MARGEM.topo} y2={ALTURA - MARGEM.base} />}

          {SERIES.slice().reverse().map((serie) => (
            <path key={serie.chave} className={`projecao-linha ${serie.classe}`} d={caminho(serie.chave)} />
          ))}

          {pontos.map((ponto, indice) => (
            <circle key={ponto.mes} className='projecao-marcador projecao-serie-sobra' cx={x(indice)} cy={y(ponto.sobra)} r={ativo === indice ? 5 : 4} />
          ))}
          {pontoAtivo && <circle className='projecao-marcador projecao-serie-parcelas' cx={x(ativo)} cy={y(pontoAtivo.parcelas)} r={5} />}
        </svg>

        {pontoAtivo && (
          <div
            className='projecao-dica'
            role='status'
            style={{ left: Math.min(Math.max(x(ativo), 110), largura - 110), top: MARGEM.topo }}
          >
            <strong>{formatarMes(pontoAtivo.mes)}</strong>
            <dl>
              <div><dt>Renda média</dt><dd>{formatar(pontoAtivo.renda)}</dd></div>
              <div><dt>Parcelas do mês</dt><dd>− {formatar(pontoAtivo.parcelas)}</dd></div>
              <div className='projecao-dica-total'><dt>Sobra</dt><dd>{formatar(pontoAtivo.sobra)}</dd></div>
            </dl>
            {pontoAtivo.encerrados.length > 0 && (
              <small>Terminou no mês anterior: {juntarLista(pontoAtivo.encerrados.map((divida) => divida.descricao))}.</small>
            )}
          </div>
        )}
      </div>

      <p className='projecao-nota'>
        Renda média de {mesesRenda.length === 1 ? '1 mês anterior' : `${mesesRenda.length} meses anteriores`}.
        Gastos à vista futuros não entram na projeção.
      </p>

      <details className='projecao-tabela'>
        <summary>Ver em tabela</summary>
        <div className='projecao-tabela-rolagem'>
          <table>
            <thead>
              <tr>
                <th scope='col'>Mês</th>
                <th scope='col'>Renda média</th>
                <th scope='col'>Parcelas</th>
                <th scope='col'>Sobra</th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((ponto) => (
                <tr key={ponto.mes}>
                  <th scope='row'>{formatarMes(ponto.mes)}</th>
                  <td>{formatar(ponto.renda)}</td>
                  <td>{formatar(ponto.parcelas)}</td>
                  <td>{formatar(ponto.sobra)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

export default Projecao
