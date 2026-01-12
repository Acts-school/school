"use client";

import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: ReadonlyArray<Crumb> }) {
  return (
    <nav aria-label="breadcrumb" className="text-sm text-gray-500">
      <ol className="flex items-center gap-2 flex-wrap">
        {items.map((c, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${c.label}-${idx}`} className="flex items-center gap-2">
              {c.href && !isLast ? (
                <Link href={c.href} className="hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-gray-700">{c.label}</span>
              )}
              {!isLast && <span className="text-gray-300">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
