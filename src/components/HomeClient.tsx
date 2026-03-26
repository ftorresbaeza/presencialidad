"use client";

import MonthCalendar from "./MonthCalendar";
import NotificationButton from "./NotificationButton";
import { STATUS_LABELS, STATUS_BADGE_COLORS, StatusCode, ALL_STATUSES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  type: string;
}

interface HomeClientProps {
  currentPerson: Person | null;
  maxSeats: number;
  userName: string;
  userImage: string | null;
}

export default function HomeClient({ currentPerson, maxSeats, userName, userImage }: HomeClientProps) {
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
              <span className="text-sm font-medium hidden sm:inline max-w-[140px] truncate">
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

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {currentPerson && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              {currentPerson.name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{currentPerson.name}</p>
              <p className="text-xs text-gray-400">{currentPerson.type === "INTERNAL" ? "Personal Interno" : "Personal Externo"}</p>
            </div>
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
