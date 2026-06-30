import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

import {
  BadgeIndianRupee,
  Bell,
  Download,
  CheckCircle2,
  Clock,
  Archive,
  ChevronRight,
  CalendarDays,
  LogOut,
  Loader2,
  X,
} from "lucide-react";

export default function PayrollScreen() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [modules, setModules] = useState([]);
  const [rows, setRows] = useState([]);
  const [activeModule, setActiveModule] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("queue"); // queue | closed | inprocess
  const [closedData, setClosedData] = useState({ months: [] });
  const [inProcessData, setInProcessData] = useState({ modules: [] });
  const [selectedClosedMonth, setSelectedClosedMonth] = useState(null);
  const [expandedClosedModule, setExpandedClosedModule] = useState(null);
  const [closingModule, setClosingModule] = useState(null); // loading state for close button
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role.toLowerCase() !== "payroll") {
      alert("Access Denied: Payroll role required.");
      if (storedUser) {
        const r = storedUser.role.toLowerCase();
        if (r === "admin") navigate("/admin");
        else if (r === "maker") navigate("/maker");
        else if (r === "hrbp") navigate("/hrbp");
        else if (r === "hod") navigate("/hod");
        else navigate("/");
      } else {
        navigate("/");
      }
      return;
    }
    fetchConfig();
    fetchPayrollData();
    fetchNotifications();
    fetchClosedData();
    fetchInProcessData();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await API.get("/workflow/config");
      const allHeads = response.data.earning_heads;
      const currentUser = response.data.currentUser;
      
      let filtered = allHeads;
      if (currentUser && currentUser.allowed_modules && currentUser.allowed_modules.length > 0) {
        if (!currentUser.allowed_modules.includes("*")) {
          filtered = allHeads.filter(head => currentUser.allowed_modules.includes(head.name));
        }
      }
      
      setModules(filtered);
      if (filtered.length > 0) {
        setActiveModule(filtered[0].name);
      }
    } catch (error) {
      console.log("Failed to fetch configuration:", error);
    }
  };

  const fetchPayrollData = async () => {
    try {
      const response = await API.get("/workflow/payroll");
      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchClosedData = async () => {
    try {
      const response = await API.get("/workflow/closed");
      setClosedData(response.data);
      if (response.data.months.length > 0 && !selectedClosedMonth) {
        setSelectedClosedMonth(response.data.months[0].monthKey);
      }
    } catch (error) {
      console.log("Failed to fetch closed data:", error);
    }
  };

  const fetchInProcessData = async () => {
    try {
      const response = await API.get("/workflow/in-process");
      setInProcessData(response.data);
    } catch (error) {
      console.log("Failed to fetch in-process data:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await API.get("/notifications");
      setNotifications(response.data);
    } catch (error) {
      console.log("Failed to fetch notifications:", error);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await API.post("/notifications/mark-read");
      fetchNotifications();
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleCloseModule = async (moduleName) => {
    if (!confirm(`Are you sure you want to finalize and close all "${moduleName}" sheets? This action cannot be undone.`)) {
      return;
    }
    setClosingModule(moduleName);
    try {
      await API.post("/workflow/payroll/close", { module: moduleName });
      // Refresh all data
      await Promise.all([fetchPayrollData(), fetchClosedData(), fetchInProcessData()]);
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to close sheets");
    } finally {
      setClosingModule(null);
    }
  };

  const filteredRows = rows.filter(row => row.module === activeModule);

  const exportExcel = (rowsToExport, filename) => {
    const csvRows = [];
    csvRows.push(
      [
        "Employee Code",
        "Pay Component",
        "Payment Frequency",
        "Effective From",
        "Effective To",
        "Amount",
        "Reason",
        "Remarks",
        "Payment for the month",
      ].join(",")
    );

    (rowsToExport || filteredRows).forEach((row) => {
      csvRows.push(
        [
          `"${row.empCode || ""}"`,
          `"${row.type || ""}"`,
          `"${row.grade || ""}"`,
          `"${row.designation || ""}"`,
          `"${row.employeeHome || ""}"`,
          `"${row.amount || ""}"`,
          `"${row.overtimeHours || ""}"`,
          `"${row.remarks || ""}"`,
          `"${row.holidayDate || ""}"`,
        ].join(",")
      );
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${activeModule}.csv`;
    link.click();
  };

  // Get progress bar color based on percentage
  const getProgressColor = (progress) => {
    if (progress <= 25) return "#EF4444"; // red
    if (progress <= 50) return "#F59E0B"; // amber
    if (progress <= 75) return "#3B82F6"; // blue
    return "#22C55E"; // green
  };

  const getProgressBg = (progress) => {
    if (progress <= 25) return "#FEE2E2";
    if (progress <= 50) return "#FEF3C7";
    if (progress <= 75) return "#DBEAFE";
    return "#DCFCE7";
  };

  const topTabs = [
    { key: "queue", label: "Payroll Queue", icon: BadgeIndianRupee, count: rows.length },
    { key: "closed", label: "Closed / Processed", icon: Archive, count: closedData.months.reduce((sum, m) => sum + m.modules.reduce((s, mod) => s + mod.rowCount, 0), 0) },
    { key: "inprocess", label: "In Process", icon: Clock, count: inProcessData.modules.reduce((sum, m) => sum + m.totalRows, 0) },
  ];

  return (
    <div className="flex h-screen bg-[#F5F5F3] overflow-hidden">

      {/* SIDEBAR */}
      <div
        className="
          group
          w-[68px]
          hover:w-[220px]
          transition-all
          duration-300
          bg-[#111111]
          flex
          flex-col
          py-4
          overflow-hidden
        "
      >
        <div className="px-5 mb-8 flex items-center min-w-[220px]">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/7/75/1mg_Logo.png"
            alt="logo"
            className="w-8 brightness-0 invert"
          />
          <span
            className="
              ml-4
              text-white
              text-[14px]
              font-semibold
              opacity-0
              group-hover:opacity-100
            "
          >
            Payroll
          </span>
        </div>

        <div className="flex flex-col gap-2 px-3 overflow-y-auto flex-1 max-h-[calc(100vh-100px)]">
          {modules.map((item, index) => {
            let Icon = BadgeIndianRupee;
            return (
              <div
                key={index}
                onClick={() => {
                  setActiveModule(item.name);
                  setActiveTab("queue");
                }}
                className={`
                  flex
                  items-center
                  gap-4
                  h-[44px]
                  px-3
                  rounded-xl
                  cursor-pointer
                  min-w-[200px]
                  ${
                    activeModule === item.name && activeTab === "queue"
                      ? "bg-[#F26B5B] text-white"
                      : "text-[#B8B8B8] hover:bg-[#1E1E1E] hover:text-white"
                  }
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span
                  className="
                    opacity-0
                    group-hover:opacity-100
                    text-[13px]
                  "
                >
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <div className="h-[58px] bg-white border-b border-[#E7E3DC] px-6 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold">
              Payroll Dashboard
            </h1>
            <p className="text-[11px] text-[#777]">
              Final Processing, Closure & Reports
            </p>
          </div>

          <div className="flex items-center gap-5">
            {/* Notifications */}
            <div className="relative group" onMouseEnter={handleMarkNotificationsRead}>
              <div className="relative cursor-pointer">
                <Bell size={18} className="text-[#777]" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#F26B5B] text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              <div className="absolute right-0 top-[32px] w-[300px] bg-white border border-[#E7E3DC] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-h-[400px] overflow-y-auto">
                <div className="p-3 border-b border-[#EFEAE2] text-[12px] font-semibold text-[#777]">Notifications</div>
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((item, idx) => (
                    <div key={idx} className={`px-4 py-3 border-b border-[#F5F1EB] ${item.isRead ? "opacity-60" : ""}`}>
                      <p className="text-[12px] text-[#333]">{item.text}</p>
                      <p className="text-[10px] text-[#999] mt-1">{item.time}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-[#777] p-4 text-center">No notifications</p>
                )}
              </div>
            </div>

            {/* Profile */}
            <div className="relative group">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                  {user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "PY"}
                </div>
                <div className="text-[12px] font-medium">
                  {user?.name || "Payroll User"}
                </div>
              </div>
              <div className="absolute right-0 top-[42px] w-[220px] bg-white border border-[#E7E3DC] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                <div className="px-4 py-4 border-b border-[#EFEAE2]">
                  <p className="text-[13px] font-semibold">{user?.name}</p>
                  <p className="text-[11px] text-[#888] mt-1">Payroll Admin</p>
                </div>
                <div className="flex flex-col text-[12px] bg-white text-left">
                  <div 
                    onClick={() => alert(`Profile Details:\n\nName: ${user?.name || "User"}\nEmail: ${user?.email || "N/A"}\nEmployee ID: ${user?.employee_id || "N/A"}\nRole: ${user?.role || "N/A"}`)}
                    className="px-4 py-3 hover:bg-[#FAF7F2] cursor-pointer border-b border-[#F5F1EB]"
                  >
                    Profile
                  </div>
                  <div 
                    onClick={handleLogout}
                    className="px-4 py-3 hover:bg-[#FAF7F2] cursor-pointer text-red-600 font-medium"
                  >
                    Logout
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUB-TAB NAVIGATION */}
        <div className="bg-white border-b border-[#E7E3DC] px-6 flex gap-1">
          {topTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-[12px] font-semibold border-b-2 transition-all
                ${activeTab === tab.key
                  ? "border-[#F26B5B] text-[#F26B5B]"
                  : "border-transparent text-[#888] hover:text-[#333] hover:border-[#ddd]"
                }
              `}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === tab.key ? "bg-[#F26B5B] text-white" : "bg-neutral-100 text-[#888]"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ========== TAB 1: PAYROLL QUEUE ========== */}
          {activeTab === "queue" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Total Records */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col justify-between">
                  <p className="text-[11px] text-[#777] font-semibold">Total Records</p>
                  <h2 className="text-[24px] font-semibold mt-2 text-neutral-800">{filteredRows.length}</h2>
                </div>

                {/* Active Earning Head */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col justify-between">
                  <p className="text-[11px] text-[#777] font-semibold">Active Earning Head</p>
                  <h2 className="text-[15px] font-semibold mt-2 font-mono text-neutral-800 tracking-wide">{activeModule}</h2>
                </div>

                {/* Action Buttons Panel */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col justify-between">
                  <p className="text-[11px] text-[#777] font-semibold">Queue Actions</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => exportExcel()}
                      disabled={filteredRows.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 h-[38px] bg-black text-white rounded-xl text-[11px] font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Export all rows to standard payroll CSV format"
                    >
                      <Download size={14} />
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleCloseModule(activeModule)}
                      disabled={filteredRows.length === 0 || closingModule === activeModule}
                      className="flex-1 flex items-center justify-center gap-2 h-[38px] bg-emerald-600 text-white rounded-xl text-[11px] font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Finalize these rows and move them to Closed/Processed archive"
                    >
                      {closingModule === activeModule ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Close Sheet
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden mb-5">
                <table className="w-full">
                  <thead className="bg-[#FAF7F2]">
                    <tr>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">S No</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Employee Code</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Pay Component</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Payment Frequency</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Effective From</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Effective To</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Amount</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Reason</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Remarks</th>
                      <th className="p-3 text-left text-[11px] font-semibold text-[#777]">Payment Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr key={index} className="border-t border-[#EFEAE2] hover:bg-[#FAFAF8]">
                        <td className="p-3 text-[12px]">{index + 1}</td>
                        <td className="p-3 text-[12px] font-mono">{row.empCode}</td>
                        <td className="p-3 text-[12px]">{row.type}</td>
                        <td className="p-3 text-[12px]">{row.grade}</td>
                        <td className="p-3 text-[12px]">{row.designation}</td>
                        <td className="p-3 text-[12px]">{row.employeeHome}</td>
                        <td className="p-3 text-[12px] font-semibold">{row.amount}</td>
                        <td className="p-3 text-[12px]">{row.overtimeHours}</td>
                        <td className="p-3 text-[12px]">{row.remarks}</td>
                        <td className="p-3 text-[12px]">{row.holidayDate}</td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan="10" className="p-10 text-center">
                          <div className="max-w-[320px] mx-auto py-2">
                            <Clock size={32} className="text-neutral-300 mx-auto mb-2" />
                            <p className="text-[12px] font-semibold text-neutral-700">No Pending Records</p>
                            <p className="text-[10px] text-[#888] mt-1">
                              When a maker submits a sheet and the HOD approves it, data will appear here. The "Export" and "Close" actions above will then become active.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ========== TAB 2: CLOSED / PROCESSED ========== */}
          {activeTab === "closed" && (
            <div className="flex gap-5 h-[calc(100vh-170px)]">
              {/* Month Sidebar */}
              <div className="w-[220px] flex-shrink-0 bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#EFEAE2]">
                  <h3 className="text-[13px] font-semibold flex items-center gap-2">
                    <CalendarDays size={15} className="text-[#F26B5B]" />
                    Processed Months
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {closedData.months.length === 0 ? (
                    <p className="text-[12px] text-[#999] p-4 text-center italic">No closed sheets yet</p>
                  ) : (
                    closedData.months.map((m) => (
                      <div
                        key={m.monthKey}
                        onClick={() => {
                          setSelectedClosedMonth(m.monthKey);
                          setExpandedClosedModule(null);
                        }}
                        className={`
                          flex items-center justify-between px-4 py-3 cursor-pointer border-b border-[#F5F1EB] transition-colors
                          ${selectedClosedMonth === m.monthKey ? "bg-[#FAF7F2] border-l-4 border-l-[#F26B5B]" : "hover:bg-[#FAFAF8]"}
                        `}
                      >
                        <div>
                          <p className="text-[13px] font-semibold">{m.month}</p>
                          <p className="text-[10px] text-[#999]">{m.modules.length} module{m.modules.length !== 1 ? "s" : ""}</p>
                        </div>
                        <ChevronRight size={14} className="text-[#ccc]" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Module Cards */}
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const selectedMonth = closedData.months.find(m => m.monthKey === selectedClosedMonth);
                  if (!selectedMonth) {
                    return (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Archive size={48} className="text-[#ddd] mx-auto mb-3" />
                          <p className="text-[14px] text-[#999]">Select a month to view processed sheets</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[18px] font-bold">{selectedMonth.month}</h2>
                        <span className="text-[11px] text-[#999]">
                          {selectedMonth.modules.reduce((s, m) => s + m.rowCount, 0)} total records
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {selectedMonth.modules.map((mod) => (
                          <div key={mod.module} className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden">
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h3 className="text-[14px] font-bold">{mod.module}</h3>
                                <p className="text-[11px] text-[#999] mt-1">{mod.rowCount} record{mod.rowCount !== 1 ? "s" : ""}</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                                  <CheckCircle2 size={12} />
                                  Closed
                                </span>
                              </div>
                            </div>
                            <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-[#999]">
                              <span>Closed: {mod.closedAt}</span>
                              <span>By: {mod.closedBy}</span>
                            </div>
                            <div className="border-t border-[#EFEAE2] px-4 py-3 flex gap-2">
                              <button
                                onClick={() => setExpandedClosedModule(expandedClosedModule === mod.module ? null : mod.module)}
                                className="flex-1 text-[11px] font-semibold text-[#F26B5B] hover:underline text-left"
                              >
                                {expandedClosedModule === mod.module ? "Hide Details" : "View Details"}
                              </button>
                              <button
                                onClick={() => exportExcel(mod.rows, `${mod.module}_${selectedMonth.month}.csv`)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-[#333] hover:text-black"
                              >
                                <Download size={12} />
                                CSV
                              </button>
                            </div>
                            {expandedClosedModule === mod.module && (
                              <div className="border-t border-[#EFEAE2] overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-[#FAF7F2]">
                                    <tr>
                                      <th className="p-2 text-left text-[10px] font-semibold text-[#777]">Emp Code</th>
                                      <th className="p-2 text-left text-[10px] font-semibold text-[#777]">Name</th>
                                      <th className="p-2 text-left text-[10px] font-semibold text-[#777]">Amount</th>
                                      <th className="p-2 text-left text-[10px] font-semibold text-[#777]">Remarks</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mod.rows.map((r, ri) => (
                                      <tr key={ri} className="border-t border-[#EFEAE2]">
                                        <td className="p-2 text-[11px] font-mono">{r.empCode}</td>
                                        <td className="p-2 text-[11px]">{r.empName || "—"}</td>
                                        <td className="p-2 text-[11px] font-semibold">{r.amount || "—"}</td>
                                        <td className="p-2 text-[11px] text-[#777]">{r.remarks || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ========== TAB 3: IN PROCESS ========== */}
          {activeTab === "inprocess" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-800">Live Processing Tracker</h2>
                  <p className="text-[11px] text-[#777]">
                    Real-time progress for active sheets in the approval pipeline
                  </p>
                </div>
                <button
                  onClick={() => { fetchInProcessData(); fetchPayrollData(); }}
                  className="flex items-center gap-2 px-4 py-2 border border-[#E7E3DC] rounded-xl text-[11px] font-semibold bg-white hover:bg-[#FAF7F2] transition-colors"
                >
                  <Loader2 size={13} className="text-[#F26B5B]" />
                  Refresh
                </button>
              </div>

              {inProcessData.modules.length === 0 ? (
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-12 text-center">
                  <CheckCircle2 size={40} className="text-[#22C55E] mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-neutral-800">All Clear!</p>
                  <p className="text-[11px] text-[#777] mt-1">No sheets currently in the approval queue.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {inProcessData.modules.map((mod) => {
                    // Check if HRBP is bypassed for this earning head config
                    const headConfig = modules.find(m => m.name === mod.module);
                    const isHrbpBypassed = headConfig?.hrbp === "NA";
                    
                    // Define dynamic stages based on config bypass rules
                    const steps = isHrbpBypassed
                      ? [
                          { key: "MAKER", label: "Maker" },
                          { key: "HOD", label: "HOD Approval" },
                          { key: "PAYROLL", label: "Payroll Queue" }
                        ]
                      : [
                          { key: "MAKER", label: "Maker" },
                          { key: "HRBP", label: "HRBP Review" },
                          { key: "HOD", label: "HOD Approval" },
                          { key: "PAYROLL", label: "Payroll Queue" }
                        ];

                    // Resolve the earliest active status in stages
                    const currentStatusKey = ["MAKER", "HRBP", "HOD", "PAYROLL"].find(s => mod.stages[s] > 0) || "MAKER";
                    const currentStepIndex = steps.findIndex(s => s.key === currentStatusKey);
                    
                    return (
                      <div key={mod.module} className="bg-white border border-[#E7E3DC] rounded-2xl p-5 hover:shadow-sm transition-shadow">
                        {/* Header Details */}
                        <div className="flex items-center justify-between mb-4 border-b border-[#FAF7F2] pb-3">
                          <div>
                            <h3 className="text-[13px] font-bold text-neutral-800 uppercase tracking-wider">{mod.module}</h3>
                            <p className="text-[10px] text-[#777] mt-0.5">{mod.totalRows} row{mod.totalRows !== 1 ? "s" : ""} pending</p>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] font-medium text-[#777] bg-[#FAF7F2] border border-[#EFEAE2] px-2.5 py-1 rounded-full">
                              Stage: <span className="font-bold text-[#F26B5B]">{mod.currentStage}</span>
                            </span>
                          </div>
                        </div>

                        {/* Timeline Stepper */}
                        <div className="relative flex items-center justify-between w-full mt-6 mb-2 px-10">
                          {/* Stepper Connecting Background Line */}
                          <div className="absolute left-12 right-12 top-[13px] h-[2px] bg-[#FAF7F2] border-t border-[#EFEAE2] z-0"></div>
                          
                          {/* Stepper Progress Fill Line */}
                          <div 
                            className="absolute left-12 top-[13px] h-[2px] bg-[#F26B5B] transition-all duration-500 z-0"
                            style={{ 
                              width: `${currentStepIndex <= 0 ? 0 : (currentStepIndex / (steps.length - 1)) * 100}%`,
                              maxWidth: 'calc(100% - 6rem)'
                            }}
                          ></div>

                          {steps.map((step, idx) => {
                            const isCompleted = idx < currentStepIndex;
                            const isActive = idx === currentStepIndex;
                            
                            return (
                              <div key={step.key} className="flex flex-col items-center z-10 relative">
                                {/* Dot Indicator */}
                                <div 
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300
                                    ${isCompleted 
                                      ? "bg-black border-black text-white" 
                                      : isActive 
                                        ? "bg-white border-[#F26B5B] text-[#F26B5B] shadow-[0_0_8px_rgba(242,107,91,0.25)] scale-110" 
                                        : "bg-white border-[#E7E3DC] text-[#aaa]"
                                    }
                                  `}
                                >
                                  {isCompleted ? "✓" : idx + 1}
                                </div>
                                
                                {/* Label Text */}
                                <span 
                                  className={`text-[10px] mt-2 font-medium transition-all duration-300
                                    ${isCompleted 
                                      ? "text-neutral-800" 
                                      : isActive 
                                        ? "text-[#F26B5B] font-semibold" 
                                        : "text-[#aaa]"
                                    }
                                  `}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}