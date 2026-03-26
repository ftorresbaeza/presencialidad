"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MonthCalendar from "./MonthCalendar";
import NotificationButton from "./NotificationButton";
import { STATUS_LABELS, STATUS_BADGE_COLORS, StatusCode, ALL_STATUSES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  type: string;
}

interface HomeClientProps {
  people: Person[];
  currentPerson: Person | null;
  maxSeats: number;
  userName: string;
  userImage: string | null;
  isLinked: boolean;
}

export default function HomeClient({
  people,
  currentPerson,
  maxSeats,
  userName,
  userImage,
  isLinked,
}: HomeClientProps) {
  const router = useRouter();
  const [showLinkModal, setShowLinkModal] = useState(!isLinked);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  async function linkPerson(personId: string) {
    setLinkLoading(true);
    setLinkError("");
    const res = await fetch("/api/user/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    if (res.ok) {
      router.refresh();
      setShowLinkModal(false);
    } else {
      const data = await res.json();
      setLinkError(data.error || "Error al vincular perfil");
    }
    setLinkLoading(false);
  }

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(linkSearch.toLowerCase())
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
            <div className="flex items-center gap-2">
              {userImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt={userName} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">
                {currentPerson?.name.split(" ")[0] || userName.split(" ")[0]}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="text-xs text-blue-200 hover:text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Link profile modal — shown once until linked */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">¡Bienvenido/a!</h2>
              <p className="text-sm text-gray-500 mt-1">
                Iniciaste sesión como <strong>{userName}</strong>.<br />
                Selecciona tu perfil en el equipo para continuar.
              </p>
              {linkError && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{linkError}</p>
              )}
            </div>

            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Buscar nombre..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
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
                      onClick={() => linkPerson(p.id)}
                      disabled={linkLoading}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      {p.name}
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
                      onClick={() => linkPerson(p.id)}
                      disabled={linkLoading}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No se encontraron personas</p>
              )}
            </div>

            {linkLoading && (
              <div className="p-3 text-center text-sm text-blue-600 border-t border-gray-100">Vinculando perfil...</div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {/* Linked person card */}
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
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Vinculado</span>
          </div>
        )}

        <MonthCalendar currentPerson={currentPerson} maxSeats={maxSeats} />

        {/* Legend */}
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leyenda</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE_COLORS[s as StatusCode]}`}>{s}</span>
                <span className="text-xs text-gray-600">{STATUS_LABELS[s as StatusCode]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 underline">Administración</a>
        </div>
      </main>
    </div>
  );
}
