"use client";

import { Wordmark } from "./Wordmark";
import { SourceStatus } from "./SourceStatus";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Wordmark />
        <SourceStatus />
      </div>
    </header>
  );
}
