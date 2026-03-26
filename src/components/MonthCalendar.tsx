"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isPast, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { StatusCode, ALL_STATUSES, STATUS_LABELS, STATUS_BADGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import StatusBadge from "./StatusBadge";

interface Person {
  id: string;
  name: string;
  type: string;
}

interface Schedule {
  id: string;
  personId: string;
  date: string;
  status: StatusCode;
  person: { id: string; name: string; type: string };
}

interface MonthCalendarProps {
  currentPerson: Person | null;
  maxSeats: number;
}

export default function MonthCalendar({ currentPerson, maxSeats }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [weekView, setWeekView] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/schedules?year=${year}&month=${month}`);
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const firstDayOfWeek = (getDay(startOfMonth(currentDate)) + 6) % 7; // Monday start

  function getSchedulesForDay(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter((s) => s.date.startsWith(dateStr));
  }

  function getMyStatusForDay(date: Date): StatusCode | null {
    if (!currentPerson) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    const s = schedules.find((sc) => sc.personId === currentPerson.id && sc.date.startsWith(dateStr));
    return s?.status || null;
  }

  function getOfficeCount(date: Date): number {
    return getSchedulesForDay(date).filter((s) => s.status === "Of").length;
  }

  function canEdit(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isPast(date) || isSameDay(date, today);
  }

  async function saveStatus(date: Date, status: StatusCode | null) {
    if (!currentPerson) return;
    setModalLoading(true);
    setModalError(null);

    try {
      let res: Response;
      if (status === null) {
        res = await fetch(
          `/api/schedules?personId=${currentPerson.id}&date=${format(date, "yyyy-MM-dd")}`,
          { method: "DELETE" }
        );
      } else {
        res = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: currentPerson.id,
            date: format(date, "yyyy-MM-dd"),
            status,
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al guardar" }));
        setModalError(err.error || "Error al guardar");
        return;
      }

      await fetchSchedules();
      setSelectedDay(null);
    } catch {
      setModalError("Error de conexión");
    } finally {
      setModalLoading(false);
    }
  }

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Get weeks for current month
  function getWeeks() {
    const weeks: Date[][] = [];
    let week: Date[] = [];
    const allDays = [...Array(firstDayOfWeek).fill(null), ...days];
    allDays.forEach((day, i) => {
      if (i % 7 === 0 && week.length) { weeks.push(week); week = []; }
      week.push(day);
    });
    if (week.length) weeks.push(week);
    return weeks;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-3 border border-gray-100">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-900 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-blue-600 hover:underline"
          >
            Hoy
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(new Date(year, month, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
        >
          ›
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setWeekView(false)}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${!weekView ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Mes
        </button>
        <button
          onClick={() => setWeekView(true)}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${weekView ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Semana
        </button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDays.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weekView ? (
            // Show current week only
            <WeekDetail
              week={getCurrentWeek(days, firstDayOfWeek)}
              schedules={schedules}
              currentPerson={currentPerson}
              maxSeats={maxSeats}
              onDayClick={(day) => canEdit(day) && currentPerson && setSelectedDay(day)}
            />
          ) : (
            // Full month
            <div>
              {getWeeks().map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-0">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="min-h-[72px] bg-gray-50/50" />;
                    const daySchedules = getSchedulesForDay(day);
                    const myStatus = getMyStatusForDay(day);
                    const officeCount = daySchedules.filter((s) => s.status === "Of").length;
                    const isWeekend = di >= 5;
                    const past = isPast(day) && !isSameDay(day, new Date());
                    const editable = canEdit(day) && !!currentPerson;

                    return (
                      <div
                        key={di}
                        onClick={() => editable && setSelectedDay(day)}
                        className={`min-h-[72px] p-1.5 border-r border-gray-50 last:border-0 transition-colors relative
                          ${isWeekend ? "bg-gray-50" : "bg-white"}
                          ${past ? "opacity-60" : ""}
                          ${editable ? "cursor-pointer hover:bg-blue-50" : ""}
                          ${isToday(day) ? "ring-2 ring-inset ring-blue-400" : ""}
                        `}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isToday(day) ? "text-blue-600" : "text-gray-700"}`}>
                            {format(day, "d")}
                          </span>
                          {!isWeekend && (
                            <span className={`text-[10px] font-medium px-1 rounded ${
                              officeCount >= maxSeats ? "bg-red-100 text-red-600" :
                              officeCount >= maxSeats * 0.9 ? "bg-orange-100 text-orange-600" :
                              "bg-green-100 text-green-600"
                            }`}>
                              {officeCount}/{maxSeats}
                            </span>
                          )}
                        </div>

                        {myStatus && (
                          <div className={`text-[10px] font-bold px-1 py-0.5 rounded text-center mb-1 ${STATUS_COLORS[myStatus]}`}>
                            {myStatus}
                          </div>
                        )}

                        {/* Office people dots */}
                        {!isWeekend && officeCount > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {daySchedules
                              .filter((s) => s.status === "Of")
                              .slice(0, 5)
                              .map((s) => (
                                <div
                                  key={s.id}
                                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                                  title={s.person.name}
                                />
                              ))}
                            {officeCount > 5 && (
                              <span className="text-[9px] text-gray-400">+{officeCount - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day detail modal */}
      {selectedDay && (
        <DayModal
          day={selectedDay}
          schedules={getSchedulesForDay(selectedDay)}
          myStatus={getMyStatusForDay(selectedDay)}
          maxSeats={maxSeats}
          loading={modalLoading}
          error={modalError}
          currentPerson={currentPerson}
          onSave={saveStatus}
          onClose={() => { setSelectedDay(null); setModalError(null); }}
        />
      )}
    </div>
  );
}

// ─── Week Detail View ──────────────────────────────────────────────────────────

function getCurrentWeek(days: Date[], firstDayOfWeek: number): Date[] {
  const today = new Date();
  const week = days.filter((d) => {
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return d >= start && d <= end;
  });

  if (week.length === 0) {
    // If current week not in month, return first week
    const allDays = [...Array(firstDayOfWeek).fill(null), ...days];
    return allDays.slice(0, 7) as Date[];
  }

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const result: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    result.push(d);
  }
  return result;
}

interface WeekDetailProps {
  week: Date[];
  schedules: Schedule[];
  currentPerson: Person | null;
  maxSeats: number;
  onDayClick: (day: Date) => void;
}

function WeekDetail({ week, schedules, currentPerson, maxSeats, onDayClick }: WeekDetailProps) {
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="divide-y divide-gray-50">
      {week.map((day, i) => {
        if (!day) return null;
        const daySchedules = schedules.filter((s) => s.date.startsWith(format(day, "yyyy-MM-dd")));
        const officeSchedules = daySchedules.filter((s) => s.status === "Of");
        const mySchedule = currentPerson ? daySchedules.find((s) => s.personId === currentPerson.id) : null;
        const isWeekend = i >= 5;
        const past = isPast(day) && !isSameDay(day, new Date());
        const editable = (!isPast(day) || isSameDay(day, new Date())) && !!currentPerson;

        return (
          <div
            key={i}
            onClick={() => editable && onDayClick(day)}
            className={`p-3 ${isWeekend ? "bg-gray-50" : ""} ${editable ? "cursor-pointer hover:bg-blue-50" : ""} ${past ? "opacity-60" : ""} ${isToday(day) ? "border-l-4 border-blue-400" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isToday(day) ? "text-blue-600" : "text-gray-800"}`}>
                  {weekDays[i]} {format(day, "d")}
                </span>
                {mySchedule && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_COLORS[mySchedule.status as StatusCode]}`}>
                    {mySchedule.status}
                  </span>
                )}
              </div>
              {!isWeekend && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  officeSchedules.length >= maxSeats ? "bg-red-100 text-red-600" :
                  officeSchedules.length >= maxSeats * 0.9 ? "bg-orange-100 text-orange-600" :
                  "bg-green-100 text-green-600"
                }`}>
                  {officeSchedules.length}/{maxSeats} en oficina
                </span>
              )}
            </div>

            {officeSchedules.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {officeSchedules.map((s) => (
                  <span key={s.id} className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                    {s.person.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Day Modal ────────────────────────────────────────────────────────────────

interface DayModalProps {
  day: Date;
  schedules: Schedule[];
  myStatus: StatusCode | null;
  maxSeats: number;
  loading: boolean;
  error: string | null;
  currentPerson: Person | null;
  onSave: (date: Date, status: StatusCode | null) => void;
  onClose: () => void;
}

function DayModal({ day, schedules, myStatus, maxSeats, loading, error, currentPerson, onSave, onClose }: DayModalProps) {
  const officeSchedules = schedules.filter((s) => s.status === "Of");
  const isFull = officeSchedules.length >= maxSeats;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 capitalize">
                {format(day, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {officeSchedules.length}/{maxSeats} puestos ocupados
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 text-xl">×</button>
          </div>

          {/* Capacity bar */}
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? "bg-red-500" : officeSchedules.length >= maxSeats * 0.9 ? "bg-orange-400" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, (officeSchedules.length / maxSeats) * 100)}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="mx-4 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 text-center">
            Guardando...
          </div>
        )}

        {/* Status selector */}
        {currentPerson && (
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Tu estado para este día:</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map((status) => {
                const isOffice = status === "Of";
                const disabled = isOffice && isFull && myStatus !== "Of";
                return (
                  <button
                    key={status}
                    disabled={disabled || loading}
                    onClick={() => onSave(day, status)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-between transition-all
                      ${myStatus === status ? STATUS_COLORS[status] + " ring-2 ring-offset-1 ring-blue-400" : STATUS_BADGE_COLORS[status] + " border"}
                      ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 active:scale-95"}
                    `}
                  >
                    <span>{STATUS_LABELS[status]}</span>
                    <StatusBadge status={status} />
                  </button>
                );
              })}
            </div>

            {myStatus && (
              <button
                onClick={() => onSave(day, null)}
                disabled={loading}
                className="w-full mt-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
              >
                Eliminar mi estado
              </button>
            )}
          </div>
        )}

        {/* People in office */}
        {officeSchedules.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">En oficina:</p>
            <div className="flex flex-wrap gap-1.5">
              {officeSchedules.map((s) => (
                <span key={s.id} className="text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
                  {s.person.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Other statuses */}
        {schedules.filter((s) => s.status !== "Of").length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Otros estados:</p>
            <div className="flex flex-col gap-1">
              {schedules
                .filter((s) => s.status !== "Of")
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{s.person.name}</span>
                    <StatusBadge status={s.status as StatusCode} />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
