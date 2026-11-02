import { MdTrendingDown, MdTrendingFlat, MdTrendingUp } from 'react-icons/md'
import { compararComMesAnterior } from '../../utils/dashboard'
import { formatarMoeda } from '../../utils/formatar'
import { formatarMes } from '../../utils/mes'
import './ComparacaoMeses.css'

const nomeMes = (mes) => formatarMes(mes).replace(/ de \d{4}$/, '')

// Diferença do mês em relação ao anterior. Gastar mais aparece como negativo.
function Variacao({ atual, anterior, mesAnterior, ocultar, compacta = false }) {
  const diferenca = atual - anterior
  if (Math.abs(diferenca) < 0.01) {
    return (
      <p className='comparacao-variacao'>
        <MdTrendingFlat size={18} aria-hidden='true' />
        {compacta ? 'Igual' : `Igual a ${nomeMes(mesAnterior).toLowerCase()}`}
      </p>
    )
  }

  const subiu = diferenca > 0
  const percentual = anterior > 0 ? ` (${subiu ? '+' : '−'}${Math.abs((diferenca / anterior) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)` : ''
  const Icone = subiu ? MdTrendingUp : MdTrendingDown

  return (
    <p className={`comparacao-variacao ${subiu ? 'valor-negativo' : 'valor-positivo'}`}>
      <Icone size={18} aria-hidden='true' />
      {formatarMoeda(Math.abs(diferenca), ocultar)} {subiu ? 'a mais' : 'a menos'}
      {!compacta && ` que ${nomeMes(mesAnterior).toLowerCase()}`}
      {!ocultar && percentual}
    </p>
  )
}

function ComparacaoMeses({ contas, mes, ocultar }) {
  const { mesAnterior, atual, anterior, tipos } = compararComMesAnterior(contas, mes)
  const maior = Math.max(...tipos.flatMap((tipo) => [tipo.atual, tipo.anterior]), 0)
  // O maior valor ocupa 75% da linha, deixando espaço para o valor ao lado da barra.
  const largura = (valor) => `${maior > 0 ? (valor / maior) * 75 : 0}%`

  return (
    <section className='comparacao' aria-labelledby='comparacao-titulo'>
      <header>
        <h2 id='comparacao-titulo'>{nomeMes(mes)} x {nomeMes(mesAnterior)}</h2>
        <p>Despesas que você paga, com parcelados contando a parcela de cada mês.</p>
      </header>

      <div className='comparacao-totais'>
        <div>
          <span>{nomeMes(mes)}</span>
          <strong>{formatarMoeda(atual, ocultar)}</strong>
        </div>
        <div>
          <span>{nomeMes(mesAnterior)}</span>
          <strong className='comparacao-total-anterior'>{formatarMoeda(anterior, ocultar)}</strong>
        </div>
      </div>
      <Variacao atual={atual} anterior={anterior} mesAnterior={mesAnterior} ocultar={ocultar} />

      {tipos.length === 0 ? (
        <p className='comparacao-vazio'>Nenhuma despesa nestes dois meses.</p>
      ) : (
        <>
          <ul className='comparacao-legenda' aria-hidden='true'>
            <li><span className='comparacao-cor comparacao-cor-atual' />{nomeMes(mes)}</li>
            <li><span className='comparacao-cor comparacao-cor-anterior' />{nomeMes(mesAnterior)}</li>
          </ul>

          <ul className='comparacao-tipos'>
            {tipos.map((tipo) => (
              <li
                key={tipo.chave}
                aria-label={`${tipo.rotulo}: ${formatarMoeda(tipo.atual, ocultar)} em ${nomeMes(mes)} e ${formatarMoeda(tipo.anterior, ocultar)} em ${nomeMes(mesAnterior)}`}
              >
                <div className='comparacao-tipo-cabecalho'>
                  <span>{tipo.rotulo}</span>
                  <Variacao atual={tipo.atual} anterior={tipo.anterior} mesAnterior={mesAnterior} ocultar={ocultar} compacta />
                </div>
                <div className='comparacao-barra' aria-hidden='true'>
                  <span className='comparacao-barra-atual' style={{ width: largura(tipo.atual) }} />
                  <small>{formatarMoeda(tipo.atual, ocultar)}</small>
                </div>
                <div className='comparacao-barra' aria-hidden='true'>
                  <span className='comparacao-barra-anterior' style={{ width: largura(tipo.anterior) }} />
                  <small>{formatarMoeda(tipo.anterior, ocultar)}</small>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default ComparacaoMeses
