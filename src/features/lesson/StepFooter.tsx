import Link from "next/link";

/** Sticky bottom bar on mobile, inline on desktop: previous / next step of the flow. */
export function StepFooter({ back, next }: { back?: { href: string; label: string }; next?: { href: string; label: string } }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        {back ? (
          <Link href={back.href} className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
            ← {back.label}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {next.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
