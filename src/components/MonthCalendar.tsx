"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isPast, isSameDay, startOfWeek, endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { StatusCode, ALL_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { 
  Building2, Home, Car, Heart, Plane, Sun, FileText, Map, 
  ChevronLeft, ChevronRight, X, Check, Users, Download, 
  Settings, UserCog, BarChart3, Calendar
} from "lucide-react";

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

const STATUS_ICONS: Record<StatusCode, React.ElementType> = {
  Of: Building2,
  Tb: Home,
  DCH: Car,
  DMH: Heart,
  DS: Heart,
  DV: Sun,
  DET: Plane,
  V: Sun,
  Li: FileText,
  Cs: Map,
};

const STATUS_UI: Record<StatusCode, { bg: string; text: string; active: string }> = {
  Of:  { bg: "bg-blue-50",      text: "text-blue-700",     active: "bg-[#0073BF]" },
  Tb:  { bg: "bg-yellow-50",   text: "text-yellow-700", active: "bg-[#FFC600]" },
  DCH: { bg: "bg-orange-50",  text: "text-orange-700", active: "bg-[#F58427]" },
  DMH: { bg: "bg-orange-50",  text: "text-orange-700", active: "bg-[#F58427]" },
  DS:  { bg: "bg-orange-50",  text: "text-orange-700", active: "bg-[#F58427]" },
  DV:  { bg: "bg-orange-50",  text: "text-orange-700", active: "bg-[#F58427]" },
  DET: { bg: "bg-orange-50",  text: "text-orange-700", active: "bg-[#F58427]" },
  V:   { bg: "bg-purple-50",  text: "text-purple-700", active: "bg-purple-500" },
  Li:  { bg: "bg-red-50",     text: "text-red-700",    active: "bg-red-400" },
  Cs:  { bg: "bg-teal-50",    text: "text-teal-700",   active: "bg-teal-500" },
};

function dotColor(status: StatusCode) {
  if (status === "Of") return "bg-[#0073BF]";
  if (status === "Tb") return "bg-[#FFC600]";
  if (["DCH", "DMH", "DS", "DV", "DET"].includes(status)) return "bg-[#F58427]";
  if (status === "V") return "bg-purple-400";
  if (status === "Li") return "bg-red-400";
  return "bg-gray-300";
}

function getStatusBadgeStyle(status: StatusCode) {
  if (status === "Of") return { backgroundColor: "#e0f2fe", color: "#0073BF" };
  if (status === "Tb") return { backgroundColor: "#fef9c3", color: "#a16207" };
  if (["DCH", "DMH", "DS", "DV", "DET"].includes(status)) return { backgroundColor: "#ffedd5", color: "#c2410c" };
  if (status === "V") return { backgroundColor: "#f3e8ff", color: "#7e22ce" };
  if (status === "Li") return { backgroundColor: "#fee2e2", color: "#b91c1c" };
  return { backgroundColor: "#f0fdf4", color: "#15803d" };
}

function getStatusIcon(status: StatusCode) {
  const Icon = STATUS_ICONS[status];
  return <Icon className="w-5 h-5" />;
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
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  const statsDay = selDay ?? new Date();
  const statsSchedules = getDaySchedules(statsDay);
  const statsOf = statsSchedules.filter(s => s.status === "Of").length;
  const statsFree = maxSeats - statsOf;
  const statsIsToday = isToday(statsDay);

  const peopleOnDate = (d: Date) => getDaySchedules(d)
    .filter(s => s.status === "Of")
    .map(s => s.person.name)
    .sort();

  if (isDesktop) {
    return (
      <div className="flex gap-6 h-full">
        <div className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-6 text-white" style={{ background: "#0073BF" }}>
              <p className="text-sm font-semibold text-white/70 mb-2">
                {statsIsToday ? "En oficina hoy" : `En oficina - ${format(statsDay, "d MMM", { locale: es })}`}
              </p>
              <p className="text-5xl font-black">{loading ? "-" : statsOf}</p>
              <p className="text-sm text-white/60 mt-2">de {maxSeats} puestos</p>
            </div>
            <div className="rounded-2xl p-6 text-white" style={{ background: "#1a1a2e" }}>
              <p className="text-sm font-semibold text-white/50 mb-2">Puestos libres</p>
              <p className={`text-5xl font-black ${statsFree <= 0 ? "text-red-400" : statsFree <= 3 ? "text-amber-400" : "text-white"}`}>
                {loading ? "-" : statsFree}
              </p>
              <p className="text-sm text-white/40 mt-2">
                {statsIsToday ? "disponibles hoy" : format(statsDay, "d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-400">Presencialidad - Codelco</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</p>
              </div>
              <button onClick={() => setCurrentDate(new Date(year, month, 1))}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="flex mx-6 mt-4 bg-gray-100 rounded-xl p-1 gap-1 w-fit">
              {["Mes", "Semana"].map((v, i) => (
                <button key={v} onClick={() => setWeekView(i === 1)}
                  className={`px-6 py-2 rounded-lg text-base font-semibold transition-all ${
                    weekView === (i === 1) ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}>{v}</button>
              ))}
            </div>

            <div className="grid grid-cols-7 border-t border-gray-100 mt-4">
              {DOW.map(d => <div key={d} className="py-4 text-center text-sm font-bold text-gray-400">{d}</div>)}
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-[#0073BF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : weekView ? (
                <div className="grid grid-cols-7 border-t border-gray-100">
                  {weekDays.map((day, i) => {
                    const ds = getDaySchedules(day);
                    const my = getMyStatus(day);
                    const isSelected = selDay && isSameDay(day, selDay);
                    const past = isPast(day) && !isSameDay(day, new Date());
                    const people = peopleOnDate(day);
                    return (
                      <button key={i} onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`flex flex-col items-center py-6 gap-3 transition-colors min-h-[200px] ${past ? "opacity-40" : "hover:bg-gray-50"}`}>
                        <span className="w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold"
                          style={isSelected ? { background: "#0073BF", color: "white" }
                            : isToday(day) ? { background: "#1a1a2e", color: "white" } : { color: "#374151" }}>
                          {format(day, "d")}
                        </span>
                        <div className="flex gap-1 h-2">
                          {my && <div className={`w-2 h-2 rounded-full ${dotColor(my)}`} />}
                          {ds.filter(s => s.status === "Of" && s.personId !== currentPerson?.id).length > 0 && (
                            <div className="w-2 h-2 rounded-full bg-[#0073BF]" />
                          )}
                        </div>
                        {people.length > 0 && (
                          <div className="text-xs text-gray-500 text-center px-2">
                            <span className="font-semibold text-[#0073BF]">{people.length}</span> en oficina
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border-t border-gray-100">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7">
                      {week.map((day, di) => {
                        if (!day) return <div key={di} className="min-h-[100px]" />;
                        const ds = getDaySchedules(day);
                        const my = getMyStatus(day);
                        const past = isPast(day) && !isSameDay(day, new Date());
                        const isSelected = selDay && isSameDay(day, selDay);
                        const weekend = di >= 5;
                        const dotStatuses = Array.from(new Set(ds.map(s => s.status))).slice(0, 3) as StatusCode[];
                        const people = peopleOnDate(day);

                        return (
                          <button key={di} onClick={() => setSelectedDay(isSelected ? null : day)}
                            className={`flex flex-col items-center py-4 gap-2 min-h-[100px] transition-colors w-full ${
                              weekend ? "bg-gray-50/50" : "hover:bg-gray-50"
                            } ${past ? "opacity-40" : ""}`}>
                            <span className="w-10 h-10 flex items-center justify-center rounded-full text-base font-bold"
                              style={isSelected ? { background: "#0073BF", color: "white" }
                                : isToday(day) ? { background: "#1a1a2e", color: "white" }
                                : { color: "#374151" }}>
                              {format(day, "d")}
                            </span>
                            <div className="flex gap-0.5 h-2">
                              {dotStatuses.map((s, idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full ${dotColor(s)}`} />
                              ))}
                            </div>
                            {people.length > 0 && (
                              <div className="text-xs font-semibold text-[#0073BF]">{people.length}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 bg-white rounded-2xl shadow-sm p-5 flex flex-col overflow-hidden shrink-0">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0073BF]" />
            Equipo
          </h3>
          
          <div className="flex-1 overflow-auto">
            {selDay ? (
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-3 capitalize">
                  {format(selDay, "d 'de' MMMM", { locale: es })}
                </p>
                
                {canEdit(selDay) && currentPerson && (
                  <div className="mb-4 p-3 rounded-xl border-2" style={{ borderColor: "#0073BF", background: "#f0f9ff" }}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      {getMyStatus(selDay) ? "Tu estado" : "¿Dónde estarás?"}
                    </p>
                    {getMyStatus(selDay) && (
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(getMyStatus(selDay)!)}
                        <span className="font-semibold text-gray-900">{STATUS_LABELS[getMyStatus(selDay)!]}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {(["Of", "Tb"] as StatusCode[]).map(status => (
                        <button key={status} onClick={() => saveStatus(selDay, status)}
                          disabled={saving || (status === "Of" && selFree <= 0 && getMyStatus(selDay) !== "Of")}
                          className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                            getMyStatus(selDay) === status 
                              ? "bg-[#0073BF] text-white" 
                              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                          } ${saving ? "opacity-50" : ""}`}>
                          {status === "Of" ? "🏢 Oficina" : "🏠 Teletrabajo"}
                        </button>
                      ))}
                    </div>
                    {(ALL_STATUSES.filter(s => ["DCH", "DMH", "DS", "DV", "DET"].includes(s)) as StatusCode[]).map(status => (
                      <button key={status} onClick={() => saveStatus(selDay, status)}
                        disabled={saving}
                        className={`w-full py-2 px-3 mt-2 rounded-lg text-sm font-semibold transition-all ${
                          getMyStatus(selDay) === status 
                            ? "bg-[#F58427] text-white" 
                            : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                        } ${saving ? "opacity-50" : ""}`}>
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {selSchedules.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay registros</p>
                  ) : (
                    selSchedules.map((s, idx) => {
                      const Icon = STATUS_ICONS[s.status];
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50">
                          <div className="w-8 h-8 rounded-full bg-[#0073BF]/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-[#0073BF]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.person.name}</p>
                            <p className="text-xs text-gray-500">{STATUS_LABELS[s.status]}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Selecciona un día para ver el equipo</p>
            )}
          </div>
        </div>

        {selDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => { setSelectedDay(null); setSaveError(null); setSavedStatus(null); }}>
            <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl min-h-[70vh] max-h-[90vh]"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

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
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

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

<div className="overflow-y-auto pb-20">
                {canEdit(selDay) && currentPerson ? (
                  <div className="px-5 py-4">
                    {savedStatus && (
                      <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold"
                        style={{ background: "#0073BF" }}>
                        {getStatusIcon(savedStatus)}
                        <span>Guardado: {STATUS_LABELS[savedStatus]}</span>
                        <Check className="w-4 h-4 ml-auto" />
                      </div>
                    )}

                    {saveError && (
                      <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{saveError}</div>
                    )}

                    {getMyStatus(selDay) && !savedStatus && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tu estado actual</p>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2"
                          style={{ borderColor: "#0073BF", background: "#f0f9ff" }}>
                          <div className="w-12 h-12 rounded-xl bg-[#0073BF]/10 flex items-center justify-center">
                            {getStatusIcon(getMyStatus(selDay)!)}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-gray-900">{STATUS_LABELS[getMyStatus(selDay)!]}</p>
                            <p className="text-xs text-gray-400">Toca otra opción para cambiar</p>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={getStatusBadgeStyle(getMyStatus(selDay)!)}>
                            {getMyStatus(selDay)}
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      {getMyStatus(selDay) ? "Cambiar a" : "¿Dónde estarás?"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(["Of"] as StatusCode[]).map(status => {
                        const full = selFree <= 0 && getMyStatus(selDay) !== "Of";
                        const active = getMyStatus(selDay) === status;
                        const ui = STATUS_UI[status];
                        const Icon = STATUS_ICONS[status];
                        const baseClass = active ? "text-white shadow-lg scale-[1.02]" : ui.bg + " " + ui.text + " hover:opacity-90";
                        return (
                          <button key={status} disabled={full || saving} onClick={() => saveStatus(selDay, status)}
                            className={"flex items-center gap-3 px-4 py-4 rounded-2xl font-semibold transition-all active:scale-95 " + baseClass + (full ? " opacity-30 cursor-not-allowed" : "")}
                            style={active ? { background: "#0073BF" } : {}}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                              style={active ? { background: "rgba(255,255,255,0.2)" } : {}}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black">{status}</p>
                              <p className="text-xs leading-tight">{STATUS_LABELS[status]}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Divisiones</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(ALL_STATUSES.filter(s => ["DCH", "DMH", "DS", "DV", "DET"].includes(s)) as StatusCode[]).map(status => {
                        const active = getMyStatus(selDay) === status;
                        const ui = STATUS_UI[status];
                        const Icon = STATUS_ICONS[status];
                        const baseClass = active ? "text-white shadow-md scale-[1.02]" : ui.bg + " " + ui.text + " hover:opacity-90";
                        return (
                          <button key={status} disabled={saving} onClick={() => saveStatus(selDay, status)}
                            className={"flex items-center gap-2.5 px-3 py-3 rounded-2xl font-semibold transition-all active:scale-95 " + baseClass}
                            style={active ? { background: "#0073BF" } : {}}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={active ? { background: "rgba(255,255,255,0.2)" } : {}}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black">{status}</p>
                              <p className="text-[11px] leading-tight">{STATUS_LABELS[status]}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Otras</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(ALL_STATUSES.filter(s => ["V", "Li", "Cs", "Tb"].includes(s)) as StatusCode[]).map(status => {
                        const active = getMyStatus(selDay) === status;
                        const ui = STATUS_UI[status];
                        const Icon = STATUS_ICONS[status];
                        const baseClass = active ? "text-white shadow-md scale-[1.02]" : ui.bg + " " + ui.text + " hover:opacity-90";
                        return (
                          <button key={status} disabled={saving} onClick={() => saveStatus(selDay, status)}
                            className={"flex items-center gap-2.5 px-3 py-3 rounded-2xl font-semibold transition-all active:scale-95 " + baseClass}
                            style={active ? { background: "#0073BF" } : {}}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={active ? { background: "rgba(255,255,255,0.2)" } : {}}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black">{status}</p>
                              <p className="text-[11px] leading-tight">{STATUS_LABELS[status]}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {getMyStatus(selDay) && !saving && !savedStatus && (
                      <button onClick={() => saveStatus(selDay, null)}
                        className="w-full mt-3 py-2.5 text-sm text-red-400 hover:bg-red-50 rounded-xl transition-colors font-semibold border border-red-100">
                        Quitar mi estado
                      </button>
                    )}

                    {saving && (
                      <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-[#0073BF] border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-white" style={{ background: "#0073BF" }}>
          <p className="text-xs font-semibold text-white/70 mb-1">
            {statsIsToday ? "En oficina hoy" : `En oficina - ${format(statsDay, "d MMM", { locale: es })}`}
          </p>
          <p className="text-3xl font-black">{loading ? "-" : statsOf}</p>
          <p className="text-xs text-white/60 mt-1">de {maxSeats} puestos</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: "#1a1a2e" }}>
          <p className="text-xs font-semibold text-white/50 mb-1">Puestos libres</p>
          <p className={`text-3xl font-black ${statsFree <= 0 ? "text-red-400" : statsFree <= 3 ? "text-amber-400" : "text-white"}`}>
            {loading ? "-" : statsFree}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {statsIsToday ? "disponibles hoy" : format(statsDay, "d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-400 leading-none mb-0.5">Presencialidad - Codelco</p>
            <p className="font-bold text-gray-900 capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</p>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex mx-4 mb-3 bg-gray-100 rounded-xl p-1 gap-1">
          {["Mes", "Semana"].map((v, i) => (
            <button key={v} onClick={() => setWeekView(i === 1)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                weekView === (i === 1) ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>{v}</button>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-gray-100">
          {DOW.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>)}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-[#0073BF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weekView ? (
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
                    style={isSelected ? { background: "#0073BF", color: "white" }
                      : isToday(day) ? { background: "#1a1a2e", color: "white" } : { color: "#374151" }}>
                    {format(day, "d")}
                  </span>
                  <div className="flex gap-0.5 h-1.5 items-center">
                    {my && <div className={`w-1.5 h-1.5 rounded-full ${dotColor(my)}`} />}
                    {ds.filter(s => s.status === "Of" && s.personId !== currentPerson?.id).length > 0 && (
                      <div className="w-1 h-1 rounded-full bg-[#0073BF]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
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
                        style={isSelected ? { background: "#0073BF", color: "white" }
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

      {selDay && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0073BF]" />
            Equipo - {format(selDay, "d MMM", { locale: es })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {selSchedules.length === 0 ? (
              <p className="text-sm text-gray-400">No hay registros</p>
            ) : (
              selSchedules.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-xs">
                  <span className="font-semibold text-gray-800">{s.person.name}</span>
                  <span className="font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{s.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setSelectedDay(null); setSaveError(null); setSavedStatus(null); }}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl min-h-[70vh] max-h-[90vh]"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

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
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

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

            <div className="overflow-y-auto pb-20">
              {canEdit(selDay) && currentPerson ? (
                <div className="px-5 py-4">
                  {savedStatus && (
                    <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold"
                      style={{ background: "#0073BF" }}>
                      {getStatusIcon(savedStatus)}
                      <span>Guardado: {STATUS_LABELS[savedStatus]}</span>
                      <Check className="w-4 h-4 ml-auto" />
                    </div>
                  )}

                  {saveError && (
                    <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{saveError}</div>
                  )}

                  {getMyStatus(selDay) && !savedStatus && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tu estado actual</p>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2"
                        style={{ borderColor: "#0073BF", background: "#f0f9ff" }}>
                        <div className="w-12 h-12 rounded-xl bg-[#0073BF]/10 flex items-center justify-center">
                          {getStatusIcon(getMyStatus(selDay)!)}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-gray-900">{STATUS_LABELS[getMyStatus(selDay)!]}</p>
                          <p className="text-xs text-gray-400">Toca otra opción para cambiar</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg"
                          style={getStatusBadgeStyle(getMyStatus(selDay)!)}>
                          {getMyStatus(selDay)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {getMyStatus(selDay) ? "Cambiar a" : "¿Dónde estarás?"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(["Of"] as StatusCode[]).map(status => {
                      const full = selFree <= 0 && getMyStatus(selDay) !== "Of";
                      const active = getMyStatus(selDay) === status;
                      const ui = STATUS_UI[status];
                      const Icon = STATUS_ICONS[status];
                      return (
                        <button key={status} disabled={full || saving} onClick={() => saveStatus(selDay, status)}
                          className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-semibold transition-all active:scale-95 ${
                            active ? "text-white shadow-lg scale-[1.02]" : `${ui.bg} ${ui.text} hover:opacity-90`
                          } ${full ? "opacity-30 cursor-not-allowed" : ""}`}
                          style={active ? { background: "#0073BF" } : {}}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                            style={active ? { background: "rgba(255,255,255,0.2)" } : {}}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black">{status}</p>
                            <p className="text-xs leading-tight">{STATUS_LABELS[status]}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Divisiones</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(ALL_STATUSES.filter(s => ["DCH", "DMH", "DS", "DV", "DET"].includes(s)) as StatusCode[]).map(status => {
                      const active = getMyStatus(selDay) === status;
                      const ui = STATUS_UI[status];
                      const Icon = STATUS_ICONS[status];
                      return (
                        <button key={status} disabled={saving} onClick={() => saveStatus(selDay, status)}
                          className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl font-semibold transition-all active:scale-95 ${
                            active ? "text-white shadow-md scale-[1.02]" : `${ui.bg} ${ui.text} hover:opacity-90`
                          }`}
                          style={active ? { background: "#0073BF" } : {}}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={active ? { background: "rgba(255,255,255,0.2)" } : {}}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black">{status}</p>
                            <p className="text-[11px] leading-tight">{STATUS_LABELS[status]}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Otras</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(ALL_STATUSES.filter(s => ["V", "Li", "Cs", "Tb"].includes(s)) as StatusCode[]).map(status => {
                      const active = getMyStatus(selDay) === status;
                      const ui = STATUS_UI[status];
                      const Icon = STATUS_ICONS[status];
                      return (
                        <button key={status} disabled={saving} onClick={() => saveStatus(selDay, status)}
                          className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl font-semibold transition-all active:scale-95 ${
                            active ? "text-white shadow-md scale-[1.02]" : `${ui.bg} ${ui.text} hover:opacity-90`
                          }`}
                          style={active ? { background: "#0073BF" } : {}}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={active ? { background: "rgba(255,255,255,0.2)" } : {}}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black">{status}</p>
                            <p className="text-[11px] leading-tight">{STATUS_LABELS[status]}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selSchedules.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Equipo ({selSchedules.length})</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selSchedules.filter(s => s.personId !== currentPerson?.id).map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                            <div className="w-6 h-6 rounded-full bg-[#0073BF]/10 flex items-center justify-center text-[#0073BF] text-xs font-bold">
                              {s.person.name[0]}
                            </div>
                            <p className="text-xs font-semibold text-gray-800 truncate">{s.person.name}</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 ml-auto">{s.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {getMyStatus(selDay) && !saving && !savedStatus && (
                    <button onClick={() => saveStatus(selDay, null)}
                      className="w-full mt-3 py-2.5 text-sm text-red-400 hover:bg-red-50 rounded-xl transition-colors font-semibold border border-red-100">
                      Quitar mi estado
                    </button>
                  )}

                  {saving && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-[#0073BF] border-t-transparent rounded-full animate-spin" />
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
