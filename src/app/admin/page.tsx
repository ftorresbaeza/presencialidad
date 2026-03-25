"use client";

import { useState, useEffect } from "react";

interface Person {
  id: string;
  name: string;
  type: string;
  email: string | null;
  active: boolean;
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
  const [activeTab, setActiveTab] = useState<"people" | "config">("people");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch("/api/people"),
      fetch("/api/config"),
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    // Get all people including inactive for admin
    const allRes = await fetch("/api/people?all=true");
    const allData = allRes.ok ? await allRes.json() : pData;
    setPeople(Array.isArray(allData) ? allData : pData);
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
    setNewName("");
    setNewEmail("");
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
    alert("Notificación enviada");
  }

  const shown = people.filter((p) => showInactive ? true : p.active);
  const internal = shown.filter((p) => p.type === "INTERNAL");
  const external = shown.filter((p) => p.type === "EXTERNAL");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="p-1 hover:bg-blue-600 rounded-lg">
              ←
            </a>
            <div>
              <h1 className="font-bold text-base">Administración</h1>
              <p className="text-blue-200 text-xs">Presencialidad Codelco</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["people", "config"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab === "people" ? "👥 Personas" : "⚙️ Configuración"}
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
                {/* Add person form */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">Agregar persona</h2>
                  <form onSubmit={addPerson} className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="INTERNAL">Personal Interno</option>
                      <option value="EXTERNAL">Personal Externo</option>
                    </select>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Agregar
                    </button>
                  </form>
                </div>

                {/* People list */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Personas ({shown.length})</h2>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded"
                      />
                      Ver inactivos
                    </label>
                  </div>

                  {[{ label: "Interno", list: internal }, { label: "Externo", list: external }].map(({ label, list }) => (
                    list.length > 0 && (
                      <div key={label}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">
                          {label} ({list.length})
                        </p>
                        {list.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${p.active ? "bg-green-400" : "bg-gray-300"}`} />
                              <div>
                                <p className={`text-sm font-medium ${p.active ? "text-gray-900" : "text-gray-400"}`}>
                                  {p.name}
                                </p>
                                {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleActive(p)}
                              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                p.active
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}
                            >
                              {p.active ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* CONFIG TAB */}
            {activeTab === "config" && (
              <div className="flex flex-col gap-4">
                {/* Seats config */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-1">Puestos disponibles</h2>
                  <p className="text-xs text-gray-400 mb-3">Número máximo de personas en oficina por día</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={seatInput}
                      onChange={(e) => setSeatInput(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={saveSeats}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Actual: <strong>{maxSeats} puestos</strong></p>
                </div>

                {/* Push notifications */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h2 className="font-semibold text-gray-900 mb-1">Notificaciones Push</h2>
                  <p className="text-xs text-gray-400 mb-3">Enviar recordatorio a todos los suscriptores</p>
                  <button
                    onClick={sendNotification}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    📣 Enviar recordatorio semanal
                  </button>
                </div>

                {/* Info */}
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                  <h3 className="font-medium text-blue-900 text-sm mb-2">Información</h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Las notificaciones automáticas se envían cuando alguien reserva un puesto de oficina</li>
                    <li>• Se envía alerta cuando la oficina está al 90% de capacidad</li>
                    <li>• Los usuarios deben activar notificaciones desde su dispositivo</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
