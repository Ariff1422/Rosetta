import { useLocalStorage } from "./use-local-storage";

const HISTORY_KEY = "rosetta_search_history";
const MAX_HISTORY = 5;

export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<string[]>(HISTORY_KEY, []);

  const push = (query: string) => {
    setHistory([query, ...history.filter((q) => q !== query)].slice(0, MAX_HISTORY));
  };

  const clear = () => setHistory([]);

  return { history, push, clear };
}
