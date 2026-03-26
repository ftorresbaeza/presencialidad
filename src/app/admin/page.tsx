"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { STATUS_LABELS, StatusCode, ALL_STATUSES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  type: string;
  email: string | null;
  active: boolean;
}

interface Schedule {
  personId: string;
  date: string;
  status: string;
  person: { id: string; name: string; type: string };
}

export default function AdminPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [maxSeats, setMaxSeats] = useState(30);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("INTERNAL");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [seatInput, setSeatInput] = useState("30");
  const [activeTab, setActiveTab] = useState<"people" | "config" | "reports">("people");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([fetch("/api/people"), fetch("/api/config")]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    setPeople(Array.isArray(pData) ? pData : []);
    setMaxSeats(cData.maxSeats);
    setSeatInput(String(cData.maxSeats));
    setLoading(false);
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType, email: newEmail }),
    });
    setNewName(""); setNewEmail("");
    await loadData();
    setSaving(false);
  }

  async function toggleActive(p: Person) {
    await fetch(`/api/people/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    await loadData();
  }

  async function saveSeats() {
    const n = parseInt(seatInput);
    if (!n || n < 1) return;
    setSaving(true);
    await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxSeats: n }),
    });
    setMaxSeats(n);
    setSaving(false);
  }

  async function sendNotification() {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Recordatorio de planificación",
        body: "Recuerda registrar tu presencialidad para la próxima semana",
        url: "/",
      }),
    });
    alert("Notificación enviada a todos los suscriptores");
  }

  const shown = people.filter((p) => showInactive ? true : p.active);
  const internal = shown.filter((p) => p.type === "INTERNAL");
  const external = shown.filter((p) => p.type === "EXTERNAL");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="p-1 hover:bg-blue-600 rounded-lg text-lg">←</a>
          <div>
            <h1 className="font-bold text-base">Administración</h1>
            <p className="text-blue-200 text-xs">Presencialidad Codelco</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["people", "reports", "config"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab === "people" ? "👥 Personas" : tab === "reports" ? "📊 Reportes" : "⚙️ Config"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Cargando...</div>
        ) : (
          <>
            {/* PEOPLE TAB */}
            {activeTab === "people" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">Agregar persona</h2>
                  <form onSubmit={addPerson} className="flex flex-col gap-3">
                    <input type="text" placeholder="Nombre completo" value={newName} onChange={(e) => setNewName(e.target.value)} required
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <input type="email" placeholder="Email (opcional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <select value={newType} onChange={(e) => setNewType(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="INTERNAL">Personal Interno</option>
                      <option value="EXTERNAL">Personal Externo</option>
                    </select>
                    <button type="submit" disabled={saving}
                      className="bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      Agregar
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Personas ({shown.length})</h2>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
                      Ver inactivos
                    </label>
                  </div>
                  {[{ label: "Interno", list: internal }, { label: "Externo", list: external }].map(({ label, list }) =>
                    list.length > 0 && (
                      <div key={label}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">{label} ({list.length})</p>
                        {list.map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${p.active ? "bg-green-400" : "bg-gray-300"}`} />
                              <div>
                                <p className={`text-sm font-medium ${p.active ? "text-gray-900" : "text-gray-400"}`}>{p.name}</p>
                                {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                              </div>
                            </div>
                            <button onClick={() => toggleActive(p)}
                              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                p.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}>
                              {p.active ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === "reports" && <ReportsTab people={people.filter((p) => p.active)} />}

            {/* CONFIG TAB */}
            {activeTab === "config" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-1">Puestos disponibles</h2>
                  <p className="text-xs text-gray-400 mb-3">Número máximo de personas en oficina por día</p>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={200} value={seatInput} onChange={(e) => setSeatInput(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={saveSeats} disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      Guardar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Actual: <strong>{maxSeats} puestos</strong></p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-1">Notificaciones Push</h2>
                  <p className="text-xs text-gray-400 mb-3">Enviar recordatorio a todos los suscriptores</p>
                  <button onClick={sendNotification}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                    📣 Enviar recordatorio semanal
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

interface ReportsTabProps {
  people: Person[];
}

function ReportsTab({ people }: ReportsTabProps) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [refDate, setRefDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Compute date range
  const dateRange = mode === "month"
    ? { start: startOfMonth(refDate), end: endOfMonth(refDate) }
    : { start: startOfWeek(refDate, { weekStartsOn: 1 }), end: endOfWeek(refDate, { weekStartsOn: 1 }) };

  const days = eachDayOfInterval(dateRange).filter((d) => d.getDay() !== 0 && d.getDay() !== 6); // weekdays only

  useEffect(() => {
    loadSchedules();
  }, [refDate, mode]);

  async function loadSchedules() {
    setLoadingReport(true);
    // For month mode, fetch the month; for week, fetch both months if week spans two
    const year = refDate.getFullYear();
    const month = refDate.getMonth() + 1;
    const res = await fetch(`/api/schedules?year=${year}&month=${month}`);
    const data = await res.json();

    // If week spans two months, fetch the other month too
    if (mode === "week") {
      const startMonth = dateRange.start.getMonth() + 1;
      const endMonth = dateRange.end.getMonth() + 1;
      if (startMonth !== endMonth) {
        const otherYear = dateRange.end.getFullYear();
        const res2 = await fetch(`/api/schedules?year=${otherYear}&month=${endMonth}`);
        const data2 = await res2.json();
        setSchedules([...(Array.isArray(data) ? data : []), ...(Array.isArray(data2) ? data2 : [])]);
        setLoadingReport(false);
        return;
      }
    }
    setSchedules(Array.isArray(data) ? data : []);
    setLoadingReport(false);
  }

  function getStatusForPersonDay(personId: string, date: Date): string {
    const dateStr = format(date, "yyyy-MM-dd");
    const s = schedules.find((sc) => sc.personId === personId && sc.date.startsWith(dateStr));
    return s?.status || "";
  }

  function countStatus(personId: string, status: string): number {
    return schedules.filter((s) => s.personId === personId && s.status === status).length;
  }

  function downloadCSV() {
    const statusCols = ALL_STATUSES;
    const header = [
      "Nombre", "Tipo",
      ...days.map((d) => format(d, "dd/MM")),
      ...statusCols.map((s) => `Total ${s}`),
      "Total días registrados"
    ];

    const rows = people.map((p) => {
      const dayValues = days.map((d) => getStatusForPersonDay(p.id, d));
      const totals = statusCols.map((s) => String(countStatus(p.id, s)));
      const totalDays = schedules.filter((s) => s.personId === p.id &&
        days.some((d) => s.date.startsWith(format(d, "yyyy-MM-dd")))).length;
      return [
        p.name,
        p.type === "INTERNAL" ? "Interno" : "Externo",
        ...dayValues,
        ...totals,
        String(totalDays)
      ];
    });

    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = mode === "month"
      ? format(refDate, "yyyy-MM", { locale: es })
      : `semana-${format(dateRange.start, "dd-MM-yyyy")}`;
    a.download = `presencialidad-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function navigate(dir: -1 | 1) {
    if (mode === "month") {
      setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() + dir, 1));
    } else {
      setRefDate(dir === 1 ? addWeeks(refDate, 1) : subWeeks(refDate, 1));
    }
  }

  const periodLabel = mode === "month"
    ? format(refDate, "MMMM yyyy", { locale: es })
    : `${format(dateRange.start, "d MMM", { locale: es })} – ${format(dateRange.end, "d MMM yyyy", { locale: es })}`;

  // Summary stats for the period
  const totalOf = schedules.filter((s) =>
    s.status === "Of" && days.some((d) => s.date.startsWith(format(d, "yyyy-MM-dd")))
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-2 mb-4">
          {(["month", "week"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}>
              {m === "month" ? "Mensual" : "Semanal"}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-lg">‹</button>
          <span className="font-semibold text-gray-900 capitalize text-sm">{periodLabel}</span>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-lg">›</button>
        </div>
      </div>

      {/* Summary cards */}
      {!loadingReport && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{totalOf}</p>
            <p className="text-xs text-green-600">Visitas Of.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {schedules.filter((s) => s.status === "Tb" && days.some((d) => s.date.startsWith(format(d, "yyyy-MM-dd")))).length}
            </p>
            <p className="text-xs text-blue-600">Teletrabajo</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">
              {schedules.filter((s) => days.some((d) => s.date.startsWith(format(d, "yyyy-MM-dd")))).length}
            </p>
            <p className="text-xs text-purple-600">Total reg.</p>
          </div>
        </div>
      )}

      {/* Table preview */}
      {loadingReport ? (
        <div className="text-center py-8 text-gray-400">Cargando datos...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Vista previa</h3>
              <p className="text-xs text-gray-400 mt-0.5">{people.length} personas · {days.length} días hábiles</p>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium">
              ⬇ CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[120px]">Persona</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} className="px-1.5 py-2 font-semibold text-gray-500 text-center min-w-[36px]">
                      <div>{format(d, "EEE", { locale: es }).slice(0, 2)}</div>
                      <div className="text-gray-400 font-normal">{format(d, "d")}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 font-semibold text-green-600 text-center min-w-[40px]">Of</th>
                  <th className="px-2 py-2 font-semibold text-blue-600 text-center min-w-[40px]">Tb</th>
                  <th className="px-2 py-2 font-semibold text-gray-500 text-center min-w-[40px]">Otros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {people.map((p) => {
                  const ofCount = countStatus(p.id, "Of");
                  const tbCount = countStatus(p.id, "Tb");
                  const otherCount = schedules.filter((s) =>
                    s.personId === p.id &&
                    s.status !== "Of" && s.status !== "Tb" &&
                    days.some((d) => s.date.startsWith(format(d, "yyyy-MM-dd")))
                  ).length;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white truncate max-w-[120px]">
                        {p.name}
                      </td>
                      {days.map((d) => {
                        const status = getStatusForPersonDay(p.id, d);
                        return (
                          <td key={d.toISOString()} className="px-1 py-2 text-center">
                            {status ? (
                              <span className={`inline-block text-[10px] font-bold px-1 py-0.5 rounded ${
                                status === "Of" ? "bg-green-100 text-green-700" :
                                status === "Tb" ? "bg-blue-100 text-blue-700" :
                                status === "V" ? "bg-purple-100 text-purple-700" :
                                status === "Li" ? "bg-red-100 text-red-700" :
                                "bg-orange-100 text-orange-700"
                              }`}>
                                {status}
                              </span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-semibold text-green-700">{ofCount || "—"}</td>
                      <td className="px-2 py-2 text-center font-semibold text-blue-700">{tbCount || "—"}</td>
                      <td className="px-2 py-2 text-center font-semibold text-gray-500">{otherCount || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
