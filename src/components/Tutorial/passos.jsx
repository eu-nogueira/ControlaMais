import {
  MdAccountBalanceWallet, MdAdd, MdAndroid, MdAttachMoney, MdAutoAwesome, MdBalance, MdCalculate, MdCloudOff, MdCompareArrows, MdCreditCard, MdHome,
  MdInfoOutline, MdInsights, MdMic, MdNotificationsNone, MdPayment, MdPeopleAlt, MdPieChart, MdReceiptLong, MdSave, MdSavings, MdShield,
  MdShoppingCart, MdSwapHoriz, MdTaskAlt, MdTipsAndUpdates, MdTune, MdVisibility
} from 'react-icons/md'
import { MESES_RESERVA } from '../../utils/metas'

const ICONE = 26

// Passos usados no tutorial geral e também no tour de novidades.
const PASSO_MARCAO = {
  titulo: 'Marcão, seu copiloto',
  icone: <MdAutoAwesome size={ICONE} />,
  conteudo: (
    <>
      <p>Escreva do seu jeito, como <strong>"devo 98 reais pro Fulano do Habib's"</strong> ou <strong>"TV de 1.200 em 10x no Nubank"</strong>, e o Marcão monta o lançamento para você conferir e <strong>registrar</strong>.</p>
      <p><MdMic size={16} aria-hidden='true' /> Toque no <strong>microfone</strong> para falar em vez de escrever.</p>
      <ul>
        <li><strong>Vários de uma vez:</strong> "Uber 20 e mercado 150".</li>
        <li><strong>Corrigir antes de registrar:</strong> "muda o vencimento pra dia 10", "foram 3x", "foi no Nubank".</li>
        <li><strong>O que faltar</strong> ele pergunta; o que você não disser, como o vencimento, recebe um padrão e vira um aviso no sino para você conferir.</li>
      </ul>
      <p>Ele <strong>aprende com você</strong>: ensine "roxinho é o Nubank" ou "habib's é alimentação", e ele também aprende quando você corrige o tipo de despesa. Pergunte "o que você aprendeu?" para ver.</p>
    </>
  ),
}

const PASSO_PERGUNTAS = {
  titulo: 'Perguntas e dicas',
  icone: <MdTipsAndUpdates size={ICONE} />,
  conteudo: (
    <>
      <p>Pergunte ao Marcão, por exemplo:</p>
      <ul>
        <li>"Quanto gastei com alimentação?", "qual meu saldo?", "quanto a Ana me deve?", "o que vence essa semana?"</li>
        <li><strong>"Posso comprar uma TV de 2.000 em 10x?"</strong>: ele simula a compra nos próximos meses e diz se cabe ou quando caberia.</li>
        <li><strong>"Me dá dicas"</strong>: ele pergunta se você vai receber 13º, férias ou FGTS e analisa o saldo, a projeção, as parcelas e o extrato para sugerir o que fazer, com botões para simular ou criar uma meta.</li>
        <li>"Quais minhas assinaturas?" e "resumo do mês".</li>
      </ul>
      <p>As dicas são feitas a partir dos seus registros no app e não são recomendação de investimento.</p>
    </>
  ),
}

const PASSO_SEM_INTERNET = {
  titulo: 'Sem internet',
  icone: <MdCloudOff size={ICONE} />,
  conteudo: (
    <>
      <p>Sem conexão, você continua <strong>registrando, editando e excluindo movimentações</strong> e marcando parcelas pagas. Elas aparecem na hora, marcadas como <strong>aguardando envio</strong>, e são enviadas sozinhas quando a internet voltar.</p>
      <p>O app abre com os últimos dados salvos no aparelho. Para isso, mantenha <strong>"lembrar de mim"</strong> marcado no login: sem ele, o que estiver aguardando envio se perde ao fechar o app.</p>
      <p>Quitar o mês, cartões, metas e simulações precisam de internet.</p>
    </>
  ),
}

// Visão geral e rápida do app.
export const PASSOS_GERAL = [
  {
    titulo: 'Boas-vindas ao Controla+',
    icone: <MdHome size={ICONE} />,
    conteudo: (
      <>
        <p>Aqui você registra o que entra e o que sai da sua conta, acompanha parcelas, cartões e simula decisões antes de tomá-las. E conta com o <strong>Marcão</strong>, seu copiloto, para registrar por texto ou voz e pedir dicas.</p>
        <p>Este tour é rápido. Você pode revê-lo quando quiser em <strong>Minha conta</strong>.</p>
      </>
    ),
  },
  {
    titulo: 'Início',
    icone: <MdAttachMoney size={ICONE} />,
    conteudo: (
      <>
        <p>No topo fica o seu <strong>saldo</strong>. Logo abaixo, os atalhos para registrar receitas e despesas, acompanhar suas metas, ver seus cartões e fazer simulações.</p>
        <p>Use o ícone de <strong>olho</strong> <MdVisibility size={16} aria-hidden='true' /> no cabeçalho para esconder o saldo e a renda comprometida quando estiver em público.</p>
      </>
    ),
  },
  {
    titulo: 'Como funciona o saldo disponível',
    icone: <MdAccountBalanceWallet size={ICONE} />,
    conteudo: (
      <>
        <p>O saldo considera o <strong>salário que você vai receber no próximo dia de pagamento</strong>, reduzindo o que será pago com ele: fatura do cartão de crédito, boletos, parcelas e contas fixas.</p>
        <p><strong>Não registre compras no débito:</strong> esse dinheiro já saiu da sua conta e não sai do próximo salário.</p>
        <p>O que sobrar no fim do mês fica na conta para gastos no débito e <strong>não passa para o mês seguinte</strong>.</p>
        <p><strong>Exceção:</strong> dinheiro que você emprestou a outra pessoa pode ser registrado como despesa.</p>
        <p>Toque no <MdInfoOutline size={16} aria-hidden='true' /> ao lado do saldo para rever esta explicação.</p>
      </>
    ),
  },
  {
    titulo: 'Virada do mês',
    icone: <MdTaskAlt size={ICONE} />,
    conteudo: (
      <>
        <p>No começo do mês, o saldo continua sendo o do mês passado <strong>até você tocar em "Contas do mês passado quitadas"</strong>.</p>
        <p>Antes disso, ao registrar uma despesa do mês atual, você escolhe <strong>de onde descontar</strong>: do <strong>saldo atual</strong> ou do <strong>próximo salário</strong>. Essa escolha vale mais que o vencimento.</p>
        <p>Se deixar em "Pelo vencimento", <strong>o vencimento é obrigatório</strong> e decide de onde ela sai:</p>
        <ul>
          <li><strong>Vence neste mês:</strong> é descontada do saldo atual.</li>
          <li><strong>Vence depois:</strong> fica para o <strong>próximo salário</strong> e só é descontada depois de quitar o mês passado.</li>
        </ul>
        <p><strong>Vencimento a partir de dois meses à frente</strong> sai do saldo do mês anterior ao vencimento, em qualquer época: vencendo em 05/01, sai do saldo de dezembro e só aparece nele quando dezembro chegar.</p>
        <p>Ao quitar, o novo saldo desconta as <strong>parcelas a pagar do mês</strong> (as mesmas da aba Parcelas) e as despesas que ficaram para o próximo salário. Na aba <strong>Acertos</strong>, o mês quitado passa a aparecer como <strong>Pago</strong>.</p>
        <p>Até o próximo salário ser registrado, ele é estimado pela <strong>média salarial</strong>: a média das receitas com <strong>"salário" na descrição</strong> dos 3 últimos meses ou, se ainda não houver 3, a do último mês.</p>
        <p>Ao quitar, o <strong>Marcão mostra o resumo do mês</strong>: quanto sobrou, o que mais pesou, a comparação com o mês anterior, parcelas que terminaram e assinaturas que continuam sendo cobradas.</p>
        <p>Se sobrou dinheiro no mês quitado e você tem metas em andamento, o app pergunta uma vez se quer <strong>guardar parte da sobra</strong> em uma delas.</p>
      </>
    ),
  },
  {
    titulo: 'Registrar movimentações',
    icone: <MdAdd size={ICONE} />,
    conteudo: (
      <>
        <p>Toque no botão <strong>+</strong> e escolha <strong>Registrar manualmente</strong>, para preencher o formulário, ou <strong>Falar com o Marcão</strong>, para registrar escrevendo ou falando.</p>
        <p>Nas despesas você pode informar parcelas, marcar como conta fixa, indicar o cartão e se outra pessoa vai pagar. Ao digitar o nome de uma pessoa, o app sugere os nomes que você já usou. Lembre-se: compras no débito ficam de fora.</p>
      </>
    ),
  },
  PASSO_MARCAO,
  PASSO_PERGUNTAS,
  {
    titulo: 'Extrato',
    icone: <MdReceiptLong size={ICONE} />,
    conteudo: (
      <>
        <p>Veja as movimentações mês a mês. Filtre por receitas, despesas ou por uma <strong>data específica</strong>.</p>
        <p>Cada movimentação aparece na <strong>data em que foi registrada</strong>. Nos meses seguintes, parcelados e contas fixas ficam no grupo <strong>Parcelas e contas fixas do mês</strong>, no fim da lista, com o número da parcela e a data da compra.</p>
        <p>Toque em uma movimentação para ver os detalhes, editar ou excluir.</p>
      </>
    ),
  },
  {
    titulo: 'Parcelas, acertos e dashboards',
    icone: <MdPieChart size={ICONE} />,
    conteudo: (
      <ul>
        <li><MdCreditCard size={16} aria-hidden='true' /> <strong>Parcelas:</strong> quanto falta pagar e registro das parcelas pagas.</li>
        <li><MdPeopleAlt size={16} aria-hidden='true' /> <strong>Acertos:</strong> quanto você tem a receber e a pagar referente a outras pessoas, mês a mês.</li>
        <li><MdPieChart size={16} aria-hidden='true' /> <strong>Dashboards:</strong> seus gastos comparados com o mês anterior, para onde eles estão indo, quem está usando cada cartão e a projeção da sobra nos próximos meses. Cada despesa conta no mês do saldo de onde ela sai.</li>
        <li><MdPayment size={16} aria-hidden='true' /> <strong>Cartões:</strong> seus cartões e o que está em cada um.</li>
      </ul>
    ),
  },
  {
    titulo: 'Acertos entre pessoas',
    icone: <MdPeopleAlt size={ICONE} />,
    conteudo: (
      <>
        <p>Use as setas no topo para escolher o mês. Cada despesa entra no <strong>mês do saldo de onde ela sai</strong>: normalmente o do registro, ou o que você escolheu, ou o mês anterior a um vencimento distante.</p>
        <p>O mesmo nome escrito de jeitos diferentes, como "Nagano Store" e "nagano store", conta como <strong>uma pessoa só</strong>.</p>
        <p>Parcelados e contas fixas aparecem com o valor da parcela em cada mês seguinte, <strong>até serem quitados</strong>.</p>
        <p>Abaixo do mês aparece se ele está <strong>Em aberto</strong> ou <strong>Pago</strong>: vira Pago quando você toca em "Contas do mês passado quitadas". Toque em uma pessoa para ver as despesas daquele mês.</p>
      </>
    ),
  },
  {
    titulo: 'Metas e reservas',
    icone: <MdSavings size={ICONE} />,
    conteudo: (
      <>
        <p>Guarde a sobra de cada mês em três tipos:</p>
        <ul>
          <li><strong>Meta:</strong> objetivo com valor e prazo, como uma viagem. O app calcula quanto guardar por mês para chegar lá.</li>
          <li><strong>Reserva:</strong> dinheiro guardado sem prazo, como a reserva de emergência. O valor ideal sugerido é de {MESES_RESERVA} meses das suas despesas.</li>
          <li><strong>Meta dinâmica:</strong> o depósito aumenta um pouco a cada mês. Abra o <strong>planejamento</strong> para marcar cada mês como guardado, pausar ou encerrar.</li>
        </ul>
        <p>Use <strong>Guardar</strong> e <strong>Resgatar</strong> para registrar o que entra e sai. <strong>Guardar não altera o saldo disponível</strong>: o dinheiro vem da sobra que ficou na conta.</p>
        <p>Se uma meta não for alcançada no prazo no ritmo atual, o app pergunta se você quer recalculá-la.</p>
      </>
    ),
  },
  {
    titulo: 'Simulação',
    icone: <MdCalculate size={ICONE} />,
    conteudo: (
      <p>Vai pegar um empréstimo ou vai receber um dinheiro extra, como 13º ou Férias? A <strong>Simulação</strong> mostra o efeito nas suas parcelas antes de você decidir. Ela tem um tutorial próprio, mais completo.</p>
    ),
  },
  PASSO_SEM_INTERNET,
  {
    // Só aparece no navegador de aparelhos Android, quando há APK publicado.
    titulo: 'App para Android',
    icone: <MdAndroid size={ICONE} />,
    soAndroid: true,
    conteudo: (
      <>
        <p>Você também pode usar o Controla+ como <strong>app no seu Android</strong>, direto da tela inicial do celular.</p>
        <p>Para instalar, abra <strong>Minha conta</strong>, tocando no seu nome, e use <strong>Baixar app para Android</strong> na seção Ajuda.</p>
        <p>Se for pedido, permita instalar apps desta fonte.</p>
      </>
    ),
  },
  {
    titulo: 'Avisos e sua conta',
    icone: <MdNotificationsNone size={ICONE} />,
    conteudo: (
      <>
        <p>O <strong>sino</strong> avisa sobre:</p>
        <ul>
          <li>parcelas que vencem nos próximos dias ou já venceram;</li>
          <li>lançamentos do Marcão com campos preenchidos por padrão, para você conferir;</li>
          <li><strong>saldo negativo</strong> e meses com <strong>sobra negativa</strong> na projeção: toque no aviso para o Marcão sugerir o que fazer.</li>
        </ul>
        <p>Toque no seu nome para abrir <strong>Minha conta</strong>: lá você altera nome, senha, tema claro ou escuro e revê os tutoriais.</p>
      </>
    ),
  },
]

// Guia completo do módulo de simulações.
export const PASSOS_SIMULACAO = [
  {
    titulo: 'Para que serve a Simulação',
    icone: <MdCalculate size={ICONE} />,
    conteudo: (
      <>
        <p>Ela responde a perguntas como <strong>"vale a pena pegar um empréstimo para quitar minhas parcelas?"</strong> ou <strong>"qual a melhor forma de usar meu 13º?"</strong>.</p>
        <p>O app usa suas parcelas, contas fixas e saldo reais para projetar os próximos 12 meses.</p>
        <p><MdShield size={16} aria-hidden='true' /> <strong>Nada é alterado de verdade:</strong> simulações não mexem nas suas movimentações, parcelas nem saldo.</p>
      </>
    ),
  },
  {
    titulo: 'Escolha de onde vem o dinheiro',
    icone: <MdSwapHoriz size={ICONE} />,
    conteudo: (
      <>
        <p>No início da simulação, escolha entre:</p>
        <ul>
          <li><strong>Empréstimo:</strong> dinheiro que entra agora e é pago em parcelas, com juros.</li>
          <li><strong>Valor a receber:</strong> dinheiro seu que vai entrar, como 13º salário, FGTS, restituição do IR, férias, PLR ou outro valor.</li>
        </ul>
        <p>Os dois tipos funcionam de forma parecida, mas só o empréstimo recebe uma avaliação de vantajoso ou não.</p>
      </>
    ),
  },
  {
    titulo: 'Simulando um empréstimo',
    icone: <MdAttachMoney size={ICONE} />,
    conteudo: (
      <>
        <p>Informe o <strong>valor a contratar</strong>, o <strong>número de parcelas</strong> e o <strong>valor de cada parcela</strong>, como aparecem na proposta do banco.</p>
        <p>O app calcula o <strong>total a pagar</strong>, o <strong>custo adicional</strong> (quanto você paga a mais) e os <strong>juros equivalentes ao mês</strong>, para comparar propostas diferentes.</p>
      </>
    ),
  },
  {
    titulo: 'Simulando um valor a receber',
    icone: <MdTipsAndUpdates size={ICONE} />,
    conteudo: (
      <>
        <p>Escolha a <strong>origem</strong>, informe o <strong>valor</strong> e o <strong>mês em que ele entra</strong>, de agora até 11 meses à frente.</p>
        <p>Nas <strong>férias</strong>, você pode informar o valor ou usar <strong>Calcular para mim</strong>: com o salário bruto e os dias de férias (e, se quiser, dias vendidos e média de horas extras), o app estima <strong>aproximadamente</strong> quanto é livre para gastar, já que parte do recibo é salário adiantado que virá a menos no próximo pagamento.</p>
        <p>Até esse mês, suas parcelas continuam sendo cobradas normalmente. Quitar ou antecipar vale para as parcelas <strong>depois</strong> que o dinheiro entra; parcelamentos que terminam antes disso não podem ser escolhidos.</p>
      </>
    ),
  },
  {
    titulo: 'Compras com esse valor',
    icone: <MdShoppingCart size={ICONE} />,
    conteudo: (
      <>
        <p>No valor a receber, você pode separar uma parte para <strong>compras à vista</strong>. Exemplo: "meu 13º é R$ 1.500, vou gastar R$ 800 em um celular".</p>
        <p>O valor das compras sai primeiro; o que <strong>sobra</strong> fica disponível para quitar ou antecipar dívidas. Essas compras também não viram movimentações reais.</p>
      </>
    ),
  },
  {
    titulo: 'Seu orçamento mensal',
    icone: <MdBalance size={ICONE} />,
    conteudo: (
      <>
        <p>A <strong>renda mensal</strong> vem sugerida com a média das suas receitas dos últimos meses (ou com as deste mês, se ainda não houver meses anteriores). Confira e ajuste se precisar.</p>
        <p>Com ela, o app verifica se o seu saldo fica negativo em algum dos próximos meses. Sem a renda, essa verificação não é feita.</p>
        <p>O <strong>saldo disponível hoje</strong> já desconta as despesas e a parcela deste mês de cada parcelamento.</p>
      </>
    ),
  },
  {
    titulo: 'Quitar, antecipar ou manter',
    icone: <MdTune size={ICONE} />,
    conteudo: (
      <>
        <p>Para cada parcelamento e conta fixa, escolha o que fazer com o dinheiro:</p>
        <ul>
          <li><strong>Manter:</strong> nada muda.</li>
          <li><strong>Quitar:</strong> paga todas as parcelas futuras e a parcela some de vez.</li>
          <li><strong>Antecipar:</strong> paga as próximas parcelas (você escolhe quantas). Nesses meses ela não é cobrada, mas depois <strong>volta</strong>.</li>
        </ul>
        <p>Contas fixas, como o aluguel, não têm fim: só podem ser antecipadas. Se a loja oferecer <strong>desconto</strong> para quitar, informe-o; ao antecipar só uma parte, o desconto é proporcional.</p>
        <p>A barra <strong>Usado / Sobra</strong> mostra quanto do dinheiro já foi usado. Se passar do valor, ela avisa quanto excedeu.</p>
      </>
    ),
  },
  {
    titulo: 'Combinações sugeridas',
    icone: <MdInsights size={ICONE} />,
    conteudo: (
      <>
        <p>O app testa as combinações possíveis com o dinheiro disponível e mostra as <strong>3 melhores</strong>. Toque em <strong>Usar</strong> para aplicar uma e ajuste na lista, se quiser.</p>
        <ul>
          <li><strong>Empréstimo:</strong> prioriza liberar, já descontando a nova parcela, ao menos 30% do que você paga em parcelas por mês (15% se elas passam de R$ 1.000), sem deixar o saldo negativo.</li>
          <li><strong>Valor a receber:</strong> prioriza eliminar parcelas de vez, depois liberar mais por mês, e também sugere usar a sobra para antecipar parcelas.</li>
        </ul>
      </>
    ),
  },
  {
    titulo: 'Antes e depois',
    icone: <MdCompareArrows size={ICONE} />,
    conteudo: (
      <>
        <p>Compara, em linguagem direta:</p>
        <ul>
          <li><strong>Parcelas do mês:</strong> quanto você paga hoje e quanto passará a pagar. No valor a receber, a comparação é com o primeiro mês depois de o dinheiro entrar.</li>
          <li><strong>Total ainda a pagar:</strong> somando parcelamentos e, no empréstimo, todas as parcelas dele.</li>
        </ul>
        <p>Fique atento aos avisos de <strong>parcelas antecipadas que voltam</strong>: no empréstimo, elas podem se somar à parcela dele.</p>
      </>
    ),
  },
  {
    titulo: 'Resultado do empréstimo',
    icone: <MdBalance size={ICONE} />,
    conteudo: (
      <>
        <p>Só simulações de empréstimo recebem uma avaliação:</p>
        <ul>
          <li><strong>Vantajoso:</strong> atinge a meta de liberação e não há riscos.</li>
          <li><strong>Exige cautela:</strong> atinge a meta, mas há riscos, como parcelas que voltam ou mais renda comprometida.</li>
          <li><strong>Desvantajoso:</strong> não libera o suficiente por mês ou deixa o saldo negativo.</li>
          <li><strong>Dados insuficientes:</strong> falta informar a renda.</li>
          <li><strong>Valor insuficiente:</strong> as escolhas custam mais que o empréstimo.</li>
        </ul>
        <p>Abaixo aparecem os pontos positivos, negativos, riscos e limitações da análise. No <strong>valor a receber</strong> não há avaliação: o app mostra só os números e as combinações, e a decisão é sua.</p>
      </>
    ),
  },
  {
    titulo: 'Salvar simulações',
    icone: <MdSave size={ICONE} />,
    conteudo: (
      <>
        <p>Dê um nome ao cenário e toque em <strong>Salvar simulação</strong>. O resumo fica guardado com os valores do dia.</p>
        <p>Na aba <strong>Salvas</strong> você pode <strong>abrir</strong> para continuar editando, <strong>duplicar</strong> para testar uma variação e <strong>excluir</strong>. Ao editar uma salva, use <strong>Salvar alterações</strong> ou <strong>Salvar como nova</strong>.</p>
      </>
    ),
  },
  {
    titulo: 'Comparar cenários',
    icone: <MdCompareArrows size={ICONE} />,
    conteudo: (
      <>
        <p>Em <strong>Salvas</strong>, marque até <strong>3 simulações</strong> em "Comparar" para vê-las lado a lado com a opção de manter tudo como está.</p>
        <p>A comparação é <strong>recalculada com seus dados de hoje</strong>, por isso pode diferir do dia em que foram salvas. Entre os empréstimos, o app indica o melhor cenário, ou se é melhor não contratar.</p>
      </>
    ),
  },
  {
    titulo: 'Pronto para simular',
    icone: <MdCalculate size={ICONE} />,
    conteudo: (
      <>
        <p>Dica: crie mais de um cenário, por exemplo propostas de bancos diferentes, e compare antes de decidir.</p>
        <p>Nas dicas do Marcão, o botão <strong>Simular isso</strong> abre uma simulação já preenchida com a sugestão dele.</p>
        <p>Você pode rever este tutorial no botão <strong>Como funciona</strong> da Simulação ou em <strong>Minha conta</strong>.</p>
      </>
    ),
  },
]

// Tour de novidades: mostrado uma vez a quem já tinha visto o tutorial geral. Para uma próxima leva de
// novidades, troque a versão (e os passos): ela é a chave guardada no perfil como "visto".
export const VERSAO_NOVIDADES = 'novidades-2026-11'

export const PASSOS_NOVIDADES = [
  {
    titulo: 'Novidades no Controla+',
    icone: <MdAutoAwesome size={ICONE} />,
    conteudo: (
      <>
        <p>O app ganhou um copiloto, o <strong>Marcão</strong>, e passou a funcionar <strong>sem internet</strong>. Veja em poucos passos o que mudou.</p>
        <p>Você pode rever este tour quando quiser em <strong>Minha conta</strong>.</p>
      </>
    ),
  },
  PASSO_MARCAO,
  PASSO_PERGUNTAS,
  PASSO_SEM_INTERNET,
  {
    titulo: 'Outras melhorias',
    icone: <MdTaskAlt size={ICONE} />,
    conteudo: (
      <ul>
        <li><strong>Vencimento distante:</strong> despesa que vence a partir de dois meses à frente sai do saldo do mês anterior ao vencimento (vence 05/01, sai do saldo de dezembro).</li>
        <li><strong>Resumo do mês:</strong> ao quitar o mês, o Marcão mostra quanto sobrou e o que mais pesou.</li>
        <li><strong>Extrato:</strong> parcelas de compras anteriores ficam no grupo <strong>Parcelas e contas fixas do mês</strong>, abaixo das compras recentes.</li>
        <li><strong>Acertos:</strong> o mesmo nome escrito de jeitos diferentes conta como uma pessoa só.</li>
        <li><strong>Sino:</strong> avisa quando o saldo ou a sobra de algum mês da projeção fica negativo.</li>
        <li><strong>Reserva de emergência:</strong> o valor sugerido passou a ser de {MESES_RESERVA} meses das suas despesas.</li>
      </ul>
    ),
  },
]
