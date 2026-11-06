const CAMPOS_SIGILOSOS = new Set(["notas_sigilosas"]);

export function mascararRegistro(dados: unknown): unknown {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return dados;
  const copia: Record<string, unknown> = { ...(dados as Record<string, unknown>) };
  for (const campo of CAMPOS_SIGILOSOS) {
    if (copia[campo]) copia[campo] = "[cifrado]";
  }
  return copia;
}

export function chavesAlteradas(antes: unknown, depois: unknown): string[] {
  const anterior = antes && typeof antes === "object" && !Array.isArray(antes) ? (antes as Record<string, unknown>) : {};
  const novo = depois && typeof depois === "object" && !Array.isArray(depois) ? (depois as Record<string, unknown>) : {};
  const chaves = new Set([...Object.keys(anterior), ...Object.keys(novo)]);
  const mudadas: string[] = [];
  for (const chave of chaves) {
    if (chave === "atualizado_em") continue;
    if (JSON.stringify(anterior[chave]) !== JSON.stringify(novo[chave])) mudadas.push(chave);
  }
  return mudadas;
}
