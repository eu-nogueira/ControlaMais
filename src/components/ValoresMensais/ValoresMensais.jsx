import { MdExpandMore } from 'react-icons/md'
import { formatarMoeda } from '../../utils/formatar'
import { deslocarMes, formatarMes } from '../../utils/mes'
import { planejarMetaDinamica } from '../../utils/metas'
import './ValoresMensais.css'

// Mostra até este número de meses; os demais são resumidos em uma linha.
const MESES_VISIVEIS = 12

const rotuloMes = (mes) => formatarMes(mes).replace(/ de (\d{4})$/, '/$1').toLowerCase()

// Lista recolhível com quanto guardar em cada mês de uma meta dinâmica (usada ao criar e editar).
function ValoresMensais({ valorInicial, incremento, duracao, inicio }) {
  const plano = planejarMetaDinamica(valorInicial, incremento, duracao)
  const visiveis = Array.from({ length: Math.min(duracao, MESES_VISIVEIS) }, (_, indice) => ({
    numero: indice + 1,
    mes: deslocarMes(inicio, indice),
    valor: plano.valorDoMes(indice + 1)
  }))
  const restantes = duracao - visiveis.length

  return (
    <details className='valores-mensais'>
      <summary>
        <span>Quanto guardar em cada mês</span>
        <MdExpandMore size={22} className='valores-mensais-seta' aria-hidden='true' />
      </summary>
      <ol>
        {visiveis.map((item) => (
          <li key={item.numero}>
            <span className='valores-mensais-numero'>{item.numero}</span>
            <span className='valores-mensais-mes'>{rotuloMes(item.mes)}</span>
            <strong>{formatarMoeda(item.valor)}</strong>
          </li>
        ))}
      </ol>
      {restantes > 0 && (
        <p className='valores-mensais-mais'>
          + {restantes} {restantes === 1 ? 'mês' : 'meses'}
          {incremento > 0
            ? <> seguindo o mesmo formato: mais {formatarMoeda(incremento)} a cada mês, até {formatarMoeda(plano.ultimo)} no mês {duracao}.</>
            : <> com o mesmo valor de {formatarMoeda(valorInicial)} por mês.</>}
        </p>
      )}
    </details>
  )
}

export default ValoresMensais
