import { Footer } from "@/components/sections/footer";
import { HistoryView } from "@/components/sections/history-view";
import { Navbar } from "@/components/sections/navbar";

export default function HistoryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HistoryView />
      </main>
      <Footer />
    </div>
  );
}
