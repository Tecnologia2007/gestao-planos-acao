import "server-only";
import { revalidatePath } from "next/cache";

export function revalidarPainel(auditoriaId?: string) {
  revalidatePath("/");
  revalidatePath("/auditorias");
  revalidatePath("/planos");
  revalidatePath("/alertas");
  revalidatePath("/usuarios");
  if (auditoriaId) revalidatePath(`/auditorias/${auditoriaId}`);
}
