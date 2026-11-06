import { Moldura } from "@/componentes/moldura";

export const dynamic = "force-dynamic";

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <Moldura>{children}</Moldura>;
}
