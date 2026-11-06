export function Selo({ children, tom = "neutro" }: { children: React.ReactNode; tom?: string }) {
  return <span className={`selo ${tom}`}>{children}</span>;
}

export function tomNivel(nivel: string): string {
  if (nivel === "critico" || nivel === "alta" || nivel === "urgente") return "alto";
  if (nivel === "baixo" || nivel === "oportunidade_melhoria") return "ok";
  return "neutro";
}

export function tomFaixa(faixa: string): string {
  if (faixa === "vencido") return "vencido";
  if (faixa === "d7") return "d7";
  if (faixa === "d15") return "d15";
  return "ok";
}
