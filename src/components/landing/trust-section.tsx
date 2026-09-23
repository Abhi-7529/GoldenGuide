import { IconShieldCheck } from "~/components/icons";

export function TrustSection() {
  return (
    <section id="safety" className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconShieldCheck className="size-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Financial education, not financial advice.
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            GoldenGuide is designed to help users understand financial concepts
            and practice decision making. It does not make investment decisions
            or tell users what financial products to buy.
          </p>
        </div>
      </div>
    </section>
  );
}
