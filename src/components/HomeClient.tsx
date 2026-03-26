"use client";

import MonthCalendar from "./MonthCalendar";
import NotificationButton from "./NotificationButton";
// status constants not needed here

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
  isAdmin: boolean;
}

export default function HomeClient({ currentPerson, maxSeats, userName, userImage, isAdmin }: HomeClientProps) {
  return (
    <div className="min-h-screen" style={{ background: "#F4F5F7" }}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 leading-none">Codelco</p>
            <h1 className="font-black text-gray-900 text-base leading-tight">Presencialidad</h1>
          </div>

          <div className="flex items-center gap-2">
            <NotificationButton personId={currentPerson?.id} />
            {isAdmin && (
              <a href="/admin" className="text-xs bg-gray-900 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors">
                Admin
              </a>
            )}
            <div className="flex items-center gap-2">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt={userName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                  {(currentPerson?.name || userName)[0]}
                </div>
              )}
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>

        {currentPerson && (
          <div className="max-w-lg mx-auto px-4 pb-3 flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-700">{currentPerson.name}</p>
            <span className="text-xs text-gray-400">·</span>
            <p className="text-xs text-gray-400">{currentPerson.type === "INTERNAL" ? "Personal Interno" : "Personal Externo"}</p>
            {isAdmin && <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">Admin</span>}
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        <MonthCalendar
          currentPerson={currentPerson}
          maxSeats={maxSeats}
        />

        {!isAdmin && (
          <div className="mt-3 text-center">
            <a href="/admin" className="text-xs text-gray-300 hover:text-gray-500 underline">Administración</a>
          </div>
        )}
      </main>
    </div>
  );
}
