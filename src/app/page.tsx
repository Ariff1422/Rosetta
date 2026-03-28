"use client";

import { useState } from "react";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Results } from "@/components/sections/results";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  const [query, setQuery] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero onSearch={(q) => setQuery(q)} />
        {query ? (
          <Results query={query} />
        ) : (
          <HowItWorks />
        )}
      </main>
      <Footer />
    </div>
  );
}
