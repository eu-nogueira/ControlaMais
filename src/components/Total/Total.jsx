import { useSelector } from "react-redux";
import { useMemo } from "react";
import { MdCallMade, MdCallReceived } from "react-icons/md";
import { formatarMoeda, iniciais } from "../../utils/formatar";
import "./Total.css";

function ListaPessoas({ titulo, itens, vazio, classeValor, ocultar }) {
  return (
    <section className="total-lista">
      <h3>{titulo}</h3>

      {itens.length === 0 ? (
        <p className="total-lista-vazia">{vazio}</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <li key={item.pessoa} className="linha-pessoa">
              <span className="linha-pessoa-avatar" aria-hidden="true">
                {iniciais(item.pessoa)}
              </span>
              <span className="linha-pessoa-nome">{item.pessoa}</span>
              <strong className={classeValor}>
                {formatarMoeda(item.valor, ocultar)}
              </strong>
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
        />
        <ListaPessoas
          titulo="A pagar por pessoa"
          itens={resumo.euDevo}
          vazio="Nenhum valor a ser pago."
          classeValor="valor-negativo"
          ocultar={ocultar}
        />
      </div>
    </div>
  );
}

export default Total;
