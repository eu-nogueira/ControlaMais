import { useSelector } from "react-redux";
import { useMemo } from "react";
import "./Total.css";

function Total() {
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
          conta.anotarPara
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

  const formatarMoeda = (valor) =>
    valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div className="total-container">
      <h1>Valores totais</h1>

      <div className="cards-grid">
        <div className="card">
          <h3>Valor total a ser recebido</h3>

          <p className="valor valor-positivo">
            {formatarMoeda(totalMeDevem)}
          </p>
        </div>

        <div className="card">
          <h3>Valor total a ser pago</h3>
          <p className="valor valor-negativo">
            {formatarMoeda(totalEuDevo)}
          </p>
        </div>
      </div>

      <div className="listas-grid">
        <div className="card">
          <h2>Valores a receber(Por pessoa)</h2>

          {resumo.meDevem.length === 0 ? (
            <p>Nenhum valor a receber.</p>
          ) : (
            resumo.meDevem.map((item) => (
              <div
                key={item.pessoa}
                className="linha-pessoa"
              >
                <span>{item.pessoa}</span>

                <strong className="valor-positivo">
                  {formatarMoeda(
                    item.valor
                  )}
                </strong>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>Valor a ser pago(por pessoa)</h2>

          {resumo.euDevo.length === 0 ? (
            <p>Nenhum valor a ser pago.</p>
          ) : (
            resumo.euDevo.map((item) => (
              <div
                key={item.pessoa}
                className="linha-pessoa"
              >
                <span>{item.pessoa}</span>

                <strong className="valor-negativo">
                  {formatarMoeda(
                    item.valor
                  )}
                </strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Total;