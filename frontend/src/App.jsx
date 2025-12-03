import React, { useEffect, useState } from "react";
import CanvasRenderer from "./components/CanvasRenderer";
import ResultCard from "./components/ResultCard";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default function App() {
  // MAIN QUERY (initial instruction)
  const [mainQuery, setMainQuery] = useState("");

  // UPDATE QUERY (modification commands)
  const [updateQuery, setUpdateQuery] = useState("");

  // FINAL DRAWING RESPONSE
  const [drawing, setDrawing] = useState(null);

  // Drawing history → Undo/Redo
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Store all commands (main + updates)
  const [queryHistory, setQueryHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load theme (future-proof)
  useEffect(() => {
    const stored = localStorage.getItem("miran_theme");
    if (stored === "dark") document.documentElement.classList.add("dark");
  }, []);

  // -----------------------------------------------------
  // SUBMIT HANDLER — COMBINE MAIN + UPDATE QUERY
  // -----------------------------------------------------
async function handleSubmit(e) {
  e?.preventDefault();

  const trimmedMain = mainQuery.trim();
  const trimmedUpdate = updateQuery.trim();

  //  NEW VALIDATION: Main query is mandatory
  if (!trimmedMain) {
    setError("Main query cannot be empty. Please enter a drawing instruction.");
    return;
  }

  // Combine queries
  const combinedQuery = trimmedMain + " " + trimmedUpdate;

  // Store history
  if (queryHistory.length === 0) {
    setQueryHistory([trimmedMain]);
  }
  if (trimmedUpdate) {
    setQueryHistory((prev) => [...prev, trimmedUpdate]);
  }

  setLoading(true);
  setError(null);
  setDrawing(null);

  try {
    const res = await fetch(`${BACKEND}/userquery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: combinedQuery }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Server error");

    setHistory((prev) => [...prev, data]);
    setFuture([]);
    setDrawing(data);

    setUpdateQuery("");
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}


  // -----------------------------------------------------
  // UNDO
  // -----------------------------------------------------
  function handleUndo() {
    if (history.length <= 1) return;

    const newHist = [...history];
    const last = newHist.pop();

    setFuture((prev) => [last, ...prev]);
    setHistory(newHist);
    setDrawing(newHist[newHist.length - 1]);
  }

  // -----------------------------------------------------
  // REDO
  // -----------------------------------------------------
  function handleRedo() {
    if (future.length === 0) return;

    const [next, ...rest] = future;

    setHistory((prev) => [...prev, next]);
    setFuture(rest);
    setDrawing(next);
  }

  // -----------------------------------------------------
  // RESET — Clear everything
  // -----------------------------------------------------
  function handleReset() {
    setMainQuery("");
    setUpdateQuery("");
    setDrawing(null);
    setHistory([]);
    setFuture([]);
    setQueryHistory([]);
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-gray-800/60">
        <h1 className="text-xl font-semibold">Miran Draw</h1>
      </header>

      {/* MAIN */}
      <main className="flex-1 container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">

            {/* INPUT FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* MAIN QUERY */}
              <div>
                <label className="text-sm font-medium">Main Query (full drawing instruction)</label>
                <textarea
                  className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 
                             border border-gray-300 dark:border-gray-700 
                             focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  value={mainQuery}
                  onChange={(e) => setMainQuery(e.target.value)}
                  placeholder="Example: Draw a rectangle at (20,30) width 200 height 100."
                />
              </div>

              {/* UPDATE QUERY */}
              <div>
                <label className="text-sm font-medium">Update Query (modify existing drawing)</label>
                <textarea
                  className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 
                             border border-gray-300 dark:border-gray-700 
                             focus:ring-2 focus:ring-green-500 outline-none"
                  rows={3}
                  value={updateQuery}
                  onChange={(e) => setUpdateQuery(e.target.value)}
                  placeholder="Example: Increase width by 50. Add a circle inside."
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 mt-3">

                {/* MAIN ACTION BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-md text-white font-medium shadow-md transition-all duration-200 
                    ${loading 
                      ? "bg-gray-400 cursor-not-allowed"
                      : history.length === 0
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {loading
                    ? "Processing..."
                    : history.length === 0
                      ? "Generate Drawing"
                      : "Update Drawing"}
                </button>

                {/* UNDO */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length <= 1}
                  className="px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 
                             text-white font-medium shadow-md disabled:opacity-40 transition-all"
                >
                  Undo
                </button>

                {/* REDO */}
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={future.length === 0}
                  className="px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 
                             text-white font-medium shadow-md disabled:opacity-40 transition-all"
                >
                  Redo
                </button>

                {/* RESET */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 
                             text-white font-medium shadow-md transition-all"
                >
                  Reset
                </button>

                {error && <p className="text-sm text-red-500 w-full">{error}</p>}
              </div>
            </form>

            {/* CANVAS */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
              <h3 className="font-medium mb-3">Canvas Output</h3>

              {loading && (
                <div className="py-20 text-center text-blue-500 animate-pulse">Generating...</div>
              )}

              {!loading && !drawing && (
                <div className="py-16 text-center text-gray-400">
                  No drawing yet — enter commands above.
                </div>
              )}

              {!loading && drawing && (
                <CanvasRenderer drawing={drawing} width={720} height={480} />
              )}
            </div>

          </div>

          {/* RIGHT SIDE */}
          <aside className="space-y-6">

            {/* DRAWING JSON */}
            <ResultCard
              title="Drawing JSON"
              content={drawing ? JSON.stringify(drawing, null, 2) : "No output yet."}
            />

            {/* COMMAND HISTORY */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
              <h4 className="font-medium mb-3">Your Commands</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                {queryHistory.length === 0 && <li>No queries yet.</li>}
                {queryHistory.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* EXAMPLES */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border mt-10 
                        border-gray-300 dark:border-gray-700">
          <h4 className="font-medium mb-3">Try These Examples</h4>

          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">

            <li className="cursor-pointer hover:text-blue-600"
                onClick={() => setMainQuery("Draw a diagonal line from (0,0) to (200,150)")}>
              Draw a diagonal line from (0,0) to (200,150)
            </li>

            <li className="cursor-pointer hover:text-blue-600"
                onClick={() => setMainQuery("Draw a rectangle at (40,60) width 180 height 90")}>
              Draw a rectangle at (40,60) width 180 height 90
            </li>

            <li className="cursor-pointer hover:text-blue-600"
                onClick={() => setMainQuery("Draw a pentagon centered at (200,200)")}>
              Draw a pentagon centered at (200,200)
            </li>

            <li className="cursor-pointer hover:text-blue-600"
                onClick={() => setMainQuery("Draw three circles arranged in a triangle")}>
              Draw three circles arranged in a triangle
            </li>

            <li className="cursor-pointer hover:text-blue-600"
                onClick={() => setMainQuery("Draw an ellipse centered at (150,150) rx 80 ry 40")}>
              Draw an ellipse centered at (150,150) rx 80 ry 40
            </li>

            <li className="cursor-pointer hover:text-blue-600"
                onClick={() => setMainQuery("Draw a house using rectangle body and triangle roof")}>
              Draw a house using rectangle body + triangle roof
            </li>

          </ul>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        Miran World — Interview task · Backend: <code>{BACKEND}</code>
      </footer>

    </div>
  );
}
