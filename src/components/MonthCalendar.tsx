"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isPast, isSameDay, startOfWeek, endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { StatusCode, ALL_STATUSES, STATUS_LABELS } from "@/lib/constants";

interface Person { id: string; name: string; type: string }
interface Schedule {
  id: string; personId: string; date: string; status: StatusCode;
  person: { id: string; name: string; type: string };
}
interface Props {
  currentPerson: Person | null;
  maxSeats: number;
}

const DOW = ["L", "M", "X", "J", "V", "S", "D"];

// Status visual config: icon, bg, text
const STATUS_UI: Record<StatusCode, { icon: string; bg: string; text: string; active: string }> = {
  Of:  { icon: "🏢", bg: "bg-emerald-50",  text: "text-emerald-700", active: "bg-emerald-500" },
  Tb:  { icon: "🏠", bg: "bg-blue-50",     text: "text-blue-700",    active: "bg-blue-500" },
  DCH: { icon: "🚗", bg: "bg-orange-50",   text: "text-orange-700",  active: "bg-orange-500" },
  DMH: { icon: "🏥", bg: "bg-red-50",      text: "text-red-700",     active: "bg-red-400" },
  DS:  { icon: "😷", bg: "bg-rose-50",     text: "text-rose-700",    active: "bg-rose-500" },
  DV:  { icon: "🌴", bg: "bg-teal-50",     text: "text-teal-700",    active: "bg-teal-500" },
  DET: { icon: "✈️", bg: "bg-indigo-50",   text: "text-indigo-700",  active: "bg-indigo-500" },
  V:   { icon: "🏖️", bg: "bg-purple-50",   text: "text-purple-700",  active: "bg-purple-500" },
  Li:  { icon: "📋", bg: "bg-amber-50",    text: "text-amber-700",   active: "bg-amber-500" },
  Cs:  { icon: "🗺️", bg: "bg-cyan-50",     text: "text-cyan-700",    active: "bg-cyan-500" },
};

function dotColor(status: StatusCode) {
  if (status === "Of") return "bg-emerald-500";
  if (status === "Tb") return "bg-blue-400";
  if (["DCH", "DMH", "DS", "DV", "DET"].includes(status)) return "bg-orange-400";
  if (status === "V") return "bg-purple-400";
  if (status === "Li") return "bg-red-400";
  return "bg-gray-300";
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export default function MonthCalendar({ currentPerson, maxSeats }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<StatusCode | null>(null);
  const [weekView, setWeekView] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/schedules?year=${year}&month=${month}`);
    setSchedules(await res.json().then((d: unknown) => Array.isArray(d) ? d : []));
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

  const canEdit = (d: Date) => !isPast(d) || isSameDay(d, new Date());

  async function saveStatus(date: Date, status: StatusCode | null) {
    if (!currentPerson) return;
    setSaving(true); setSaveError(null); setSavedStatus(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = status === null
        ? await fetch(`/api/schedules?personId=${currentPerson.id}&date=${dateStr}`, { method: "DELETE" })
        : await fetch("/api/schedules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personId: currentPerson.id, date: dateStr, status }),
          });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setSaveError((e as { error?: string }).error || "Error al guardar");
        return;
      }
      if (status !== null) setSavedStatus(status);
      await fetchSchedules();
      // No cerrar automáticamente — el usuario ve el conteo actualizado y cierra cuando quiera
    } catch { setSaveError("Error de conexión"); }
    finally { setSaving(false); }
  }

  // Calendar grid
  const padded = [...Array(firstDow).fill(null), ...days];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7) as (Date | null)[]);

  // Week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selDay = selectedDay;
  const selSchedules = selDay ? getDaySchedules(selDay) : [];
  const selOfCount = selSchedules.filter(s => s.status === "Of").length;
  const selFree = maxSeats - selOfCount;

  // Stats: usa el día seleccionado si hay uno, si no usa hoy
  const statsDay = selDay ?? new Date();
  const statsSchedules = getDaySchedules(statsDay);
  const statsOf = statsSchedules.filter(s => s.status === "Of").length;
  const statsFree = maxSeats - statsOf;
  const statsIsToday = isToday(statsDay);

  return (
    <div className="flex flex-col gap-4">

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}>
          <p className="text-xs font-semibold text-white/70 mb-1">
            {statsIsToday ? "En oficina hoy" : `En oficina · ${format(statsDay, "d MMM", { locale: es })}`}
          </p>
          <p className="text-3xl font-black">{loading ? "—" : statsOf}</p>
          <p className="text-xs text-white/60 mt-1">de {maxSeats} puestos</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: "#1a1a2e" }}>
          <p className="text-xs font-semibold text-white/50 mb-1">Puestos libres</p>
          <p className={`text-3xl font-black ${statsFree <= 0 ? "text-red-400" : statsFree <= 3 ? "text-amber-400" : "text-white"}`}>
            {loading ? "—" : statsFree}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {statsIsToday ? "disponibles hoy" : format(statsDay, "d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">‹</button>
          <div className="text-center">
            <p className="text-xs text-gray-400 leading-none mb-0.5">Presencialidad · Codelco</p>
            <p className="font-bold text-gray-900 capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</p>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">›</button>
        </div>

        {/* View toggle */}
        <div className="flex mx-4 mb-3 bg-gray-100 rounded-xl p-1 gap-1">
          {["Mes", "Semana"].map((v, i) => (
            <button key={v} onClick={() => setWeekView(i === 1)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                weekView === (i === 1) ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>{v}</button>
          ))}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-t border-gray-100">
          {DOW.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>)}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weekView ? (
          /* Week view */
          <div className="border-t border-gray-100 grid grid-cols-7">
            {weekDays.map((day, i) => {
              const ds = getDaySchedules(day);
              const my = getMyStatus(day);
              const isSelected = selDay && isSameDay(day, selDay);
              const past = isPast(day) && !isSameDay(day, new Date());
              return (
                <button key={i} onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`flex flex-col items-center py-3 gap-1.5 transition-colors ${past ? "opacity-40" : "hover:bg-gray-50"}`}>
                  <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                    style={isSelected ? { background: "linear-gradient(135deg,#f97316,#ef4444)", color: "white" }
                      : isToday(day) ? { background: "#1a1a2e", color: "white" } : { color: "#374151" }}>
                    {format(day, "d")}
                  </span>
                  <div className="flex gap-0.5 h-1.5 items-center">
                    {my && <div className={`w-1.5 h-1.5 rounded-full ${dotColor(my)}`} />}
                    {ds.filter(s => s.status === "Of" && s.personId !== currentPerson?.id).length > 0 && (
                      <div className="w-1 h-1 rounded-full bg-emerald-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Month view */
          <div className="border-t border-gray-100">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="min-h-[56px]" />;
                  const ds = getDaySchedules(day);
                  const my = getMyStatus(day);
                  const past = isPast(day) && !isSameDay(day, new Date());
                  const isSelected = selDay && isSameDay(day, selDay);
                  const weekend = di >= 5;
                  const dotStatuses = Array.from(new Set(ds.map(s => s.status))).slice(0, 3) as StatusCode[];

                  return (
                    <button key={di} onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`flex flex-col items-center py-2 gap-1 min-h-[56px] transition-colors w-full ${
                        weekend ? "bg-gray-50/50" : "hover:bg-gray-50"
                      } ${past ? "opacity-40" : ""}`}>
                      <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                        style={isSelected ? { background: "linear-gradient(135deg,#f97316,#ef4444)", color: "white" }
                          : isToday(day) ? { background: "#1a1a2e", color: "white" }
                          : { color: "#374151" }}>
                        {format(day, "d")}
                      </span>
                      <div className="flex gap-0.5 h-1.5 items-center">
                        {dotStatuses.map((s, idx) => (
                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${dotColor(s)}`} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal bottom sheet */}
      {selDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { setSelectedDay(null); setSaveError(null); setSavedStatus(null); }}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl max-h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {format(selDay, "EEEE", { locale: es })}
                  </p>
                  <h3 className="text-xl font-black text-gray-900 capitalize mt-0.5">
                    {format(selDay, "d 'de' MMMM", { locale: es })}
                  </h3>
                </div>
                <button onClick={() => { setSelectedDay(null); setSaveError(null); setSavedStatus(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg mt-1">×</button>
              </div>

              {/* Capacity */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${selFree <= 0 ? "bg-red-400" : selFree <= 3 ? "bg-amber-400" : "bg-emerald-400"}`}
                    style={{ width: `${Math.min(100, (selOfCount / maxSeats) * 100)}%` }} />
                </div>
                <span className={`text-sm font-black whitespace-nowrap ${selFree <= 0 ? "text-red-500" : selFree <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                  {selFree <= 0 ? "Sin puestos" : `${selFree} libres`}
                </span>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">

              {/* Status selector — only for registered users */}
              {canEdit(selDay) && currentPerson ? (
                <div className="px-5 py-4">

                  {/* Success feedback */}
                  {savedStatus && (
                    <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold"
                      style={{ background: "linear-gradient(135deg,#f97316,#ef4444)" }}>
                      <span className="text-lg">{STATUS_UI[savedStatus].icon}</span>
                      <span>Guardado: {STATUS_LABELS[savedStatus]}</span>
                      <span className="ml-auto">✓</span>
                    </div>
                  )}

                  {/* Error */}
                  {saveError && (
                    <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{saveError}</div>
                  )}

                  {/* Current status (if set) */}
                  {getMyStatus(selDay) && !savedStatus && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tu estado actual</p>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2"
                        style={{ borderColor: "#f97316", background: "linear-gradient(135deg,#fff7ed,#fef2f2)" }}>
                        <span className="text-2xl">{STATUS_UI[getMyStatus(selDay)!].icon}</span>
                        <div className="flex-1">
                          <p className="font-black text-gray-900">{STATUS_LABELS[getMyStatus(selDay)!]}</p>
                          <p className="text-xs text-gray-400">Toca otra opción para cambiar</p>
                        </div>
                        <span className="text-xs font-black text-orange-500 bg-orange-100 px-2 py-1 rounded-lg">
                          {getMyStatus(selDay)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status buttons */}
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {getMyStatus(selDay) ? "Cambiar a" : "¿Dónde estarás?"}
                  </p>

                  {/* Primary options: Of and Tb */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(["Of", "Tb"] as StatusCode[]).map(status => {
                      const full = status === "Of" && selFree <= 0 && getMyStatus(selDay) !== "Of";
                      const active = getMyStatus(selDay) === status;
                      const ui = STATUS_UI[status];
                      return (
                        <button key={status} disabled={full || saving} onClick={() => saveStatus(selDay, status)}
                          className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-semibold transition-all active:scale-95 ${
                            active ? "text-white shadow-lg scale-[1.02]" : `${ui.bg} ${ui.text} hover:opacity-90`
                          } ${full ? "opacity-30 cursor-not-allowed" : ""}`}
                          style={active ? { background: "linear-gradient(135deg,#f97316,#ef4444)" } : {}}>
                          <span className="text-2xl">{ui.icon}</span>
                          <div className="text-left">
                            <p className="text-xs font-black">{status}</p>
                            <p className="text-xs leading-tight">{STATUS_LABELS[status]}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Secondary options */}
                  <div className="grid grid-cols-2 gap-2">
                    {(ALL_STATUSES.filter(s => s !== "Of" && s !== "Tb") as StatusCode[]).map(status => {
                      const active = getMyStatus(selDay) === status;
                      const ui = STATUS_UI[status];
                      return (
                        <button key={status} disabled={saving} onClick={() => saveStatus(selDay, status)}
                          className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl font-semibold transition-all active:scale-95 ${
                            active ? "text-white shadow-md scale-[1.02]" : `${ui.bg} ${ui.text} hover:opacity-90`
                          }`}
                          style={active ? { background: "linear-gradient(135deg,#f97316,#ef4444)" } : {}}>
                          <span className="text-lg">{ui.icon}</span>
                          <div className="text-left">
                            <p className="text-xs font-black">{status}</p>
                            <p className="text-[11px] leading-tight">{STATUS_LABELS[status]}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Remove */}
                  {getMyStatus(selDay) && !saving && !savedStatus && (
                    <button onClick={() => saveStatus(selDay, null)}
                      className="w-full mt-3 py-2.5 text-sm text-red-400 hover:bg-red-50 rounded-xl transition-colors font-semibold border border-red-100">
                      Quitar mi estado
                    </button>
                  )}

                  {saving && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </div>
                  )}
                </div>
              ) : !canEdit(selDay) ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">
                  No puedes editar fechas pasadas
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
