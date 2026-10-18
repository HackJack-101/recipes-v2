import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageTitle({ children, back }: { children: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-2 inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span className="truncate">{back.label}</span>
        </Link>
      )}
      <h1 className="text-3xl font-semibold sm:text-4xl">{children}</h1>
    </div>
  );
}
