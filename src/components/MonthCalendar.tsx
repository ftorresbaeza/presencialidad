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
interface Props {
  currentPerson: Person | null;
  maxSeats: number;
  isAdmin?: boolean;
  allPeople?: Person[];
}

const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const DOW_FULL = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

// Dot color per status category
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

const AVATAR_COLORS = [
  "bg-orange-400", "bg-emerald-500", "bg-blue-500", "bg-purple-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-amber-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function MonthCalendar({ currentPerson, maxSeats, isAdmin, allPeople }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weekView, setWeekView] = useState(false);
  const [adminPersonId, setAdminPersonId] = useState<string>(currentPerson?.id ?? "");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/schedules?year=${year}&month=${month}`);
    setSchedules(await res.json().then((d: unknown) => Array.isArray(d) ? d : []));
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
  useEffect(() => { if (currentPerson && !adminPersonId) setAdminPersonId(currentPerson.id); }, [currentPerson, adminPersonId]);

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const firstDow = (getDay(startOfMonth(currentDate)) + 6) % 7;

  const getDaySchedules = (d: Date) => schedules.filter(s => s.date.startsWith(format(d, "yyyy-MM-dd")));

  const getMyStatus = (d: Date): StatusCode | null => {
    if (!currentPerson) return null;
    return getDaySchedules(d).find(s => s.personId === currentPerson.id)?.status ?? null;
  };

  const canEdit = (d: Date) => !isPast(d) || isSameDay(d, new Date());

  // Effective person for saving (admin can choose)
  const effectivePersonId = isAdmin && adminPersonId ? adminPersonId : currentPerson?.id;
  const effectivePerson = isAdmin && allPeople
    ? allPeople.find(p => p.id === adminPersonId) ?? currentPerson
    : currentPerson;

  const getEffectiveStatus = (d: Date): StatusCode | null => {
    if (!effectivePerson) return null;
    return getDaySchedules(d).find(s => s.personId === effectivePerson.id)?.status ?? null;
  };

  async function saveStatus(date: Date, status: StatusCode | null) {
    if (!effectivePersonId) return;
    setSaving(true); setSaveError(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = status === null
        ? await fetch(`/api/schedules?personId=${effectivePersonId}&date=${dateStr}`, { method: "DELETE" })
        : await fetch("/api/schedules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personId: effectivePersonId, date: dateStr, status }),
          });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setSaveError((e as { error?: string }).error || "Error al guardar");
        return;
      }
      await fetchSchedules();
    } catch { setSaveError("Error de conexión"); }
    finally { setSaving(false); }
  }

  const padded = [...Array(firstDow).fill(null), ...days];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7) as (Date | null)[]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selDay = selectedDay;
  const selSchedules = selDay ? getDaySchedules(selDay) : [];
  const selOfCount = selSchedules.filter(s => s.status === "Of").length;
  const selFree = maxSeats - selOfCount;

  // Today quick stats
  const todaySchedules = getDaySchedules(new Date());
  const todayOf = todaySchedules.filter(s => s.status === "Of").length;
  const todayFree = maxSeats - todayOf;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}>
          <p className="text-xs font-semibold text-white/70 mb-1">En oficina hoy</p>
          <p className="text-3xl font-black">{loading ? "—" : todayOf}</p>
          <p className="text-xs text-white/60 mt-1">de {maxSeats} puestos</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: "#1a1a2e" }}>
          <p className="text-xs font-semibold text-white/50 mb-1">Puestos libres</p>
          <p className={`text-3xl font-black ${todayFree <= 0 ? "text-red-400" : todayFree <= 3 ? "text-amber-400" : "text-white"}`}>
            {loading ? "—" : todayFree}
          </p>
          <p className="text-xs text-white/40 mt-1">disponibles hoy</p>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* Nav */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
          >‹</button>
          <div className="text-center">
            <p className="text-xs text-gray-400 leading-none mb-0.5">Presencialidad · Codelco</p>
            <p className="font-bold text-gray-900 capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</p>
          </div>
          <button
            onClick={() => setCurrentDate(new Date(year, month, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
          >›</button>
        </div>

        {/* View toggle */}
        <div className="flex mx-4 mb-3 bg-gray-100 rounded-xl p-1 gap-1">
          {["Mes", "Semana"].map((v, i) => (
            <button key={v} onClick={() => setWeekView(i === 1)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                weekView === (i === 1)
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}>
              {v}
            </button>
          ))}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-t border-gray-100">
          {DOW.map(d => (
            <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weekView ? (
          /* ── Week view ── */
          <div className="border-t border-gray-100">
            <div className="grid grid-cols-7">
              {weekDays.map((day, i) => {
                const ds = getDaySchedules(day);
                const my = getMyStatus(day);
                const isSelected = selDay && isSameDay(day, selDay);
                const past = isPast(day) && !isSameDay(day, new Date());
                return (
                  <button key={i} onClick={() => setSelectedDay(isSameDay(day, selDay ?? new Date(-1)) ? null : day)}
                    className={`flex flex-col items-center py-3 gap-1.5 transition-colors ${past ? "opacity-40" : "hover:bg-gray-50"}`}>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                      isSelected ? "text-white" : isToday(day) ? "text-white" : "text-gray-700"
                    }`} style={isSelected ? { background: "linear-gradient(135deg, #f97316, #ef4444)" } : isToday(day) ? { background: "#1a1a2e" } : {}}>
                      {format(day, "d")}
                    </span>
                    {/* Dots */}
                    <div className="flex gap-0.5 h-1.5 items-center">
                      {my && <div className={`w-1.5 h-1.5 rounded-full ${dotColor(my)}`} />}
                      {ds.filter(s => s.status === "Of" && s.personId !== currentPerson?.id).length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Month view ── */
          <div className="border-t border-gray-100">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="py-3 min-h-[60px]" />;
                  const ds = getDaySchedules(day);
                  const my = getMyStatus(day);
                  const ofCount = ds.filter(s => s.status === "Of").length;
                  const past = isPast(day) && !isSameDay(day, new Date());
                  const isSelected = selDay && isSameDay(day, selDay);
                  const weekend = di >= 5;

                  // Unique status dots (max 3)
                  const dotStatuses = Array.from(new Set(ds.map(s => s.status))).slice(0, 3);

                  return (
                    <button key={di} onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`flex flex-col items-center py-2 gap-1 min-h-[60px] transition-colors ${
                        weekend ? "bg-gray-50/50" : "hover:bg-gray-50"
                      } ${past ? "opacity-40" : ""}`}>
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                        isSelected ? "text-white" : isToday(day) ? "text-white" : "text-gray-800"
                      }`} style={
                        isSelected ? { background: "linear-gradient(135deg, #f97316, #ef4444)" }
                        : isToday(day) ? { background: "#1a1a2e" }
                        : {}
                      }>
                        {format(day, "d")}
                      </span>
                      {/* Status dots */}
                      <div className="flex gap-0.5 h-1.5 items-center">
                        {dotStatuses.map((s, idx) => (
                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${dotColor(s)} ${my === s ? "ring-1 ring-offset-0 ring-gray-300" : ""}`} />
                        ))}
                        {!weekend && ofCount > 0 && !dotStatuses.includes("Of") && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Selected day panel ── */}
      {selDay && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Day header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                  {format(selDay, "EEEE", { locale: es })}
                </p>
                <h3 className="text-lg font-black text-gray-900 capitalize">
                  {format(selDay, "d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              <div className={`text-right`}>
                <p className={`text-2xl font-black ${selFree <= 0 ? "text-red-500" : selFree <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                  {selFree <= 0 ? "Lleno" : selFree}
                </p>
                <p className="text-xs text-gray-400">{selFree <= 0 ? "" : "puestos libres"}</p>
              </div>
            </div>
            {/* Capacity bar */}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${selFree <= 0 ? "bg-red-400" : selFree <= 3 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${Math.min(100, (selOfCount / maxSeats) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{selOfCount} de {maxSeats} puestos ocupados</p>
          </div>

          {/* Admin person selector */}
          {isAdmin && allPeople && allPeople.length > 0 && canEdit(selDay) && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Registrar para</p>
              <select value={adminPersonId} onChange={e => setAdminPersonId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
                {allPeople.filter(p => p.id !== undefined).map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.id === currentPerson?.id ? " (yo)" : ""}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status selector */}
          {canEdit(selDay) && effectivePerson && (
            <div className="px-4 py-3 border-b border-gray-100">
              {saveError && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{saveError}</div>
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {isAdmin && effectivePerson.id !== currentPerson?.id ? `Estado de ${effectivePerson.name.split(" ")[0]}` : "Mi estado"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_STATUSES.map(status => {
                  const full = status === "Of" && selFree <= 0 && getEffectiveStatus(selDay) !== "Of";
                  const active = getEffectiveStatus(selDay) === status;
                  return (
                    <button key={status} disabled={full || saving} onClick={() => saveStatus(selDay, status)}
                      className={`py-3 px-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition-all active:scale-95 ${
                        active
                          ? "text-white shadow-md" + (status === "Of" ? "" : "")
                          : STATUS_BADGE_COLORS[status] + " border"
                      } ${full ? "opacity-30 cursor-not-allowed" : "hover:opacity-90"}`}
                      style={active ? { background: "linear-gradient(135deg, #f97316, #ef4444)" } : {}}>
                      <span className="truncate mr-1 text-left text-xs">{STATUS_LABELS[status]}</span>
                      <span className={`text-xs font-black shrink-0 ${active ? "text-white/80" : ""}`}>{status}</span>
                    </button>
                  );
                })}
              </div>
              {getEffectiveStatus(selDay) && (
                <button onClick={() => saveStatus(selDay, null)} disabled={saving}
                  className="w-full mt-2 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium">
                  Quitar estado
                </button>
              )}
              {saving && <p className="text-center text-xs text-gray-400 mt-2">Guardando...</p>}
            </div>
          )}

          {/* People in office that day */}
          {selSchedules.filter(s => s.status === "Of").length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                En oficina · {selSchedules.filter(s => s.status === "Of").length}
              </p>
              <div className="flex flex-col gap-2">
                {selSchedules.filter(s => s.status === "Of").map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(s.person.name)}`}>
                      {initials(s.person.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.person.name}</p>
                      <p className="text-xs text-gray-400">{s.person.type === "INTERNAL" ? "Interno" : "Externo"}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Of</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other statuses */}
          {selSchedules.filter(s => s.status !== "Of").length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3">Otros estados</p>
              <div className="flex flex-wrap gap-1.5">
                {selSchedules.filter(s => s.status !== "Of").map(s => (
                  <span key={s.id} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGE_COLORS[s.status]}`}>
                    {s.person.name.split(" ")[0]} · {s.status}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selSchedules.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-300 text-sm">Nadie registrado aún</div>
          )}
        </div>
      )}
    </div>
  );
}
