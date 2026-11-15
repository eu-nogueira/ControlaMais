import { useSelector } from 'react-redux'
import { descreverAssinaturas, detectarAssinaturas, resumirMes } from '../../utils/consultoria'
import { deslocarMes } from '../../utils/mes'
import '../Copiloto/Copiloto.css'
import './ResumoMes.css'

// Resumo automático do Marcão ao quitar o mês: quanto sobrou, o que mais pesou, comparação com o mês
// anterior, parcelas que terminaram e, se houver, as assinaturas que continuam sendo cobradas.
function ResumoMes({ mes, onConversar, onFechar }) {
  const contas = useSelector((state) => state.extrato.contasExtrato)
  const fechamento = useSelector((state) => state.extrato.fechamento)
  const linhas = resumirMes(contas, mes, fechamento)
  const assinaturas = detectarAssinaturas(contas, deslocarMes(mes, 1))

  return (
    <div className='resumo-mes'>
      <div className='resumo-mes-marcao'>
        <span className='marcao-avatar' aria-hidden='true'>M</span>
        <p>Fechamos o mês! Aqui vai o resumo:</p>
      </div>

      <ul>
        {linhas.map((linha) => <li key={linha}>{linha}</li>)}
        {assinaturas.length > 0 && <li>{descreverAssinaturas(assinaturas)}</li>}
      </ul>

      <div className='form-acao'>
        <button type='button' className='botao botao-primario' onClick={onConversar}>Pedir dicas ao Marcão</button>
        <button type='button' className='botao botao-secundario' onClick={onFechar}>Fechar</button>
      </div>
    </div>
  )
}

export default ResumoMes
