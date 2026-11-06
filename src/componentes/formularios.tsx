"use client";

import { useActionState } from "react";
import { atualizarAuditoria, criarAuditoria, salvarConstatacao, salvarRecomendacao } from "@/servidor/acoes/auditorias";
import { salvarEvidencia, salvarPlano, salvarValidacao } from "@/servidor/acoes/planos";
import { atribuirAuditoria, atualizarAcesso, convidarUsuario, revogarAtribuicao } from "@/servidor/acoes/usuarios";
import type { EstadoFormulario } from "@/tipos";

const inicial: EstadoFormulario = {};

export function Mensagem({ estado }: { estado: EstadoFormulario }) {
  if (estado.erro) return <p className="erro" role="alert">{estado.erro}</p>;
  if (!estado.sucesso) return null;
  return (
    <div className="ok" role="status">
      <p>{estado.sucesso}</p>
      {estado.linkConvite ? (
        <p>
          Senha temporária: <span className="senha">{estado.linkConvite}</span>
        </p>
      ) : null}
    </div>
  );
}

function Botao({ children }: { children: React.ReactNode }) {
  return (
    <button className="botao" type="submit">
      {children}
    </button>
  );
}

export function FormularioAuditoria({
  auditoria,
  notas,
  preservarNotas,
}: {
  auditoria?: {
    id: string;
    codigo: string;
    titulo: string;
    objetivo: string;
    escopo: string;
    criterio: string;
    tipo: string;
    status: string;
    nivel_risco: string;
    unidade: string;
    periodo_inicio: string | null;
    periodo_fim: string | null;
  };
  notas?: string;
  preservarNotas?: boolean;
}) {
  const acao = auditoria ? atualizarAuditoria : criarAuditoria;
  const [estado, enviar, pendente] = useActionState(acao, inicial);
  return (
    <form action={enviar}>
      {auditoria ? <input type="hidden" name="id" value={auditoria.id} /> : null}
      {preservarNotas ? <input type="hidden" name="preservar_notas" value="1" /> : null}
      <Mensagem estado={estado} />
      <div className="grade-form">
        <label className="campo">
          <span>Código</span>
          <input name="codigo" required defaultValue={auditoria?.codigo ?? ""} placeholder="AUD-2026-001" />
        </label>
        <label className="campo">
          <span>Unidade auditada</span>
          <input name="unidade" defaultValue={auditoria?.unidade ?? ""} />
        </label>
        <label className="campo largo">
          <span>Título</span>
          <input name="titulo" required defaultValue={auditoria?.titulo ?? ""} />
        </label>
        <label className="campo">
          <span>Tipo</span>
          <select name="tipo" defaultValue={auditoria?.tipo ?? "externa"}>
            <option value="externa">Externa</option>
            <option value="interna">Interna</option>
            <option value="regulatoria">Regulatória</option>
            <option value="especial">Especial</option>
          </select>
        </label>
        <label className="campo">
          <span>Situação</span>
          <select name="status" defaultValue={auditoria?.status ?? "planejada"}>
            <option value="planejada">Planejada</option>
            <option value="em_andamento">Em andamento</option>
            <option value="relatorio">Relatório</option>
            <option value="acompanhamento">Em acompanhamento</option>
            <option value="encerrada">Encerrada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label className="campo">
          <span>Nível de risco</span>
          <select name="nivel_risco" defaultValue={auditoria?.nivel_risco ?? "medio"}>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </select>
        </label>
        <label className="campo">
          <span>Início do período</span>
          <input type="date" name="periodo_inicio" defaultValue={auditoria?.periodo_inicio ?? ""} />
        </label>
        <label className="campo">
          <span>Fim do período</span>
          <input type="date" name="periodo_fim" defaultValue={auditoria?.periodo_fim ?? ""} />
        </label>
        <label className="campo largo">
          <span>Objetivo</span>
          <textarea name="objetivo" rows={3} defaultValue={auditoria?.objetivo ?? ""} />
        </label>
        <label className="campo largo">
          <span>Escopo</span>
          <textarea name="escopo" rows={3} defaultValue={auditoria?.escopo ?? ""} />
        </label>
        <label className="campo largo">
          <span>Critério (norma, política ou regulamento)</span>
          <textarea name="criterio" rows={2} defaultValue={auditoria?.criterio ?? ""} />
        </label>
        <label className="campo largo">
          <span>Notas sigilosas</span>
          <textarea name="notas_sigilosas" rows={3} defaultValue={preservarNotas ? "" : (notas ?? "")} disabled={preservarNotas} />
          <small className="sigilo">Cifradas no servidor antes de gravar. Não vão para o e-mail de alerta.</small>
        </label>
      </div>
      <Botao>{pendente ? "Salvando…" : auditoria ? "Atualizar auditoria" : "Criar auditoria"}</Botao>
    </form>
  );
}

export function FormularioConstatacao({
  auditoriaId,
  constatacao,
  notas,
  preservarNotas,
}: {
  auditoriaId: string;
  constatacao?: {
    id: string;
    codigo: string;
    titulo: string;
    criterio: string;
    condicao: string;
    causa: string;
    efeito: string;
    classificacao: string;
    status: string;
  };
  notas?: string;
  preservarNotas?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(salvarConstatacao, inicial);
  return (
    <form action={enviar}>
      <input type="hidden" name="auditoria_id" value={auditoriaId} />
      {constatacao ? <input type="hidden" name="id" value={constatacao.id} /> : null}
      {preservarNotas ? <input type="hidden" name="preservar_notas" value="1" /> : null}
      <Mensagem estado={estado} />
      <div className="grade-form">
        <label className="campo"><span>Código</span><input name="codigo" required defaultValue={constatacao?.codigo ?? ""} placeholder="C-01" /></label>
        <label className="campo">
          <span>Classificação</span>
          <select name="classificacao" defaultValue={constatacao?.classificacao ?? "media"}>
            <option value="oportunidade_melhoria">Oportunidade de melhoria</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </label>
        <label className="campo largo"><span>Título</span><input name="titulo" required defaultValue={constatacao?.titulo ?? ""} /></label>
        <label className="campo largo"><span>Critério — o que deveria acontecer</span><textarea name="criterio" rows={2} defaultValue={constatacao?.criterio ?? ""} /></label>
        <label className="campo largo"><span>Condição — o que foi encontrado</span><textarea name="condicao" rows={2} defaultValue={constatacao?.condicao ?? ""} /></label>
        <label className="campo"><span>Causa</span><textarea name="causa" rows={2} defaultValue={constatacao?.causa ?? ""} /></label>
        <label className="campo"><span>Efeito</span><textarea name="efeito" rows={2} defaultValue={constatacao?.efeito ?? ""} /></label>
        <label className="campo">
          <span>Situação</span>
          <select name="status" defaultValue={constatacao?.status ?? "aberta"}>
            <option value="aberta">Aberta</option>
            <option value="em_tratamento">Em tratamento</option>
            <option value="aguardando_validacao">Aguardando validação</option>
            <option value="validada">Validada</option>
            <option value="encerrada">Encerrada</option>
            <option value="reaberta">Reaberta</option>
          </select>
        </label>
        <label className="campo largo">
          <span>Notas sigilosas</span>
          <textarea name="notas_sigilosas" rows={2} defaultValue={preservarNotas ? "" : (notas ?? "")} disabled={preservarNotas} />
        </label>
      </div>
      <Botao>{pendente ? "Salvando…" : constatacao ? "Atualizar constatação" : "Registrar constatação"}</Botao>
    </form>
  );
}

export function FormularioRecomendacao({ auditoriaId, constatacaoId }: { auditoriaId: string; constatacaoId: string }) {
  const [estado, enviar, pendente] = useActionState(salvarRecomendacao, inicial);
  return (
    <form action={enviar}>
      <input type="hidden" name="auditoria_id" value={auditoriaId} />
      <input type="hidden" name="constatacao_id" value={constatacaoId} />
      <Mensagem estado={estado} />
      <label className="campo"><span>Recomendação</span><textarea name="descricao" rows={3} required /></label>
      <div className="grade-form">
        <label className="campo">
          <span>Prioridade</span>
          <select name="prioridade" defaultValue="media">
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
        <label className="campo"><span>Prazo sugerido</span><input type="date" name="prazo_sugerido" /></label>
      </div>
      <Botao>{pendente ? "Salvando…" : "Registrar recomendação"}</Botao>
    </form>
  );
}

export function FormularioPlano({
  auditoriaId,
  recomendacaoId,
  responsaveis,
  plano,
}: {
  auditoriaId: string;
  recomendacaoId: string;
  responsaveis: { id: string; nome: string; email: string }[];
  plano?: {
    id: string;
    descricao: string;
    responsavel_id: string | null;
    prazo: string;
    status: string;
    atendimento: string;
    justificativa_atendimento: string | null;
  };
}) {
  const [estado, enviar, pendente] = useActionState(salvarPlano, inicial);
  return (
    <form action={enviar}>
      <input type="hidden" name="auditoria_id" value={auditoriaId} />
      <input type="hidden" name="recomendacao_id" value={recomendacaoId} />
      {plano ? <input type="hidden" name="id" value={plano.id} /> : null}
      <Mensagem estado={estado} />
      <label className="campo"><span>O que será feito</span><textarea name="descricao" required rows={3} defaultValue={plano?.descricao ?? ""} /></label>
      <div className="grade-form">
        <label className="campo">
          <span>Responsável</span>
          <select name="responsavel_id" defaultValue={plano?.responsavel_id ?? ""}>
            <option value="">A definir</option>
            {responsaveis.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>{pessoa.nome || pessoa.email}</option>
            ))}
          </select>
        </label>
        <label className="campo"><span>Prazo</span><input type="date" name="prazo" required defaultValue={plano?.prazo ?? ""} /></label>
        <label className="campo">
          <span>Situação do atendimento</span>
          <select name="status" defaultValue={plano?.status ?? "nao_iniciado"}>
            <option value="nao_iniciado">Não iniciado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="aguardando_evidencia">Aguardando evidência</option>
            <option value="aguardando_validacao">Aguardando validação</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <label className="campo">
          <span>Atende ao que a auditoria pediu?</span>
          <select name="atendimento" defaultValue={plano?.atendimento ?? "pendente"}>
            <option value="pendente">Ainda não avaliado</option>
            <option value="atende_integralmente">Atende integralmente</option>
            <option value="atende_parcialmente">Atende parcialmente</option>
            <option value="nao_atende">Não atende</option>
          </select>
        </label>
        <label className="campo largo">
          <span>Justificativa (obrigatória se não atender integralmente)</span>
          <textarea name="justificativa_atendimento" rows={2} defaultValue={plano?.justificativa_atendimento ?? ""} />
        </label>
      </div>
      <Botao>{pendente ? "Salvando…" : plano ? "Atualizar plano" : "Registrar plano"}</Botao>
    </form>
  );
}

export function FormularioEvidencia({ auditoriaId, planoId }: { auditoriaId: string; planoId: string }) {
  const [estado, enviar, pendente] = useActionState(salvarEvidencia, inicial);
  return (
    <form action={enviar}>
      <input type="hidden" name="auditoria_id" value={auditoriaId} />
      <input type="hidden" name="plano_acao_id" value={planoId} />
      <Mensagem estado={estado} />
      <label className="campo"><span>Evidência</span><textarea name="descricao" required rows={2} /></label>
      <label className="campo"><span>Referência (protocolo, caminho ou link interno)</span><input name="referencia" /></label>
      <Botao>{pendente ? "Salvando…" : "Anexar evidência"}</Botao>
    </form>
  );
}

export function FormularioValidacao({ auditoriaId, planoId }: { auditoriaId: string; planoId: string }) {
  const [estado, enviar, pendente] = useActionState(salvarValidacao, inicial);
  return (
    <form action={enviar}>
      <input type="hidden" name="auditoria_id" value={auditoriaId} />
      <input type="hidden" name="plano_acao_id" value={planoId} />
      <Mensagem estado={estado} />
      <label className="campo">
        <span>Resultado</span>
        <select name="resultado" defaultValue="aceita">
          <option value="aceita">Aceita</option>
          <option value="aceita_com_ressalvas">Aceita com ressalvas</option>
          <option value="rejeitada">Rejeitada</option>
        </select>
      </label>
      <label className="campo"><span>Comentário</span><textarea name="comentario" rows={2} /></label>
      <Botao>{pendente ? "Salvando…" : "Registrar validação"}</Botao>
    </form>
  );
}

export function FormularioConvite() {
  const [estado, enviar, pendente] = useActionState(convidarUsuario, inicial);
  return (
    <form action={enviar} className="painel">
      <h2>Convidar usuário</h2>
      <Mensagem estado={estado} />
      <div className="grade-form">
        <label className="campo"><span>Nome</span><input name="nome" required /></label>
        <label className="campo"><span>E-mail</span><input name="email" type="email" required /></label>
        <label className="campo">
          <span>Papel</span>
          <select name="papel" defaultValue="risco">
            <option value="risco">Riscos</option>
            <option value="auditor">Auditor externo</option>
            <option value="admin">Administração</option>
          </select>
        </label>
        <label className="campo">
          <span>Expira em (só para auditor)</span>
          <input type="datetime-local" name="acesso_expira_em" />
        </label>
      </div>
      <p className="sigilo">Auditor externo nasce pendente. Aprove o acesso antes de atribuir auditorias. O primeiro login exige MFA.</p>
      <Botao>{pendente ? "Criando…" : "Criar acesso"}</Botao>
    </form>
  );
}

export function FormularioAcesso({
  perfil,
}: {
  perfil: { id: string; papel: string; status_acesso: string; acesso_expira_em: string | null };
}) {
  const [estado, enviar, pendente] = useActionState(atualizarAcesso, inicial);
  const expira = perfil.acesso_expira_em ? perfil.acesso_expira_em.slice(0, 16) : "";
  return (
    <form action={enviar}>
      <input type="hidden" name="id" value={perfil.id} />
      <Mensagem estado={estado} />
      <div className="grade-form">
        <label className="campo">
          <span>Papel</span>
          <select name="papel" defaultValue={perfil.papel}>
            <option value="admin">Administração</option>
            <option value="risco">Riscos</option>
            <option value="auditor">Auditor externo</option>
          </select>
        </label>
        <label className="campo">
          <span>Acesso</span>
          <select name="status_acesso" defaultValue={perfil.status_acesso}>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="revogado">Revogado</option>
          </select>
        </label>
        <label className="campo largo">
          <span>Expira em</span>
          <input type="datetime-local" name="acesso_expira_em" defaultValue={expira} />
        </label>
      </div>
      <Botao>{pendente ? "Salvando…" : "Salvar acesso"}</Botao>
    </form>
  );
}

export function FormularioAtribuicao({
  auditores,
  auditorias,
}: {
  auditores: { id: string; nome: string; email: string }[];
  auditorias: { id: string; codigo: string; titulo: string }[];
}) {
  const [estado, enviar, pendente] = useActionState(atribuirAuditoria, inicial);
  return (
    <form action={enviar} className="painel">
      <h2>Atribuir auditoria</h2>
      <Mensagem estado={estado} />
      <label className="campo">
        <span>Auditor aprovado</span>
        <select name="auditor_id" required defaultValue="">
          <option value="" disabled>Selecione</option>
          {auditores.map((auditor) => (
            <option key={auditor.id} value={auditor.id}>{auditor.nome || auditor.email}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Auditoria</span>
        <select name="auditoria_id" required defaultValue="">
          <option value="" disabled>Selecione</option>
          {auditorias.map((auditoria) => (
            <option key={auditoria.id} value={auditoria.id}>{auditoria.codigo} — {auditoria.titulo}</option>
          ))}
        </select>
      </label>
      <label className="campo"><span>A atribuição expira em</span><input type="datetime-local" name="expira_em" /></label>
      <Botao>{pendente ? "Salvando…" : "Atribuir"}</Botao>
    </form>
  );
}

export function FormularioRevogar({ id }: { id: string }) {
  const [estado, enviar, pendente] = useActionState(revogarAtribuicao, inicial);
  return (
    <form action={enviar}>
      <input type="hidden" name="id" value={id} />
      <Mensagem estado={estado} />
      <label className="campo"><span>Motivo da revogação</span><input name="motivo" required /></label>
      <Botao>{pendente ? "Revogando…" : "Revogar atribuição"}</Botao>
    </form>
  );
}
