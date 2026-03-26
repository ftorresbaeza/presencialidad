"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { STATUS_LABELS, StatusCode, ALL_STATUSES } from "@/lib/constants";

interface Person {
  id: string; name: string; type: string; email: string | null; active: boolean;
}
interface Schedule {
  personId: string; date: string; status: string;
  person: { id: string; name: string; type: string };
}
interface UserRecord {
  id: string; name: string | null; email: string | null; image: string | null;
  role: string; personId: string | null; createdAt: string;
}
interface LeaderEntry {
  id: string; name: string; type: string; office: number; remote: number; travel: number; total: number;
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
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

type Tab = "people" | "users" | "leaderboard" | "reports" | "config";

export default function AdminClient() {
  const [people, setPeople] = useState<Person[]>([]);
  const [maxSeats, setMaxSeats] = useState(30);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("INTERNAL");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [seatInput, setSeatInput] = useState("30");
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [showInactive, setShowInactive] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ topOffice: LeaderEntry[]; topTravel: LeaderEntry[]; topRemote: LeaderEntry[] } | null>(null);

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

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  async function loadLeaderboard() {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    setLeaderboard(data);
  }

  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "leaderboard") loadLeaderboard();
  }, [activeTab]);

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

  async function toggleRole(u: UserRecord) {
    const newRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, role: newRole }),
    });
    await loadUsers();
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

  const TABS: { id: Tab; label: string }[] = [
    { id: "people", label: "Personas" },
    { id: "users", label: "Usuarios" },
    { id: "leaderboard", label: "Ranking" },
    { id: "reports", label: "Reportes" },
    { id: "config", label: "Config" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F4F5F7" }}>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg">←</a>
          <div>
            <p className="text-xs text-gray-400 leading-none">Codelco</p>
            <h1 className="font-black text-gray-900 text-base leading-tight">Administración</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-none px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
              style={activeTab === tab.id ? { background: "linear-gradient(135deg, #f97316, #ef4444)" } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && activeTab === "people" ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── PEOPLE TAB ── */}
            {activeTab === "people" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h2 className="font-bold text-gray-900 mb-3">Agregar persona</h2>
                  <form onSubmit={addPerson} className="flex flex-col gap-3">
                    <input type="text" placeholder="Nombre completo" value={newName} onChange={e => setNewName(e.target.value)} required
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <input type="email" placeholder="Email (opcional)" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <select value={newType} onChange={e => setNewType(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="INTERNAL">Personal Interno</option>
                      <option value="EXTERNAL">Personal Externo</option>
                    </select>
                    <button type="submit" disabled={saving}
                      className="text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
                      Agregar
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">Personas ({shown.length})</h2>
                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
                      Ver inactivos
                    </label>
                  </div>
                  {[{ label: "Interno", list: internal }, { label: "Externo", list: external }].map(({ label, list }) =>
                    list.length > 0 && (
                      <div key={label}>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">{label} ({list.length})</p>
                        {list.map(p => (
                          <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(p.name)} ${!p.active ? "opacity-40" : ""}`}>
                                {initials(p.name)}
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${p.active ? "text-gray-900" : "text-gray-400"}`}>{p.name}</p>
                                {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                              </div>
                            </div>
                            <button onClick={() => toggleActive(p)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                                p.active ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
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

            {/* ── USERS TAB ── */}
            {activeTab === "users" && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Usuarios registrados</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Usuarios que han iniciado sesión con Google</p>
                </div>
                {users.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  users.map(u => {
                    const linkedPerson = people.find(p => p.id === u.personId);
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt={u.name || ""} className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(u.name || u.email || "U")}`}>
                            {initials(u.name || u.email || "U")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{u.name || "Sin nombre"}</p>
                            {u.role === "ADMIN" && (
                              <span className="text-xs bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Admin</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          {linkedPerson && <p className="text-xs text-emerald-600 truncate">→ {linkedPerson.name}</p>}
                        </div>
                        <button onClick={() => toggleRole(u)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                            u.role === "ADMIN"
                              ? "bg-orange-50 text-orange-500 hover:bg-orange-100"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}>
                          {u.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── LEADERBOARD TAB ── */}
            {activeTab === "leaderboard" && (
              <div className="flex flex-col gap-4">
                {!leaderboard ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <LeaderCard
                      title="Más días en oficina"
                      emoji="🏆"
                      entries={leaderboard.topOffice}
                      valueKey="office"
                      unit="días"
                      gradient="linear-gradient(135deg, #f97316, #ef4444)"
                    />
                    <LeaderCard
                      title="Más comisiones de servicio"
                      emoji="✈️"
                      entries={leaderboard.topTravel}
                      valueKey="travel"
                      unit="días"
                      gradient="linear-gradient(135deg, #3b82f6, #6366f1)"
                    />
                    <LeaderCard
                      title="Más días en teletrabajo"
                      emoji="🏠"
                      entries={leaderboard.topRemote}
                      valueKey="remote"
                      unit="días"
                      gradient="linear-gradient(135deg, #10b981, #06b6d4)"
                    />
                  </>
                )}
              </div>
            )}

            {/* ── REPORTS TAB ── */}
            {activeTab === "reports" && <ReportsTab people={people.filter(p => p.active)} />}

            {/* ── CONFIG TAB ── */}
            {activeTab === "config" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h2 className="font-bold text-gray-900 mb-1">Puestos disponibles</h2>
                  <p className="text-xs text-gray-400 mb-3">Número máximo de personas en oficina por día</p>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={200} value={seatInput} onChange={e => setSeatInput(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <button onClick={saveSeats} disabled={saving}
                      className="text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
                      Guardar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Actual: <strong>{maxSeats} puestos</strong></p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h2 className="font-bold text-gray-900 mb-1">Notificaciones Push</h2>
                  <p className="text-xs text-gray-400 mb-3">Enviar recordatorio a todos los suscriptores</p>
                  <button onClick={sendNotification}
                    className="w-full text-white py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
                    Enviar recordatorio semanal
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

/* ── Leaderboard Card ── */

interface LeaderCardProps {
  title: string; emoji: string; entries: LeaderEntry[];
  valueKey: "office" | "travel" | "remote";
  unit: string; gradient: string;
}

function LeaderCard({ title, emoji, entries, valueKey, unit, gradient }: LeaderCardProps) {
  const filtered = entries.filter(e => e[valueKey] > 0);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 text-white" style={{ background: gradient }}>
        <p className="text-sm font-black">{emoji} {title}</p>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-gray-300 text-sm py-6">Sin datos aún</p>
      ) : (
        filtered.slice(0, 5).map((e, i) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
            <span className={`w-6 text-center font-black text-sm ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-700" : "text-gray-300"}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{e.name}</p>
              <p className="text-xs text-gray-400">{e.type === "INTERNAL" ? "Interno" : "Externo"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-gray-900">{e[valueKey]}</p>
              <p className="text-xs text-gray-400">{unit}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Reports Tab ── */

interface ReportsTabProps { people: Person[] }

function ReportsTab({ people }: ReportsTabProps) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [refDate, setRefDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const dateRange = mode === "month"
    ? { start: startOfMonth(refDate), end: endOfMonth(refDate) }
    : { start: startOfWeek(refDate, { weekStartsOn: 1 }), end: endOfWeek(refDate, { weekStartsOn: 1 }) };

  const days = eachDayOfInterval(dateRange).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  useEffect(() => { loadSchedules(); }, [refDate, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSchedules() {
    setLoadingReport(true);
    const year = refDate.getFullYear();
    const month = refDate.getMonth() + 1;
    const res = await fetch(`/api/schedules?year=${year}&month=${month}`);
    const data = await res.json();
    if (mode === "week") {
      const startMonth = dateRange.start.getMonth() + 1;
      const endMonth = dateRange.end.getMonth() + 1;
      if (startMonth !== endMonth) {
        const res2 = await fetch(`/api/schedules?year=${dateRange.end.getFullYear()}&month=${endMonth}`);
        const data2 = await res2.json();
        setSchedules([...(Array.isArray(data) ? data : []), ...(Array.isArray(data2) ? data2 : [])]);
        setLoadingReport(false);
        return;
      }
    }
    setSchedules(Array.isArray(data) ? data : []);
    setLoadingReport(false);
  }

  function getStatus(personId: string, date: Date) {
    const s = schedules.find(sc => sc.personId === personId && sc.date.startsWith(format(date, "yyyy-MM-dd")));
    return s?.status || "";
  }

  function countSt(personId: string, status: string) {
    return schedules.filter(s => s.personId === personId && s.status === status).length;
  }

  function downloadCSV() {
    const header = ["Nombre", "Tipo", ...days.map(d => format(d, "dd/MM")), ...ALL_STATUSES.map(s => `Total ${s}`), "Total días"];
    const rows = people.map(p => [
      p.name,
      p.type === "INTERNAL" ? "Interno" : "Externo",
      ...days.map(d => getStatus(p.id, d)),
      ...ALL_STATUSES.map(s => String(countSt(p.id, s))),
      String(schedules.filter(s => s.personId === p.id && days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))).length),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presencialidad-${mode === "month" ? format(refDate, "yyyy-MM") : `semana-${format(dateRange.start, "dd-MM-yyyy")}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function navigate(dir: -1 | 1) {
    if (mode === "month") setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() + dir, 1));
    else setRefDate(dir === 1 ? addWeeks(refDate, 1) : subWeeks(refDate, 1));
  }

  const totalOf = schedules.filter(s => s.status === "Of" && days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex gap-1.5 mb-4 bg-gray-100 rounded-xl p-1">
          {(["month", "week"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>
              {m === "month" ? "Mensual" : "Semanal"}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg">‹</button>
          <span className="font-bold text-gray-900 capitalize text-sm">
            {mode === "month"
              ? format(refDate, "MMMM yyyy", { locale: es })
              : `${format(dateRange.start, "d MMM", { locale: es })} – ${format(dateRange.end, "d MMM yyyy", { locale: es })}`}
          </span>
          <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg">›</button>
        </div>
      </div>

      {!loadingReport && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3 text-center text-white" style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
            <p className="text-2xl font-black">{totalOf}</p>
            <p className="text-xs text-white/70">Visitas Of.</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-black text-blue-600">
              {schedules.filter(s => s.status === "Tb" && days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))).length}
            </p>
            <p className="text-xs text-gray-400">Teletrabajo</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-black text-gray-700">
              {schedules.filter(s => days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))).length}
            </p>
            <p className="text-xs text-gray-400">Total reg.</p>
          </div>
        </div>
      )}

      {loadingReport ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Vista previa</h3>
              <p className="text-xs text-gray-400 mt-0.5">{people.length} personas · {days.length} días hábiles</p>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
              ↓ CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[120px]">Persona</th>
                  {days.map(d => (
                    <th key={d.toISOString()} className="px-1.5 py-2 font-semibold text-gray-500 text-center min-w-[36px]">
                      <div>{format(d, "EEE", { locale: es }).slice(0, 2)}</div>
                      <div className="text-gray-400 font-normal">{format(d, "d")}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 font-semibold text-emerald-600 text-center min-w-[36px]">Of</th>
                  <th className="px-2 py-2 font-semibold text-blue-600 text-center min-w-[36px]">Tb</th>
                  <th className="px-2 py-2 font-semibold text-gray-500 text-center min-w-[36px]">+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {people.map(p => {
                  const ofCount = countSt(p.id, "Of");
                  const tbCount = countSt(p.id, "Tb");
                  const other = (schedules as Schedule[]).filter(s =>
                    s.personId === p.id && s.status !== "Of" && s.status !== "Tb" &&
                    days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))
                  ).length;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-white truncate max-w-[120px]">{p.name}</td>
                      {days.map(d => {
                        const status = getStatus(p.id, d);
                        return (
                          <td key={d.toISOString()} className="px-1 py-2 text-center">
                            {status ? (
                              <span className={`inline-block text-[10px] font-bold px-1 py-0.5 rounded ${
                                status === "Of" ? "bg-emerald-100 text-emerald-700" :
                                status === "Tb" ? "bg-blue-100 text-blue-700" :
                                status === "V" ? "bg-purple-100 text-purple-700" :
                                status === "Li" ? "bg-red-100 text-red-700" :
                                "bg-orange-100 text-orange-700"
                              }`}>{status}</span>
                            ) : <span className="text-gray-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold text-emerald-700">{ofCount || "—"}</td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700">{tbCount || "—"}</td>
                      <td className="px-2 py-2 text-center font-bold text-gray-500">{other || "—"}</td>
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
