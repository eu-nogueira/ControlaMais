import { useSelector } from "react-redux";
import { useCallback, useMemo, useState } from "react";
import { MdCallMade, MdCallReceived, MdChevronRight } from "react-icons/md";
import { formatarDataISO, formatarMoeda, iniciais } from "../../utils/formatar";
import { ehContaFixa } from "../../utils/parcelas";
import Modal from "../Modal/Modal";
import "./Total.css";

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

function detalheConta(conta, ocultar) {
  const parcelas = Number(conta.parcela) || 1;
  return [
    formatarDataISO(conta.dataCadastro),
    ehContaFixa(conta)
      ? "conta fixa (valor mensal)"
      : parcelas > 1 &&
        `${parcelas}x de ${formatarMoeda(conta.valorFormatado, ocultar)} · ${conta.parcelaPaga || 0} de ${parcelas} pagas`,
    conta.cartao && `cartão ${conta.cartao}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function DetalhePessoa({ pessoa, tipo, contas, ocultar }) {
  const itens = contasDaPessoa(contas, pessoa, tipo);
  const total = itens.reduce((soma, conta) => soma + Number(conta.valorFormatado || 0), 0);
  const classeValor = tipo === "pagar" ? "valor-negativo" : "valor-positivo";

  return (
    <div className="pessoa-detalhe">
      <div className="pessoa-detalhe-total">
        <span>{tipo === "pagar" ? `Você deve a ${pessoa}` : `${pessoa} te deve`}</span>
        <strong className={classeValor}>{formatarMoeda(total, ocultar)}</strong>
        <small>
          {itens.length} {itens.length === 1 ? "movimentação" : "movimentações"}. Parcelados e contas fixas contam o valor de uma parcela, como no total da aba.
        </small>
      </div>

      <ul className="pessoa-detalhe-lista">
        {itens.map((conta) => (
          <li key={conta.id}>
            <div>
              <strong>{conta.descricao}</strong>
              <span>{detalheConta(conta, ocultar)}</span>
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
  const [pessoaAberta, setPessoaAberta] = useState(null);
  const fecharPessoa = useCallback(() => setPessoaAberta(null), []);

  const resumo = useMemo(() => {
    const euDevo = {};
    const meDevem = {};

    contas
      .filter(
        (conta) =>
          conta.tipoConta === "Despesa" &&
          (conta.selected
            ? conta.anotarPara
            : conta.responsavel)
      )
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
  }, [contas]);

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
      <div className="total-balanco">
        <span>Balanço entre pessoas</span>
        <strong className={saldo < 0 ? "valor-negativo" : "valor-positivo"}>
          {formatarMoeda(saldo, ocultar)}
        </strong>
      </div>

      <div className="cards-grid">
        <div className="card">
          <span className="card-icone card-icone-receber">
            <MdCallReceived />
          </span>
          <p className="card-rotulo">A receber</p>
          <p className="valor valor-positivo">
            {formatarMoeda(totalMeDevem, ocultar)}
          </p>
        </div>

        <div className="card">
          <span className="card-icone card-icone-pagar">
            <MdCallMade />
          </span>
          <p className="card-rotulo">A pagar</p>
          <p className="valor valor-negativo">
            {formatarMoeda(totalEuDevo, ocultar)}
          </p>
        </div>
      </div>

      <div className="listas-grid">
        <ListaPessoas
          titulo="A receber por pessoa"
          itens={resumo.meDevem}
          vazio="Nenhum valor a receber."
          classeValor="valor-positivo"
          ocultar={ocultar}
          onSelecionar={(pessoa) => setPessoaAberta({ pessoa, tipo: "receber" })}
        />
        <ListaPessoas
          titulo="A pagar por pessoa"
          itens={resumo.euDevo}
          vazio="Nenhum valor a ser pago."
          classeValor="valor-negativo"
          ocultar={ocultar}
          onSelecionar={(pessoa) => setPessoaAberta({ pessoa, tipo: "pagar" })}
        />
      </div>

      {pessoaAberta && (
        <Modal
          titulo={pessoaAberta.tipo === "pagar" ? `O que você deve a ${pessoaAberta.pessoa}` : `O que ${pessoaAberta.pessoa} te deve`}
          onFechar={fecharPessoa}
        >
          <DetalhePessoa pessoa={pessoaAberta.pessoa} tipo={pessoaAberta.tipo} contas={contas} ocultar={ocultar} />
        </Modal>
      )}
    </div>
  );
}

export default Total;
