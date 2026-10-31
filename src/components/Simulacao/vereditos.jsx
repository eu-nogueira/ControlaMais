import { MdCancel, MdCheckCircle, MdInfoOutline, MdWarningAmber } from 'react-icons/md'

// Rótulo e ícone de cada resultado da análise, usados no editor e nas simulações salvas.
export const VEREDITOS = {
  vantajoso: { rotulo: 'Vantajoso', icone: <MdCheckCircle size={24} /> },
  desvantajoso: { rotulo: 'Desvantajoso', icone: <MdCancel size={24} /> },
  cautela: { rotulo: 'Exige cautela', icone: <MdWarningAmber size={24} /> },
  insuficiente: { rotulo: 'Dados insuficientes', icone: <MdInfoOutline size={24} /> },
  invalido: { rotulo: 'Valor insuficiente', icone: <MdInfoOutline size={24} /> },
}
