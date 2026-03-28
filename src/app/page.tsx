"use client";

import { useState } from "react";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Results } from "@/components/sections/results";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Footer } from "@/components/sections/footer";
import type { SearchRequestPayload } from "@/lib/search-schema";

export default function Home() {
  const [search, setSearch] = useState<SearchRequestPayload | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero onSearch={(payload) => setSearch(payload)} />
        {search ? (
          <Results search={search} />
        ) : (
          <HowItWorks />
        )}
      </main>
      <Footer />
    </div>
  );
}
