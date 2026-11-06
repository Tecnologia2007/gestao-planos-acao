import { FormularioAuditoria } from "@/componentes/formularios";
import { exigirContexto } from "@/servidor/sessao";

export const metadata = { title: "Nova auditoria" };

export default async function NovaAuditoria() {
  await exigirContexto({ escrever: true });
  return (
    <>
      <h1>Nova auditoria</h1>
      <p className="sub">Registre o objetivo, o escopo e o critério antes das constatações. Notas sigilosas ficam cifradas.</p>
      <div className="painel">
        <FormularioAuditoria />
      </div>
    </>
  );
}
