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

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    window.addEventListener("load", checkDesktop);
    return () => {
      window.removeEventListener("resize", checkDesktop);
      window.removeEventListener("load", checkDesktop);
    };
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

      {/* Mobile: Team list below calendar */}
      {selDay && selSchedules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0073BF]" />
            Equipo - {format(selDay, "d MMM", { locale: es })}
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selSchedules.map((s, idx) => {
              const Icon = STATUS_ICONS[s.status];
              return (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-[#0073BF]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#0073BF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.person.name}</p>
                    <p className="text-xs text-gray-500">{STATUS_LABELS[s.status]}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0" style={getStatusBadgeStyle(s.status)}>
                    {s.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { setSelectedDay(null); setSaveError(null); setSavedStatus(null); }}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl max-h-[88vh] flex flex-col"
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

            <div className="overflow-y-auto flex-1">
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
