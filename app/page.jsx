"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  Upload,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

const complaintTypes = ["Desktop Problem", "Printer Problem", "Network Problem", "Software Problem", "CCTV Problem", "Internet Problem", "Other"];
const priorities = ["Low", "Medium", "High", "Emergency"];
const statuses = ["Pending", "Assigned", "In Progress", "Waiting for User", "Solved", "Closed"];

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: options.body instanceof FormData
      ? options.headers
      : { ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function Badge({ children, type }) {
  return <span className={`badge ${String(type || "").replaceAll(" ", "-").toLowerCase()}`}>{children}</span>;
}

function StatCard({ icon: Icon, title, value, text }) {
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon size={22} /></div>
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
        <small>{text}</small>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("user");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password, role }),
      });
      onLogin(data.user);
      window.setTimeout(() => window.location.reload(), 250);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo"><ShieldCheck size={36} /></div>
        <h1>Lotus Hospital IT Helpdesk</h1>
        <p>Department complaint & ticket management portal</p>

        <div className="role-tabs">
          <button className={role === "user" ? "active" : ""} onClick={() => setRole("user")}>User</button>
          <button className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>Admin</button>
          <button className={role === "technician" ? "active" : ""} onClick={() => setRole("technician")}>Technician</button>
        </div>

        <label>User ID</label>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={role === "admin" ? "admin" : "icu01"} />
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" onKeyDown={(e) => e.key === "Enter" && submit()} />
        {error && <div className="alert error">{error}</div>}
        <button className="primary-btn full" onClick={submit} disabled={loading}>{loading ? "Checking..." : "Login"}</button>
      </div>
    </div>
  );
}

function Sidebar({ user, page, setPage, logout }) {
  const adminMenu = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["tickets", Ticket, "All Tickets"],
    ["calendar", CalendarDays, "Calendar"],
    ["departments", Settings, "Department Management"],
    ["users", Users, "User Management"],
  ];
  const userMenu = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["raise", Plus, "Raise Ticket"],
    ["tickets", Ticket, "My Tickets"],
    ["calendar", CalendarDays, "Calendar"],
  ];
  const techMenu = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["tickets", Ticket, "Assigned Tickets"],
    ["calendar", CalendarDays, "Calendar"],
  ];
  const menu = user.role === "admin" ? adminMenu : user.role === "technician" ? techMenu : userMenu;

  return (
    <aside className="sidebar">
      <div className="brand"><div><ShieldCheck /></div><span>Lotus Helpdesk<small>{user.role} panel</small></span></div>
      <nav>{menu.map(([key, Icon, label]) => <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}><Icon size={18} />{label}</button>)}</nav>
      <button className="logout" onClick={logout}><LogOut size={18} /> Logout</button>
    </aside>
  );
}

function Header({ user, tickets, setSearch }) {
  return (
    <header className="topbar">
      <div>
        <h2>Welcome, {user.name}</h2>
        <p>{user.departmentName || "IT"} • {tickets.length} tickets loaded</p>
      </div>
      <div className="search-box"><Search size={18} /><input placeholder="Search ticket..." onChange={(e) => setSearch(e.target.value)} /></div>
    </header>
  );
}

function Dashboard({ user, tickets, setPage }) {
  const pending = tickets.filter((t) => t.status === "Pending").length;
  const inProgress = tickets.filter((t) => ["Assigned", "In Progress"].includes(t.status)).length;
  const solved = tickets.filter((t) => ["Solved", "Closed"].includes(t.status)).length;

  return (
    <div className="page-content">
      <div className="stats-grid">
        <StatCard icon={Ticket} title="Total Tickets" value={tickets.length} text="All complaints" />
        <StatCard icon={Clock} title="Pending" value={pending} text="Need action" />
        <StatCard icon={Wrench} title="In Progress" value={inProgress} text="Assigned / working" />
        <StatCard icon={CheckCircle2} title="Solved" value={solved} text="Completed" />
      </div>

      <div className="grid-two">
        <section className="panel wide">
          <div className="panel-head"><h3>Latest Tickets</h3><button className="primary-btn" onClick={() => setPage(user.role === "user" ? "raise" : "tickets")}>{user.role === "user" ? "+ New Ticket" : "View All"}</button></div>
          <TicketTable tickets={tickets.slice(0, 6)} admin={user.role !== "user"} />
        </section>
        <section className="blue-panel">
          <Upload size={36} />
          <h3>Photo Upload</h3>
          <p>Desktop error, printer issue, network screenshot/photo upload pannalam.</p>
          {user.role === "user" && <button onClick={() => setPage("raise")}>Raise Complaint</button>}
        </section>
      </div>
    </div>
  );
}

function TicketTable({ tickets, admin, onUpdate }) {
  if (!tickets.length) return <div className="empty">No tickets found.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Ticket ID</th><th>Department</th><th>Problem</th><th>Priority</th><th>Status</th><th>{admin ? "Assigned" : "Date"}</th><th>Photos</th></tr></thead>
        <tbody>{tickets.map((t) => <tr key={t.id}>
          <td className="ticket-no">{t.ticket_number}</td>
          <td>{t.departmentName}</td>
          <td><b>{t.complaint_type}</b><small>{t.asset_name || t.asset_number || "No asset"}</small></td>
          <td><Badge type={t.priority}>{t.priority}</Badge></td>
          <td>{onUpdate ? <select value={t.status} onChange={(e) => onUpdate(t.id, { status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select> : <Badge type={t.status}>{t.status}</Badge>}</td>
          <td>{admin ? t.assignedToName : new Date(t.created_at).toLocaleDateString()}</td>
          <td>{t.attachments?.length ? <a href={t.attachments[0].file_url} target="_blank">View</a> : "-"}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

function RaiseTicket({ departments, user, reloadTickets, setPage }) {
  const [form, setForm] = useState({
    department_id: user.departmentId || "",
    asset_name: "",
    asset_number: "",
    complaint_type: "Desktop Problem",
    priority: "Medium",
    description: "",
  });
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!form.department_id && departments[0]?.id) setForm((f) => ({ ...f, department_id: departments[0].id }));
  }, [departments]);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((file) => fd.append("files", file));
      await api("/api/tickets", { method: "POST", body: fd });
      setMessage("Ticket created successfully.");
      await reloadTickets();
      setPage("tickets");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content narrow">
      <section className="panel">
        <h3>Raise New Ticket</h3>
        <p className="muted">Problem details fill pannunga. Photo / screenshot optional.</p>
        <div className="form-grid">
          <label>Department<select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} disabled={user.role === "user"}>{departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}</select></label>
          <label>System / Desktop Name<input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} placeholder="ICU-PC-03" /></label>
          <label>Asset Number<input value={form.asset_number} onChange={(e) => setForm({ ...form, asset_number: e.target.value })} placeholder="Asset no." /></label>
          <label>Complaint Type<select value={form.complaint_type} onChange={(e) => setForm({ ...form, complaint_type: e.target.value })}>{complaintTypes.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Problem details type pannunga..." /></label>
        <div className="upload-box"><Upload /><b>Upload Photo / Screenshot</b><span>JPG, PNG, PDF</span><input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} /></div>
        {message && <div className="alert">{message}</div>}
        <button className="primary-btn" onClick={submit} disabled={loading}>{loading ? "Submitting..." : "Submit Ticket"}</button>
      </section>
    </div>
  );
}

function AdminTicketRow({ ticket, technicians, updateTicket }) {
  const [status, setStatus] = useState(ticket.status || "Pending");
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to || "");
  const [remark, setRemark] = useState(ticket.admin_remark || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      await updateTicket(ticket.id, {
        status,
        assigned_to: assignedTo,
        admin_remark: remark,
        comment: remark || `Status changed to ${status}`,
      });
      setMessage("Saved");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td className="ticket-no">{ticket.ticket_number}</td>
      <td>{ticket.departmentName}</td>
      <td><b>{ticket.complaint_type}</b><small>{ticket.description}</small></td>
      <td><Badge type={ticket.priority}>{ticket.priority}</Badge></td>
      <td><select value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></td>
      <td><select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); if (e.target.value && status === "Pending") setStatus("Assigned"); }}><option value="">Unassigned</option>{technicians.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td>
      <td><textarea className="remark-input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Admin remark / work note" /></td>
      <td>{ticket.attachments?.length ? <a href={ticket.attachments[0].file_url} target="_blank">View</a> : "-"}</td>
      <td><button className="small-btn" onClick={save} disabled={saving}>{saving ? "Saving" : "Save"}</button>{message && <small className="save-note">{message}</small>}</td>
    </tr>
  );
}

function TechnicianTicketRow({ ticket, updateTicket }) {
  const [status, setStatus] = useState(ticket.status || "Assigned");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (status === "Solved" && !remark.trim()) {
      setMessage("Solved panna remark compulsory.");
      return;
    }
    try {
      setSaving(true);
      setMessage("");
      await updateTicket(ticket.id, {
        status,
        admin_remark: remark || ticket.admin_remark || "",
        comment: remark || `Technician changed status to ${status}`,
      });
      setRemark("");
      setMessage("Updated");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td className="ticket-no">{ticket.ticket_number}</td>
      <td>{ticket.departmentName}</td>
      <td><b>{ticket.complaint_type}</b><small>{ticket.description}</small></td>
      <td><Badge type={ticket.priority}>{ticket.priority}</Badge></td>
      <td><select value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></td>
      <td><textarea className="remark-input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Work done / solved remark type pannunga" />{ticket.admin_remark && <small>Last remark: {ticket.admin_remark}</small>}</td>
      <td>{ticket.attachments?.length ? <a href={ticket.attachments[0].file_url} target="_blank">View</a> : "-"}</td>
      <td><button className="small-btn" onClick={save} disabled={saving}>{saving ? "Saving" : "Save"}</button>{message && <small className="save-note">{message}</small>}</td>
    </tr>
  );
}

function TicketsPage({ tickets, user, users, reloadTickets }) {
  const [status, setStatus] = useState("All");
  const technicians = users.filter((u) => u.role === "technician" && u.status === "Active");
  const visible = status === "All" ? tickets : tickets.filter((t) => t.status === status);

  async function updateTicket(id, updates) {
    await api(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    await reloadTickets();
  }

  if (user.role === "user") {
    return (
      <div className="page-content">
        <section className="panel">
          <div className="panel-head"><h3>My Tickets</h3><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
          <TicketTable tickets={visible} admin={false} />
        </section>
      </div>
    );
  }

  if (user.role === "technician") {
    return (
      <div className="page-content">
        <section className="panel">
          <div className="panel-head"><div><h3>Assigned Tickets</h3><p className="muted">Ticket solve pannumbodhu remark add pannunga.</p></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="table-wrap"><table><thead><tr><th>Ticket ID</th><th>Dept</th><th>Problem</th><th>Priority</th><th>Status</th><th>Technician Remark</th><th>Photo</th><th>Action</th></tr></thead><tbody>{visible.map((t) => <TechnicianTicketRow key={t.id} ticket={t} updateTicket={updateTicket} />)}</tbody></table>{!visible.length && <div className="empty">No tickets found.</div>}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content">
      <section className="panel">
        <div className="panel-head"><div><h3>All Tickets</h3><p className="muted">Assign technician, update status, and add admin/technician remarks.</p></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="table-wrap"><table><thead><tr><th>Ticket ID</th><th>Dept</th><th>Problem</th><th>Priority</th><th>Status</th><th>Assign</th><th>Remark</th><th>Photo</th><th>Action</th></tr></thead><tbody>{visible.map((t) => <AdminTicketRow key={t.id} ticket={t} technicians={technicians} updateTicket={updateTicket} />)}</tbody></table>{!visible.length && <div className="empty">No tickets found.</div>}</div>
      </section>
    </div>
  );
}

function CalendarView({ tickets }) {
  const grouped = useMemo(() => tickets.reduce((acc, t) => {
    const day = new Date(t.created_at).toISOString().slice(0, 10);
    acc[day] = acc[day] || [];
    acc[day].push(t);
    return acc;
  }, {}), [tickets]);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString("en", { month: "long" });
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1).toISOString().slice(0, 10));

  return <div className="page-content"><section className="panel"><h3>{monthName} {year} Complaint Calendar</h3><div className="calendar-grid">{days.map((date) => <div className="day-card" key={date}><b>{new Date(date).getDate()}</b>{(grouped[date] || []).map((t) => <span key={t.id}>{t.ticket_number}<small>{t.departmentName}</small></span>)}</div>)}</div></section></div>;
}

function DepartmentsPage({ departments, reloadDepartments }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function add() {
    try {
      await api("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department_name: name }) });
      setName("");
      setMessage("Department added.");
      await reloadDepartments();
    } catch (err) { setMessage(err.message); }
  }
  async function update(id, department_name) {
    await api(`/api/departments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department_name }) });
    await reloadDepartments();
  }

  return <div className="page-content"><section className="panel"><h3>Departments Management</h3><div className="inline-form"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New department name" /><button className="primary-btn" onClick={add}>Add Department</button></div>{message && <div className="alert">{message}</div>}<div className="table-wrap"><table><thead><tr><th>Department</th><th>Status</th><th>Action</th></tr></thead><tbody>{departments.map((d) => <DepartmentRow key={d.id} d={d} update={update} />)}</tbody></table></div></section></div>;
}
function DepartmentRow({ d, update }) {
  const [name, setName] = useState(d.department_name);
  return <tr><td><input value={name} onChange={(e) => setName(e.target.value)} /></td><td><Badge type={d.status}>{d.status}</Badge></td><td><button className="small-btn" onClick={() => update(d.id, name)}>Save</button></td></tr>;
}

function UsersPage({ departments, users, reloadUsers }) {
  const [form, setForm] = useState({ name: "", user_id: "", password: "", role: "user", department_id: "", phone: "" });
  const [message, setMessage] = useState("");
  useEffect(() => { if (!form.department_id && departments[0]?.id) setForm((f) => ({ ...f, department_id: departments[0].id })); }, [departments]);

  async function createUser() {
    try {
      await api("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setMessage("User created.");
      setForm({ name: "", user_id: "", password: "", role: "user", department_id: departments[0]?.id || "", phone: "" });
      await reloadUsers();
    } catch (err) { setMessage(err.message); }
  }

  return <div className="page-content"><section className="panel"><h3>Users Management</h3><p className="muted">Admin creates and edits User ID + Password. Email login illa.</p><div className="form-grid"><input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="User ID" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} /><input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option><option value="technician">Technician</option></select><select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>{departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}</select><input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><button className="primary-btn" onClick={createUser}>Create User</button>{message && <div className="alert">{message}</div>}<div className="table-wrap"><table><thead><tr><th>Name</th><th>User ID</th><th>New Password</th><th>Role</th><th>Department</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map((u) => <UserRow key={u.id} u={u} departments={departments} reloadUsers={reloadUsers} />)}</tbody></table></div></section></div>;
}

function UserRow({ u, departments, reloadUsers }) {
  const [edit, setEdit] = useState({
    name: u.name || "",
    user_id: u.user_id || "",
    password: "",
    role: u.role || "user",
    department_id: u.department_id || "",
    phone: u.phone || "",
    status: u.status || "Active",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveUser() {
    try {
      setSaving(true);
      setMessage("");
      const body = { ...edit };
      if (!body.password) delete body.password;
      await api(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setEdit((prev) => ({ ...prev, password: "" }));
      setMessage("Saved");
      await reloadUsers();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!confirm("Delete this user?")) return;
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      await reloadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return <tr><td><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></td><td><input value={edit.user_id} onChange={(e) => setEdit({ ...edit, user_id: e.target.value })} /></td><td><input value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder="Leave blank" /></td><td><select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option><option value="technician">Technician</option></select></td><td><select value={edit.department_id} onChange={(e) => setEdit({ ...edit, department_id: e.target.value })}><option value="">No Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}</select></td><td><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></td><td><select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option>Active</option><option>Inactive</option></select></td><td><div className="row-actions"><button className="small-btn" onClick={saveUser} disabled={saving}>{saving ? "Saving" : "Save"}</button><button className="small-btn danger" onClick={deleteUser}>Delete</button>{message && <small>{message}</small>}</div></td></tr>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const data = await api("/api/auth/me");
      if (data.user) setUser({ id: data.user.id, name: data.user.name, userId: data.user.userId, role: data.user.role, departmentId: data.user.departmentId, departmentName: data.user.departmentName });
    } catch {}
    setLoading(false);
  }
  async function reloadTickets() { const data = await api("/api/tickets"); setTickets(data.tickets || []); }
  async function reloadDepartments() { const data = await api("/api/departments"); setDepartments(data.departments || []); }
  async function reloadUsers() { if (user?.role === "admin") { const data = await api("/api/users"); setUsers(data.users || []); } }

  useEffect(() => { loadMe(); }, []);
  useEffect(() => { if (user) { reloadDepartments(); reloadTickets(); if (user.role === "admin") reloadUsers(); } }, [user]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null); setTickets([]); setDepartments([]); setUsers([]); setPage("dashboard");
  }

  const filteredTickets = tickets.filter((t) => [t.ticket_number, t.departmentName, t.complaint_type, t.description, t.status].join(" ").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading">Loading Lotus Helpdesk...</div>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="app-shell">
      <Sidebar user={user} page={page} setPage={setPage} logout={logout} />
      <main>
        <Header user={user} tickets={filteredTickets} setSearch={setSearch} />
        <div className="mobile-tabs"><button onClick={() => setPage("dashboard")}>Dashboard</button>{user.role === "user" && <button onClick={() => setPage("raise")}>Raise</button>}<button onClick={() => setPage("tickets")}>Tickets</button><button onClick={() => setPage("calendar")}>Calendar</button>{user.role === "admin" && <button onClick={() => setPage("departments")}>Departments</button>}{user.role === "admin" && <button onClick={() => setPage("users")}>Users</button>}</div>
        {page === "dashboard" && <Dashboard user={user} tickets={filteredTickets} setPage={setPage} />}
        {page === "raise" && <RaiseTicket departments={departments} user={user} reloadTickets={reloadTickets} setPage={setPage} />}
        {page === "tickets" && <TicketsPage tickets={filteredTickets} user={user} users={users} reloadTickets={reloadTickets} />}
        {page === "calendar" && <CalendarView tickets={filteredTickets} />}
        {page === "departments" && user.role === "admin" && <DepartmentsPage departments={departments} reloadDepartments={reloadDepartments} />}
        {page === "users" && user.role === "admin" && <UsersPage departments={departments} users={users} reloadUsers={reloadUsers} />}
      </main>
    </div>
  );
}
