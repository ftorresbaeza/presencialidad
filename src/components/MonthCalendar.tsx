"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isPast, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { StatusCode, ALL_STATUSES, STATUS_LABELS, STATUS_BADGE_COLORS, STATUS_COLORS } from "@/lib/constants";

interface Person { id: string; name: string; type: string }
interface Schedule {
  id: string; personId: string; date: string; status: StatusCode;
  person: { id: string; name: string; type: string };
}
interface Props { currentPerson: Person | null; maxSeats: number }

export default function MonthCalendar({ currentPerson, maxSeats }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weekView, setWeekView] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/schedules?year=${year}&month=${month}`);
    setSchedules(await res.json().then(d => Array.isArray(d) ? d : []));
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const firstDow = (getDay(startOfMonth(currentDate)) + 6) % 7;

  const getDaySchedules = (d: Date) => schedules.filter(s => s.date.startsWith(format(d, "yyyy-MM-dd")));
  const getMyStatus = (d: Date): StatusCode | null => {
    if (!currentPerson) return null;
    return getDaySchedules(d).find(s => s.personId === currentPerson.id)?.status ?? null;
  };
  const canEdit = (d: Date) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return !isPast(d) || isSameDay(d, new Date());
  };

  async function saveStatus(date: Date, status: StatusCode | null) {
    if (!currentPerson) return;
    setSaving(true); setSaveError(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = status === null
        ? await fetch(`/api/schedules?personId=${currentPerson.id}&date=${dateStr}`, { method: "DELETE" })
        : await fetch("/api/schedules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personId: currentPerson.id, date: dateStr, status }),
          });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setSaveError(e.error || "Error al guardar"); return; }
      await fetchSchedules();
      setSelectedDay(null);
    } catch { setSaveError("Error de conexión"); }
    finally { setSaving(false); }
  }

  // Today stats
  const todaySchedules = getDaySchedules(new Date());
  const todayOf = todaySchedules.filter(s => s.status === "Of").length;
  const todayFree = maxSeats - todayOf;
  const inCurrentMonth = new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

  // Build weeks
  const padded = [...Array(firstDow).fill(null), ...days];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7) as (Date | null)[]);

  // Week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const DOW = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  return (
    <div className="flex flex-col gap-3">

      {/* Today banner */}
      {inCurrentMonth && !loading && (
        <div className={`rounded-2xl p-4 flex items-center justify-between border ${
          todayFree <= 0 ? "bg-red-50 border-red-200" :
          todayFree <= 3 ? "bg-amber-50 border-amber-200" :
          "bg-emerald-50 border-emerald-200"
        }`}>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-0.5">
              Hoy · {format(new Date(), "EEEE d", { locale: es })}
            </p>
            <p className={`text-3xl font-black ${todayFree <= 0 ? "text-red-600" : todayFree <= 3 ? "text-amber-600" : "text-emerald-600"}`}>
              {todayFree <= 0 ? "Sin puestos" : `${todayFree} libres`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{todayOf} de {maxSeats} puestos ocupados</p>
          </div>
          <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black text-2xl shadow-sm ${
            todayFree <= 0 ? "bg-red-100 text-red-600" :
            todayFree <= 3 ? "bg-amber-100 text-amber-600" :
            "bg-emerald-100 text-emerald-600"
          }`}>
            {todayFree <= 0 ? "🚫" : todayFree}
          </div>
        </div>
      )}

      {/* Nav + view toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 text-lg transition-colors">‹</button>
          <div className="text-center">
            <p className="font-bold text-gray-900 capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</p>
            <button onClick={() => { setCurrentDate(new Date()); }} className="text-xs text-blue-500 hover:underline">hoy</button>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 text-lg transition-colors">›</button>
        </div>

        <div className="flex border-b border-gray-50">
          {["Mes", "Semana"].map((v, i) => (
            <button key={v} onClick={() => setWeekView(i === 1)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${weekView === (i === 1) ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-400 hover:text-gray-600"}`}>
              {v}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-52 text-gray-300">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Cargando...</span>
            </div>
          </div>
        ) : weekView ? (
          /* ── WEEK VIEW ── */
          <div>
            <div className="grid grid-cols-7 bg-gray-50/60">
              {DOW.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>)}
            </div>
            <div className="divide-y divide-gray-50">
              {weekDays.map((day, i) => {
                const ds = getDaySchedules(day);
                const ofCount = ds.filter(s => s.status === "Of").length;
                const free = maxSeats - ofCount;
                const my = getMyStatus(day);
                const weekend = i >= 5;
                const past = isPast(day) && !isSameDay(day, new Date());
                return (
                  <div key={i} onClick={() => setSelectedDay(day)}
                    className={`p-3 cursor-pointer transition-colors ${weekend ? "bg-gray-50/50" : "hover:bg-blue-50/40"} ${past ? "opacity-50" : ""} ${isToday(day) ? "border-l-[3px] border-blue-500" : ""}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday(day) ? "bg-blue-500 text-white" : "text-gray-700"}`}>
                          {format(day, "d")}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{DOW[i]}</span>
                        {my && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[my]}`}>{my}</span>}
                      </div>
                      {!weekend && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${free <= 0 ? "bg-red-100 text-red-600" : free <= 3 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-700"}`}>
                          {free <= 0 ? "Lleno" : `${free} libres`}
                        </span>
                      )}
                    </div>
                    {ofCount > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ds.filter(s => s.status === "Of").slice(0, 6).map(s => (
                          <span key={s.id} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {s.person.name.split(" ")[0]}
                          </span>
                        ))}
                        {ofCount > 6 && <span className="text-xs text-gray-400">+{ofCount - 6}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── MONTH VIEW ── */
          <>
            <div className="grid grid-cols-7 bg-gray-50/60">
              {DOW.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>)}
            </div>
            <div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-t border-gray-50">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="min-h-[80px] bg-gray-50/30" />;
                    const ds = getDaySchedules(day);
                    const ofCount = ds.filter(s => s.status === "Of").length;
                    const free = maxSeats - ofCount;
                    const my = getMyStatus(day);
                    const weekend = di >= 5;
                    const past = isPast(day) && !isSameDay(day, new Date());
                    const today = isToday(day);
                    return (
                      <div key={di} onClick={() => setSelectedDay(day)}
                        className={`min-h-[80px] p-1.5 cursor-pointer border-r border-gray-50 last:border-r-0 transition-colors flex flex-col gap-1
                          ${weekend ? "bg-gray-50/40" : "bg-white hover:bg-blue-50/30"}
                          ${past ? "opacity-50" : ""}
                          ${today ? "ring-2 ring-inset ring-blue-400 bg-blue-50/20" : ""}
                        `}>
                        {/* Date number */}
                        <div className="flex items-center justify-between">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${today ? "bg-blue-500 text-white" : "text-gray-600"}`}>
                            {format(day, "d")}
                          </span>
                          {!weekend && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${free <= 0 ? "bg-red-100 text-red-500" : free <= 3 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                              {free <= 0 ? "0" : free}
                            </span>
                          )}
                        </div>
                        {/* My status pill */}
                        {my && (
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center ${STATUS_COLORS[my]}`}>
                            {my}
                          </span>
                        )}
                        {/* Office people dots */}
                        {!weekend && ofCount > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-auto">
                            {ds.filter(s => s.status === "Of").slice(0, 5).map(s => (
                              <div key={s.id} title={s.person.name} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ))}
                            {ofCount > 5 && <span className="text-[9px] text-gray-300 leading-none">+{ofCount - 5}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Day modal */}
      {selectedDay && (
        <DayModal
          day={selectedDay}
          schedules={getDaySchedules(selectedDay)}
          myStatus={getMyStatus(selectedDay)}
          maxSeats={maxSeats}
          saving={saving}
          error={saveError}
          canEdit={canEdit(selectedDay) && !!currentPerson}
          currentPerson={currentPerson}
          onSave={saveStatus}
          onClose={() => { setSelectedDay(null); setSaveError(null); }}
        />
      )}
    </div>
  );
}

/* ── Day Modal ────────────────────────────────────────────────────── */

interface ModalProps {
  day: Date; schedules: Schedule[]; myStatus: StatusCode | null;
  maxSeats: number; saving: boolean; error: string | null; canEdit: boolean;
  currentPerson: Person | null;
  onSave: (d: Date, s: StatusCode | null) => void;
  onClose: () => void;
}

function DayModal({ day, schedules, myStatus, maxSeats, saving, error, canEdit, currentPerson, onSave, onClose }: ModalProps) {
  const ofCount = schedules.filter(s => s.status === "Of").length;
  const free = maxSeats - ofCount;
  const pct = Math.min(100, (ofCount / maxSeats) * 100);

  const byStatus = ALL_STATUSES.reduce((acc, s) => {
    const list = schedules.filter(x => x.status === s);
    if (list.length) acc[s] = list;
    return acc;
  }, {} as Record<StatusCode, Schedule[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                {format(day, "EEEE", { locale: es })}
              </p>
              <h3 className="text-xl font-black text-gray-900 capitalize mt-0.5">
                {format(day, "d 'de' MMMM", { locale: es })}
              </h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg transition-colors">×</button>
          </div>

          {/* Capacity */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-black ${free <= 0 ? "text-red-500" : free <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                {free <= 0 ? "Sin puestos disponibles" : `${free} puestos libres`}
              </span>
              <span className="text-xs text-gray-400 font-medium">{ofCount}/{maxSeats}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${free <= 0 ? "bg-red-400" : free <= 3 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 pb-4">

          {/* Errors / saving */}
          {error && <div className="mx-5 mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
          {saving && <div className="mx-5 mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-600 text-center">Guardando...</div>}

          {/* Status selector */}
          {canEdit && currentPerson && (
            <div className="px-5 pb-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mi estado</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_STATUSES.map(status => {
                  const full = status === "Of" && free <= 0 && myStatus !== "Of";
                  const active = myStatus === status;
                  return (
                    <button key={status} disabled={full || saving} onClick={() => onSave(day, status)}
                      className={`py-3 px-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition-all active:scale-95
                        ${active ? STATUS_COLORS[status] + " shadow-md scale-[1.02]" : STATUS_BADGE_COLORS[status] + " border"}
                        ${full ? "opacity-30 cursor-not-allowed" : "hover:opacity-90"}
                      `}>
                      <span className="truncate mr-1 text-left">{STATUS_LABELS[status]}</span>
                      <span className="text-xs font-black opacity-70 shrink-0">{status}</span>
                    </button>
                  );
                })}
              </div>
              {myStatus && (
                <button onClick={() => onSave(day, null)} disabled={saving}
                  className="w-full mt-2 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100 font-medium">
                  Quitar mi estado
                </button>
              )}
            </div>
          )}

          {/* Not logged in / not linked */}
          {!currentPerson && canEdit && (
            <div className="mx-5 my-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              Inicia sesión para registrar tu presencia
            </div>
          )}

          {/* People list */}
          <div className="px-5 pt-4">
            {schedules.length === 0 ? (
              <p className="text-center text-gray-300 text-sm py-4">Nadie registrado aún</p>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Registrados ({schedules.length})
                </p>
                <div className="flex flex-col gap-3">
                  {ALL_STATUSES.filter(s => byStatus[s]).map(status => (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-black px-2 py-1 rounded-lg border ${STATUS_BADGE_COLORS[status]}`}>{status}</span>
                        <span className="text-xs text-gray-400">{STATUS_LABELS[status]}</span>
                        <span className="text-xs text-gray-300 ml-auto">{byStatus[status].length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {byStatus[status].map(s => (
                          <span key={s.id} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_BADGE_COLORS[status]}`}>
                            {s.person.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
