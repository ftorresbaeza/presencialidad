"use client";

import { useState, useEffect } from "react";
import MonthCalendar from "@/components/MonthCalendar";
import NotificationButton from "@/components/NotificationButton";
import { STATUS_LABELS, STATUS_BADGE_COLORS, StatusCode, ALL_STATUSES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  type: string;
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [maxSeats, setMaxSeats] = useState(30);
  const [showSelector, setShowSelector] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then(setPeople);
    fetch("/api/config").then((r) => r.json()).then((c) => setMaxSeats(c.maxSeats));

    // Restore saved person from localStorage
    const saved = localStorage.getItem("presencialidad_person");
    if (saved) {
      try {
        setCurrentPerson(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  function selectPerson(p: Person) {
    setCurrentPerson(p);
    localStorage.setItem("presencialidad_person", JSON.stringify(p));
    setShowSelector(false);
    setSearch("");
  }

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const internal = filtered.filter((p) => p.type === "INTERNAL");
  const external = filtered.filter((p) => p.type === "EXTERNAL");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <div>
              <h1 className="font-bold text-base leading-tight">Presencialidad</h1>
              <p className="text-blue-200 text-xs">Codelco</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationButton personId={currentPerson?.id} />
            <button
              onClick={() => setShowSelector(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="text-sm">👤</span>
              <span className="text-sm font-medium max-w-[120px] truncate">
                {currentPerson ? currentPerson.name.split(" ")[0] : "Seleccionar"}
              </span>
              <span className="text-blue-300">▾</span>
            </button>
          </div>
        </div>
      </header>

      {/* Person Selector Modal */}
      {showSelector && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowSelector(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">¿Quién eres?</h2>
              <button onClick={() => setShowSelector(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Buscar nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {internal.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Personal Interno</p>
                  {internal.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPerson(p)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between transition-colors ${
                        currentPerson?.id === p.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>{p.name}</span>
                      {currentPerson?.id === p.id && <span className="text-blue-500 text-xs">✓ Seleccionado</span>}
                    </button>
                  ))}
                </div>
              )}
              {external.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Personal Externo</p>
                  {external.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPerson(p)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between transition-colors ${
                        currentPerson?.id === p.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>{p.name}</span>
                      {currentPerson?.id === p.id && <span className="text-blue-500 text-xs">✓ Seleccionado</span>}
                    </button>
                  ))}
                </div>
              )}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No se encontraron personas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {!currentPerson && (
          <div
            onClick={() => setShowSelector(true)}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3 cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl">👆</span>
            <div>
              <p className="font-semibold text-blue-800">Selecciona tu nombre</p>
              <p className="text-sm text-blue-600">Para registrar tu presencia en la oficina</p>
            </div>
          </div>
        )}

        {currentPerson && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                {currentPerson.name[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{currentPerson.name}</p>
                <p className="text-xs text-gray-400">{currentPerson.type === "INTERNAL" ? "Personal Interno" : "Personal Externo"}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSelector(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              Cambiar
            </button>
          </div>
        )}

        <MonthCalendar currentPerson={currentPerson} maxSeats={maxSeats} />

        {/* Legend */}
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leyenda</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE_COLORS[s as StatusCode]}`}>
                  {s}
                </span>
                <span className="text-xs text-gray-600">{STATUS_LABELS[s as StatusCode]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin link */}
        <div className="mt-4 text-center">
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Administración
          </a>
        </div>
      </main>
    </div>
  );
}
