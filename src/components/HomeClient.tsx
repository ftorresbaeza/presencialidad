"use client";

import { useState } from "react";
import MonthCalendar from "./MonthCalendar";
import NotificationButton from "./NotificationButton";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#F4F5F7" }}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 leading-none">Codelco</p>
            <h1 className="font-black text-gray-900 text-base leading-tight">Presencialidad</h1>
          </div>

          <div className="flex items-center gap-3">
            {currentPerson && (
              <div className="flex items-center gap-2">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImage} alt={userName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {(currentPerson?.name || userName)[0]}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <span className="block w-5 h-0.5 bg-gray-700 rounded" />
              <span className="block w-5 h-0.5 bg-gray-700 rounded" />
              <span className="block w-5 h-0.5 bg-gray-700 rounded" />
            </button>
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
      </main>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-base">Menú</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName} className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
              {(currentPerson?.name || userName)[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{currentPerson?.name || userName}</p>
            {currentPerson && (
              <p className="text-xs text-gray-400">{currentPerson.type === "INTERNAL" ? "Personal Interno" : "Personal Externo"}</p>
            )}
            {isAdmin && <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block">Admin</span>}
          </div>
        </div>

        {/* Menu items */}
        <nav className="flex flex-col gap-1 px-3 py-3 flex-1">
          {/* Notifications */}
          <div className="px-2 py-2">
            <NotificationButton personId={currentPerson?.id} />
          </div>

          {/* Admin link */}
          {isAdmin && (
            <a
              href="/admin"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-800"
            >
              <span className="text-lg">⚙️</span>
              Administración
            </a>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-5 py-5 border-t border-gray-100">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <span>→</span>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
