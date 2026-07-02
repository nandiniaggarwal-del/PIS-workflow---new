// HRBP Screen Dashboard Component
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

import {
  Clock3,
  Plane,
  BadgeIndianRupee,
  CalendarRange,
  Bell,
} from "lucide-react";

const timeline = [
  "Maker (Business SPOC)",
  "HRBP",
  "Approver (HOD)",
  "Payroll",
];
export default function HRBPScreen() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [modules, setModules] = useState([]);
  const [rows, setRows] = useState([]);
  const [activeModule, setActiveModule] = useState("");
  const [activeEmployeeHome, setActiveEmployeeHome] = useState("");
  const [hrbpComments, setHrbpComments] = useState("");
  const [flaggedColumns, setFlaggedColumns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem("user"));
    if (!storedUser || storedUser.role.toLowerCase() !== "hrbp") {
      alert("Access Denied: HRBP role required.");
      if (storedUser) {
        const r = storedUser.role.toLowerCase();
        if (r === "admin") navigate("/admin");
        else if (r === "maker") navigate("/maker");
        else if (r === "hod") navigate("/hod");
        else if (r === "payroll") navigate("/payroll");
        else navigate("/");
      } else {
        navigate("/");
      }
      return;
    }
    fetchConfig();
    fetchWorkflowHistory();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (activeModule && activeEmployeeHome) {
      fetchPayrollData(activeModule, activeEmployeeHome);
    }
  }, [activeModule, activeEmployeeHome]);

  useEffect(() => {
    if (activeModule && modules.length > 0) {
      const activeHead = modules.find(m => m.name === activeModule);
      if (activeHead && activeHead.allowed_homes && activeHead.allowed_homes.length > 0) {
        if (!activeHead.allowed_homes.includes(activeEmployeeHome)) {
          setActiveEmployeeHome(activeHead.allowed_homes[0]);
        }
      } else {
        setActiveEmployeeHome("ALL");
      }
    }
  }, [activeModule, modules]);

  const fetchConfig = async () => {
    try {
      const response = await API.get("/workflow/config");
      const allHeads = response.data.earning_heads;
      setModules(allHeads);
      if (allHeads.length > 0) {
        setActiveModule(allHeads[0].name);
        if (allHeads[0].allowed_homes && allHeads[0].allowed_homes.length > 0) {
          setActiveEmployeeHome(allHeads[0].allowed_homes[0]);
        } else {
          setActiveEmployeeHome("ALL");
        }
      }
    } catch (error) {
      console.log("Failed to fetch configuration:", error);
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
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const switchRole = (newRole) => {
    const updatedUser = { ...user, role: newRole };
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
    if (newRole === "maker") navigate("/maker");
    else if (newRole === "hrbp") navigate("/hrbp");
    else if (newRole === "hod") navigate("/hod");
    window.location.reload();
  };

  const fetchWorkflowHistory = async () => {
    try {
      const response = await API.get("/workflow/history");
      setHistory(response.data);
    } catch (error) {
      console.log("Failed to fetch history:", error);
    }
  };

  const fetchPayrollData = async (moduleName, homeName) => {
    const mod = moduleName || activeModule;
    const home = homeName || activeEmployeeHome;
    if (!mod || !home) return;
    try {
      const response = await API.get(`/workflow/hrbp?module=${encodeURIComponent(mod)}&employeeHome=${encodeURIComponent(home)}`);
      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const toggleColumn = (column) => {
    if (flaggedColumns.includes(column)) {
      setFlaggedColumns(
        flaggedColumns.filter(
          (item) => item !== column
        )
      );
    } else {
      setFlaggedColumns([
        ...flaggedColumns,
        column,
      ]);
    }
  };
  const filteredRows =
  rows.filter(
    row =>
      row.module === activeModule && row.employeeHome === activeEmployeeHome
  );

  const totalAmount = filteredRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalRecords = filteredRows.length;
  const averagePayout = totalRecords > 0 ? Math.round(totalAmount / totalRecords) : 0;

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
            HRBP
          </span>
        </div>

        <div className="flex flex-col gap-2 px-3 overflow-y-auto flex-1 max-h-[calc(100vh-100px)]">
          {modules.map((item, index) => {
            let Icon = BadgeIndianRupee;

            return (
              <div
                key={index}
                onClick={() =>
                  setActiveModule(item.name)
                }
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
                    activeModule === item.name
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

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOPBAR */}

        <div className="h-[58px] bg-white border-b border-[#E7E3DC] px-6 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold">
              HRBP Review Dashboard
            </h1>

            <p className="text-[11px] text-[#777]">
              {user?.name}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative group" onMouseEnter={handleMarkNotificationsRead}>
              <div className="relative cursor-pointer">
                <Bell size={17} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F26B5B] text-white text-[9px] flex items-center justify-center">
                    {notifications.filter(n => !n.isRead).length}
                  </div>
                )}
              </div>
              <div
                className="
                  absolute
                  right-0
                  top-[35px]
                  w-[300px]
                  bg-white
                  border
                  border-[#E7E3DC]
                  rounded-2xl
                  shadow-xl
                  opacity-0
                  invisible
                  group-hover:opacity-100
                  group-hover:visible
                  transition-all
                  duration-200
                  z-50
                  overflow-hidden
                "
              >
                <div className="px-4 py-3 border-b border-[#EFEAE2]">
                  <h3 className="text-[13px] font-semibold">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((item, index) => (
                      <div
                        key={index}
                        className={`
                          px-4
                          py-3
                          border-b
                          border-[#F4F1EC]
                          hover:bg-[#FAF7F2]
                          cursor-pointer
                          ${!item.isRead ? "bg-[#FFF9F2]" : ""}
                        `}
                      >
                        <p className="text-[12px] text-[#333]">
                          {item.text}
                        </p>
                        <p className="text-[10px] text-[#999] mt-1">
                          {item.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-[#777] p-4 text-center">
                      No notifications
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                  {user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "HR"}
                </div>

                <div className="text-[12px] font-medium">
                  {user?.name || "HRBP"}
                </div>
              </div>

              <div
                className="
                  absolute
                  right-0
                  top-[42px]
                  w-[220px]
                  bg-white
                  border
                  border-[#E7E3DC]
                  rounded-2xl
                  shadow-xl
                  opacity-0
                  invisible
                  group-hover:opacity-100
                  group-hover:visible
                  transition-all
                  duration-200
                  z-50
                  overflow-hidden
                "
              >
                <div className="px-4 py-4 border-b border-[#EFEAE2]">
                  <p className="text-[13px] font-semibold">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-[#888] mt-1">
                    {user?.role?.toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-col text-[12px] bg-white text-left">
                  {user?.roles && user.roles.length > 1 && (
                    <div className="border-b border-[#F5F1EB] bg-[#FAF8F5] text-left">
                      <p className="px-4 pt-2 text-[9px] text-gray-400 font-bold uppercase tracking-wider">Switch Role</p>
                      {user.roles.map(r => r.toLowerCase() !== user.role?.toLowerCase() && (
                        <div 
                          key={r}
                          onClick={() => switchRole(r.toLowerCase())} 
                          className="px-4 py-2 hover:bg-[#FAF7F2] cursor-pointer text-[#0E2A47] font-medium"
                        >
                          {r.toUpperCase()} View
                        </div>
                      ))}
                    </div>
                  )}
                  <div 
                    onClick={() => alert(`Profile Details:\n\nName: ${user?.name || "User"}\nEmail: ${user?.email || "N/A"}\nEmployee ID: ${user?.employee_id || "N/A"}\nRole: ${user?.role || "N/A"}`)}
                    className="px-4 py-3 hover:bg-[#FAF7F2] cursor-pointer border-b border-[#F5F1EB]"
                  >
                    Profile
                  </div>
                  <div 
                    onClick={() => alert("For help and support, please contact the IT Payroll Team at: it.team@1mg.com")}
                    className="px-4 py-3 hover:bg-[#FAF7F2] cursor-pointer border-b border-[#F5F1EB]"
                  >
                    Help & Support
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
        <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 mb-5">

  <h3 className="text-[13px] font-semibold mb-3">
    Remarks History
  </h3>

  {history?.length ? (
    <div className="max-h-[150px] overflow-y-auto pr-2">
      {history.map(
        (item,index) => (

          <div
            key={index}
            className="border-b border-[#EFEAE2] py-3 last:border-none"
          >

            <p className="text-[12px] font-medium">
              {item.action}
            </p>

            <p className="text-[11px] text-[#666]">
              {item.user}
            </p>

            {item.remarks && (

              <p className="text-[12px] text-[#F26B5B] mt-1">
                {item.remarks}
              </p>

            )}

            <p className="text-[10px] text-[#999]">
              {item.timestamp}
            </p>

          </div>

        )
      )}
    </div>
  ) : (

    <p className="text-[12px] text-[#777]">
      No remarks available
    </p>

  )}

</div>

        {/* PAGE */}

        <div className="flex-1 overflow-y-auto p-5">

          <div className="mb-5">
            <h2 className="text-[18px] font-semibold">
              {activeModule}
            </h2>

            <p className="text-[12px] text-[#777]">
              Review submissions from Maker (Business SPOC)
            </p>
            {modules.find(m => m.name === activeModule)?.allowed_homes?.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {modules.find(m => m.name === activeModule).allowed_homes.map(home => (
                  <button
                    key={home}
                    onClick={() => setActiveEmployeeHome(home)}
                    className={`h-[30px] px-4 rounded-xl text-[11px] font-semibold transition-all ${
                      activeEmployeeHome === home
                        ? "bg-black text-white"
                        : "bg-white border border-[#E7E3DC] text-[#666] hover:bg-[#F26B5B] hover:text-white"
                    }`}
                  >
                    {home}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SUMMARY WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Total Cost */}
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
              <p className="text-[11px] text-[#777] font-semibold font-sans">Total Cost</p>
              <h2 className="text-[22px] font-bold mt-2 text-neutral-800 font-sans">
                ₹ {totalAmount.toLocaleString()}
              </h2>
            </div>
            
            {/* Total Records */}
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
              <p className="text-[11px] text-[#777] font-semibold font-sans">Total Records</p>
              <h2 className="text-[22px] font-bold mt-2 text-neutral-800 font-sans">
                {totalRecords} row{totalRecords !== 1 ? "s" : ""}
              </h2>
            </div>
            
            {/* Average Value */}
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
              <p className="text-[11px] text-[#777] font-semibold font-sans">Average Row Cost</p>
              <h2 className="text-[22px] font-bold mt-2 text-neutral-800 font-sans">
                ₹ {averagePayout.toLocaleString()}
              </h2>
            </div>
          </div>

          {/* TIMELINE */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between">
              {(() => {
                const activeModuleConfig = modules.find(m => m.name === activeModule);
                const hasHrbp = activeModuleConfig ? activeModuleConfig.hrbp !== "NA" : true;
                const currentTimeline = hasHrbp 
                  ? ["Maker (Business SPOC)", "HRBP", "Approver (HOD)", "Payroll"]
                  : ["Maker (Business SPOC)", "Approver (HOD)", "Payroll"];

                return currentTimeline.map((step, index) => (
                  <div
                    key={step}
                    className="flex-1 flex flex-col items-center relative"
                  >
                    {index !== currentTimeline.length - 1 && (
                      <div
                        className="
                          absolute
                          top-[9px]
                          left-1/2
                          w-full
                          h-[2px]
                          bg-[#E5E0D8]
                        "
                      />
                    )}

                    <div
                      className={`
                        w-5
                        h-5
                        rounded-full
                        z-10

                        ${
                          index <= 1
                            ? "bg-[#F26B5B]"
                            : "bg-[#D8D2C7]"
                        }
                      `}
                    />

                    <p className="mt-2 text-[11px] font-medium text-[#555]">
                      {step}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* COMMENTS */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 mb-5">
            <h3 className="text-[13px] font-semibold mb-3">
              HRBP Comments
            </h3>

            <textarea
value={hrbpComments}

onChange={(e) =>
  setHrbpComments(e.target.value)
}
  placeholder="Enter comments..."
  className="
    w-full
    h-[100px]
    border
    border-[#E7E3DC]
    rounded-xl
    p-3
    text-[12px]
    outline-none
    resize-none
  "
/>
<button
  onClick={async () => {
    await API.post(
      "/workflow/save-hrbp-review",
      {
        comments: hrbpComments,
        flaggedColumns,
        module: activeModule,
        employeeHome: activeEmployeeHome
      }
    );

    alert("Review Saved");
  }}
  className="
    mt-3
    h-[36px]
    px-5
    rounded-xl
    bg-black
    text-white
    text-[12px]
    hover:opacity-90
  "
>
  Save Review
</button>

            <div className="mt-4">
              <p className="text-[12px] font-medium mb-2">
                Flag Columns
              </p>

              <div className="flex gap-2 flex-wrap">
                {[
                  "Employee Code",
                  "Employee Name",
                  "Input Type",
                  "Amount",
                ].map((column) => (
                  <button
                    key={column}
                    onClick={() =>
                      toggleColumn(column)
                    }
                    className={`
                      px-3
                      h-[32px]
                      rounded-lg
                      text-[11px]
                      border

                      ${
                        flaggedColumns.includes(
                          column
                        )
                          ? "bg-[#F26B5B] text-white border-[#F26B5B]"
                          : "border-[#E7E3DC]"
                      }
                    `}
                  >
                    {column}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden">

            <table className="min-w-[1600px] border-collapse">
              <thead className="bg-[#FAF7F2]">
                <tr>
                  <th className="p-3">S No</th>
                  <th className="p-3">Initiator</th>
                  <th className="p-3">Employee Code</th>
                  <th className="p-3">Pay Component</th>
                  <th className="p-3">Payment Frequency</th>
                  <th className="p-3">Effective From</th>
                  <th className="p-3">Effective To</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Payment for the month</th>
                </tr>
              </thead>

              <tbody>

  {filteredRows.map((row, index) => (

    <tr
      key={index}
      className="border-t border-[#EFEAE2]"
    >

      <td className="p-3 text-[12px]">
        {index + 1}
      </td>

      <td className="p-3 text-[12px] font-medium text-gray-600">
        {row.initiatorEmail ? row.initiatorEmail.split("@")[0] : "System"}
      </td>

      <td className="p-3 text-[12px]">
        {row.empCode}
      </td>

      <td className="p-3 text-[12px]">
        {row.type}
      </td>

      <td className="p-3 text-[12px]">
        {row.grade}
      </td>

      <td className="p-3 text-[12px]">
        {row.effectiveFrom || row.designation}
      </td>

      <td className="p-3 text-[12px]">
        {row.effectiveTo || (!isNaN(Date.parse(row.employeeHome)) ? row.employeeHome : "")}
      </td>

      <td className="p-3 text-[12px]">
        {row.amount}
      </td>

      <td className="p-3 text-[12px]">
        {row.overtimeHours}
      </td>

      <td className="p-3">
        <input
          value={row.remarks || ""}
          onChange={(e) => {
            const updated = rows.map(r => r.id === row.id ? { ...r, remarks: e.target.value } : r);
            setRows(updated);
          }}
          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
        />
      </td>

      <td className="p-3 text-[12px]">
        {row.holidayDate}
      </td>

    </tr>

  ))}

</tbody>
            </table>

            <div className="h-[58px] border-t border-[#EFEAE2] px-5 flex items-center justify-end gap-3">

<button
  onClick={async () => {
    try {
      await API.post(
        "/workflow/save-hrbp-review",
        {
          comments: hrbpComments,
          flaggedColumns,
          module: activeModule,
          employeeHome: activeEmployeeHome
        }
      );

      const response = await API.get(
        `/workflow/return-maker?module=${encodeURIComponent(activeModule)}&employeeHome=${encodeURIComponent(activeEmployeeHome)}`
      );

      alert(response.data.message);

      fetchPayrollData(activeModule, activeEmployeeHome);
      fetchWorkflowHistory();

    } catch (error) {
      console.log(error);
    }
  }}
  className="
    h-[36px]
    px-5
    rounded-xl
    bg-[#EDE7DE]
    text-[12px]
  "
>
  Reject
</button>

              <button
                onClick={async () => {
                  try {
                    await API.post(
                      "/workflow/save-hrbp-review",
                      {
                        comments: hrbpComments,
                        flaggedColumns,
                        module: activeModule,
                        employeeHome: activeEmployeeHome
                      }
                    );

                    const response = await API.get(
                      `/workflow/submit-hod?module=${encodeURIComponent(activeModule)}&employeeHome=${encodeURIComponent(activeEmployeeHome)}`
                    );

                    alert(response.data.message);

                    fetchPayrollData(activeModule, activeEmployeeHome);
                    fetchWorkflowHistory();
                  } catch (error) {
                    console.log(error);
                  }
                }}
                className="h-[36px] px-5 rounded-xl bg-black text-white text-[12px]"
              >
                Approve & Submit
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}