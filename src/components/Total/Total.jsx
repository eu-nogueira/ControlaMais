import { useSelector } from "react-redux";
import { useCallback, useMemo, useState } from "react";
import { MdCallMade, MdCallReceived, MdChevronRight } from "react-icons/md";
import { formatarDataISO, formatarMoeda, iniciais } from "../../utils/formatar";
import { ehContaFixa, estaQuitado, totalParcelasDe } from "../../utils/parcelas";
import { mesDoSaldo } from "../../utils/saldo";
import { PRIMEIRO_MES, deslocarMes, formatarMes, mesesEntre } from "../../utils/mes";
import useMesAtual from "../../hooks/useMesAtual";
import Modal from "../Modal/Modal";
import SeletorMes from "../SeletorMes/SeletorMes";
import "./Total.css";

// Despesas lançadas para ou por outra pessoa.
function ehContaEntrePessoas(conta) {
  return conta.tipoConta === "Despesa" && Boolean(conta.selected ? conta.anotarPara : conta.responsavel);
}

// Mês a que a despesa pertence: o do cadastro ou, se ela foi marcada para sair do saldo
// atual, o mês desse saldo (ex.: registrada em novembro, descontada do saldo de outubro).
const mesDeReferencia = mesDoSaldo;

// A despesa entra no seu mês de referência. Parcelados e contas fixas também entram,
// com o valor da parcela, em cada mês seguinte do parcelamento enquanto não forem quitados.
function entraNoMes(conta, mes) {
  const deslocamento = mesesEntre(mesDeReferencia(conta), mes);
  if (deslocamento === 0) return true;
  return !estaQuitado(conta) && deslocamento > 0 && deslocamento < totalParcelasDe(conta);
}

// Último mês com parcela prevista de um parcelamento em aberto. Contas fixas ficam de fora
// para não estender a navegação sem fim.
function ultimoMesDaConta(conta) {
  if (ehContaFixa(conta) || estaQuitado(conta)) return mesDeReferencia(conta);
  return deslocarMes(mesDeReferencia(conta), totalParcelasDe(conta) - 1);
}

// Mesmo critério usado nos totais: "pagar" = eu pago e anotei para a pessoa;
// "receber" = a pessoa paga a despesa por mim.
function contasDaPessoa(contas, pessoa, tipo) {
  return contas
    .filter((conta) => conta.tipoConta === "Despesa")
    .filter((conta) =>
      tipo === "pagar"
        ? conta.selected && conta.anotarPara === pessoa
        : !conta.selected && conta.responsavel === pessoa
    )
    .sort((a, b) => b.dataCadastro.localeCompare(a.dataCadastro));
}

function detalheConta(conta, mes, ocultar) {
  const parcelas = Number(conta.parcela) || 1;
  const parcelaDoMes = mesesEntre(mesDeReferencia(conta), mes) + 1;
  const doSaldoAnterior = mesDeReferencia(conta) !== conta.dataCadastro.slice(0, 7);
  return [
    `registrada em ${formatarDataISO(conta.dataCadastro)}`,
    doSaldoAnterior && `descontada do saldo de ${formatarMes(mesDeReferencia(conta)).toLowerCase()}`,
    ehContaFixa(conta)
      ? "conta fixa (valor mensal)"
      : parcelas > 1 &&
        `parcela ${parcelaDoMes} de ${parcelas} · ${parcelas}x de ${formatarMoeda(conta.valorFormatado, ocultar)} · ${conta.parcelaPaga || 0} de ${parcelas} pagas`,
    conta.cartao && `cartão ${conta.cartao}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function DetalhePessoa({ pessoa, tipo, contas, mes, pago, ocultar }) {
  const itens = contasDaPessoa(contas, pessoa, tipo);
  const total = itens.reduce((soma, conta) => soma + Number(conta.valorFormatado || 0), 0);
  const classeValor = tipo === "pagar" ? "valor-negativo" : "valor-positivo";

  return (
    <div className="pessoa-detalhe">
      <div className="pessoa-detalhe-total">
        <span>
          {tipo === "pagar"
            ? pago ? `Você pagou a ${pessoa}` : `Você deve a ${pessoa}`
            : pago ? `${pessoa} te pagou` : `${pessoa} te deve`}
        </span>
        <strong className={classeValor}>{formatarMoeda(total, ocultar)}</strong>
        <small>
          {itens.length} {itens.length === 1 ? "movimentação" : "movimentações"} em {formatarMes(mes)}. Parcelados e contas fixas entram com o valor da parcela em cada mês até serem quitados.
        </small>
      </div>

      <ul className="pessoa-detalhe-lista">
        {itens.map((conta) => (
          <li key={conta.id}>
            <div>
              <strong>{conta.descricao}</strong>
              <span>{detalheConta(conta, mes, ocultar)}</span>
            </div>
            <strong className={classeValor}>{formatarMoeda(conta.valorFormatado, ocultar)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListaPessoas({ titulo, itens, vazio, classeValor, ocultar, onSelecionar }) {
  return (
    <section className="total-lista">
      <h3>{titulo}</h3>

      {itens.length === 0 ? (
        <p className="total-lista-vazia">{vazio}</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <li key={item.pessoa} className="linha-pessoa">
              <button type="button" onClick={() => onSelecionar(item.pessoa)}>
                <span className="linha-pessoa-avatar" aria-hidden="true">
                  {iniciais(item.pessoa)}
                </span>
                <span className="linha-pessoa-nome">{item.pessoa}</span>
                <strong className={classeValor}>
                  {formatarMoeda(item.valor, ocultar)}
                </strong>
                <MdChevronRight size={20} className="linha-pessoa-seta" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Total({ ocultar }) {
  const contas = useSelector(
    (state) => state.extrato.contasExtrato
  );
  const fechamento = useSelector((state) => state.extrato.fechamento);
  const [pessoaAberta, setPessoaAberta] = useState(null);
  const [mesEscolhido, setMesEscolhido] = useState(null);
  const fecharPessoa = useCallback(() => setPessoaAberta(null), []);
  const mesAtual = useMesAtual();

  // A navegação vai do mês mais antigo com despesa registrada entre pessoas até o último
  // mês com parcela em aberto, sempre incluindo o mês atual.
  const contasEntrePessoas = contas.filter(ehContaEntrePessoas);
  const primeiroMes = [PRIMEIRO_MES, mesAtual, ...contasEntrePessoas.map(mesDeReferencia)].sort()[0];
  const ultimoMes = [mesAtual, ...contasEntrePessoas.map(ultimoMesDaConta)].sort().pop();
  const mesBase = mesEscolhido ?? mesAtual;
  const mes = mesBase < primeiroMes ? primeiroMes : mesBase > ultimoMes ? ultimoMes : mesBase;

  function navegarMes(quantidade) {
    const novoMes = deslocarMes(mes, quantidade);
    setMesEscolhido(novoMes === mesAtual ? null : novoMes);
  }

  // Meses até o último fechamento ("Contas do mês passado quitadas") já foram acertados.
  const pago = Boolean(fechamento) && mes <= fechamento.mes;

  const contasDoMes = useMemo(
    () => contas.filter((conta) => entraNoMes(conta, mes)),
    [contas, mes]
  );

  const resumo = useMemo(() => {
    const euDevo = {};
    const meDevem = {};

    contasDoMes
      .filter(ehContaEntrePessoas)
      .forEach((conta) => {
        const valor = Number(
          conta.valorFormatado || 0
        );

        if (conta.selected) {
          euDevo[conta.anotarPara] =
            (euDevo[conta.anotarPara] || 0) +
            valor;
        } else {
          meDevem[conta.responsavel] =
            (meDevem[conta.responsavel] || 0) +
            valor;
        }
      });

    return {
      euDevo: Object.entries(euDevo)
        .map(([pessoa, valor]) => ({
          pessoa,
          valor,
        }))
        .sort((a, b) => b.valor - a.valor),

      meDevem: Object.entries(meDevem)
        .map(([pessoa, valor]) => ({
          pessoa,
          valor,
        }))
        .sort((a, b) => b.valor - a.valor),
    };
  }, [contasDoMes]);

  const totalEuDevo = useMemo(
    () =>
      resumo.euDevo.reduce(
        (acc, item) => acc + item.valor,
        0
      ),
    [resumo]
  );

  const totalMeDevem = useMemo(
    () =>
      resumo.meDevem.reduce(
        (acc, item) => acc + item.valor,
        0
      ),
    [resumo]
  );

  const saldo = totalMeDevem - totalEuDevo;

  return (
    <div className="total-container">
      <SeletorMes
        mes={mes}
        primeiroMes={primeiroMes}
        ultimoMes={ultimoMes}
        onNavegar={navegarMes}
        legenda={pago ? "Pago" : "Em aberto"}
        legendaPositiva={pago}
      />

      <div className="total-balanco">
        <span>Balanço dos acertos</span>
        <strong className={saldo < 0 ? "valor-negativo" : "valor-positivo"}>
          {formatarMoeda(saldo, ocultar)}
        </strong>
      </div>

      <div className="cards-grid">
        <div className="card">
          <span className="card-icone card-icone-receber">
            <MdCallReceived />
          </span>
          <p className="card-rotulo">{pago ? "Recebido" : "A receber"}</p>
          <p className="valor valor-positivo">
            {formatarMoeda(totalMeDevem, ocultar)}
          </p>
        </div>

        <div className="card">
          <span className="card-icone card-icone-pagar">
            <MdCallMade />
          </span>
          <p className="card-rotulo">{pago ? "Pago" : "A pagar"}</p>
          <p className="valor valor-negativo">
            {formatarMoeda(totalEuDevo, ocultar)}
          </p>
        </div>
      </div>

      <div className="listas-grid">
        <ListaPessoas
          titulo={pago ? "Recebido por pessoa" : "A receber por pessoa"}
          itens={resumo.meDevem}
          vazio="Nenhum valor a receber neste mês."
          classeValor="valor-positivo"
          ocultar={ocultar}
          onSelecionar={(pessoa) => setPessoaAberta({ pessoa, tipo: "receber" })}
        />
        <ListaPessoas
          titulo={pago ? "Pago por pessoa" : "A pagar por pessoa"}
          itens={resumo.euDevo}
          vazio="Nenhum valor a ser pago neste mês."
          classeValor="valor-negativo"
          ocultar={ocultar}
          onSelecionar={(pessoa) => setPessoaAberta({ pessoa, tipo: "pagar" })}
        />
      </div>

      {pessoaAberta && (
        <Modal
          titulo={pessoaAberta.tipo === "pagar"
            ? pago ? `O que você pagou a ${pessoaAberta.pessoa}` : `O que você deve a ${pessoaAberta.pessoa}`
            : pago ? `O que ${pessoaAberta.pessoa} te pagou` : `O que ${pessoaAberta.pessoa} te deve`}
          onFechar={fecharPessoa}
        >
          <DetalhePessoa pessoa={pessoaAberta.pessoa} tipo={pessoaAberta.tipo} contas={contasDoMes} mes={mes} pago={pago} ocultar={ocultar} />
        </Modal>
      )}
    </div>
  );
}

export default Total;
