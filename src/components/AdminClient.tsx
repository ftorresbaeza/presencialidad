"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { STATUS_LABELS, StatusCode, ALL_STATUSES } from "@/lib/constants";
import { 
  Users, Settings, Download, ChevronLeft, ChevronRight, 
  ArrowUp, Award, Building2, Home, Plane, Check, X, Shield
} from "lucide-react";

interface Schedule {
  personId: string; date: string; status: string;
  person: { id: string; name: string; type: string };
}
interface UserRecord {
  id: string; name: string | null; email: string | null; image: string | null;
  role: string; personId: string | null; createdAt: string;
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

type Tab = "users" | "reports" | "config";

export default function AdminClient() {
  const [maxSeats, setMaxSeats] = useState(30);
  const [saving, setSaving] = useState(false);
  const [seatInput, setSeatInput] = useState("30");
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => {
      setMaxSeats(d.maxSeats);
      setSeatInput(String(d.maxSeats));
    });
    loadUsers();
  }, []);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
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
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Recordatorio de planificación",
        body: "Recuerda registrar tu presencialidad para la próxima semana",
        url: "/",
      }),
    });
    const data = await res.json();
    if (data.error) {
      alert(`Error: ${data.error}`);
    } else {
      alert(`Enviado a ${data.sent} de ${data.total} suscriptores`);
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string; gradient: string }[] = [
    { id: "users", label: "Usuarios", icon: Users, desc: "Gestionar accesos y roles", gradient: "#0073BF" },
    { id: "reports", label: "Reportes", icon: Download, desc: "Exportar datos", gradient: "#10b981" },
    { id: "config", label: "Config", icon: Settings, desc: "Ajustes del sistema", gradient: "#F58427" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F4F5F7" }}>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div className="flex-1">
            <p className="text-xs text-gray-400 leading-none">Codelco</p>
            <h1 className="font-black text-gray-900 text-base leading-tight">Administración</h1>
          </div>
          {activeTab && (
            <button
              onClick={() => setActiveTab(null)}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
            >
              Volver
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {!activeTab ? (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative overflow-hidden rounded-2xl p-4 text-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  style={{ background: tab.gradient }}
                >
                  <div className="flex justify-center">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <p className="mt-2 font-black text-white text-sm">{tab.label}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">{tab.desc}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-none flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.id ? "text-white" : "bg-white text-gray-500"
                  }`}
                  style={activeTab === tab.id ? { background: tab.gradient } : {}}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <>
          {activeTab === "users" && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Usuarios registrados</h2>
                <p className="text-xs text-gray-400 mt-0.5">Usuarios que han iniciado sesión con Google</p>
              </div>
              {users.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-[#0073BF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                users.map(u => {
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                      {u.image ? (
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
                            <span className="text-xs bg-[#0073BF]/10 text-[#0073BF] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        <p className="text-xs text-emerald-600">{u.personId ? "Vinculado" : "Sin vincular"}</p>
                      </div>
                      <button onClick={() => toggleRole(u)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                          u.role === "ADMIN"
                            ? "bg-red-50 text-red-500 hover:bg-red-100"
                            : "bg-[#0073BF]/10 text-[#0073BF] hover:bg-[#0073BF]/20"
                        }`}>
                        {u.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "reports" && <ReportsTab users={users} />}

          {activeTab === "config" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h2 className="font-bold text-gray-900 mb-1">Puestos disponibles</h2>
                <p className="text-xs text-gray-400 mb-3">Número máximo de personas en oficina por día</p>
                <div className="flex gap-2">
                  <input type="number" min={1} max={200} value={seatInput} onChange={e => setSeatInput(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0073BF]" />
                  <button onClick={saveSeats} disabled={saving}
                    className="text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: "#0073BF" }}>
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
                  style={{ background: "#0073BF" }}>
                  Enviar recordatorio semanal
                </button>
              </div>
            </div>
          )}
        </>
      </main>
    </div>
  );
}

function ReportsTab({ users }: { users: UserRecord[] }) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [refDate, setRefDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const dateRange = mode === "month"
    ? { start: startOfMonth(refDate), end: endOfMonth(refDate) }
    : { start: startOfWeek(refDate, { weekStartsOn: 1 }), end: endOfWeek(refDate, { weekStartsOn: 1 }) };

  const days = eachDayOfInterval(dateRange).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  useEffect(() => { loadSchedules(); }, [refDate, mode]);

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

  const registeredUsers = users.filter(u => u.personId);

  function downloadCSV() {
    const header = ["Nombre", ...days.map(d => format(d, "dd/MM")), ...ALL_STATUSES.map(s => `Total ${s}`), "Total días"];
    const rows = registeredUsers.map(u => [
      u.name || u.email || "",
      ...days.map(d => getStatus(u.personId!, d)),
      ...ALL_STATUSES.map(s => String(countSt(u.personId!, s))),
      String(schedules.filter(s => s.personId === u.personId && days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))).length),
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
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900 capitalize text-sm">
            {mode === "month"
              ? format(refDate, "MMMM yyyy", { locale: es })
              : `${format(dateRange.start, "d MMM", { locale: es })} - ${format(dateRange.end, "d MMM yyyy", { locale: es })}`}
          </span>
          <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!loadingReport && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3 text-center text-white" style={{ background: "#0073BF" }}>
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
          <div className="w-5 h-5 border-2 border-[#0073BF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Vista previa</h3>
              <p className="text-xs text-gray-400 mt-0.5">{registeredUsers.length} usuarios · {days.length} días hábiles</p>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-xl font-semibold"
              style={{ background: "#10b981" }}>
              <Download className="w-4 h-4" /> CSV
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
                  <th className="px-2 py-2 font-semibold text-[#0073BF] text-center min-w-[36px]">Of</th>
                  <th className="px-2 py-2 font-semibold text-blue-600 text-center min-w-[36px]">Tb</th>
                  <th className="px-2 py-2 font-semibold text-gray-500 text-center min-w-[36px]">+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registeredUsers.map(u => {
                  const pid = u.personId!;
                  const ofCount = countSt(pid, "Of");
                  const tbCount = countSt(pid, "Tb");
                  const other = (schedules as Schedule[]).filter(s =>
                    s.personId === pid && s.status !== "Of" && s.status !== "Tb" &&
                    days.some(d => s.date.startsWith(format(d, "yyyy-MM-dd")))
                  ).length;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-white truncate max-w-[120px]">{u.name || u.email}</td>
                      {days.map(d => {
                        const status = getStatus(pid, d);
                        return (
                          <td key={d.toISOString()} className="px-1 py-2 text-center">
                            {status ? (
                              <span className={`inline-block text-[10px] font-bold px-1 py-0.5 rounded ${
                                status === "Of" ? "bg-[#0073BF]/10 text-[#0073BF]" :
                                status === "Tb" ? "bg-yellow-100 text-yellow-700" :
                                status === "V" ? "bg-purple-100 text-purple-700" :
                                status === "Li" ? "bg-red-100 text-red-700" :
                                "bg-orange-100 text-orange-700"
                              }`}>{status}</span>
                            ) : <span className="text-gray-200">-</span>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold text-[#0073BF]">{ofCount || "-"}</td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700">{tbCount || "-"}</td>
                      <td className="px-2 py-2 text-center font-bold text-gray-500">{other || "-"}</td>
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
