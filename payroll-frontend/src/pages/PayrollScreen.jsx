import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

import {
  Clock3,
  Plane,
  BadgeIndianRupee,
  CalendarRange,
  Bell,
  Download,
} from "lucide-react";

export default function PayrollScreen() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [modules, setModules] = useState([]);
  const [rows, setRows] = useState([]);
  const [activeModule, setActiveModule] = useState("");
  const [notifications, setNotifications] = useState([]);
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

  const fetchPayrollData = async () => {
    try {
      const response = await API.get("/workflow/payroll");
      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const filteredRows = rows.filter(row => row.module === activeModule);



  const exportExcel = () => {
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

    filteredRows.forEach((row) => {
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
    link.download = `${activeModule}.csv`;
    link.click();
  };

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

      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}

        <div className="h-[58px] bg-white border-b border-[#E7E3DC] px-6 flex items-center justify-between">

          <div>

            <h1 className="text-[15px] font-semibold">
              Payroll Final Export
            </h1>

            <p className="text-[11px] text-[#777]">
              Final Processing Stage
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
                  {user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "PY"}
                </div>

                <div className="text-[12px] font-medium">
                  {user?.name || "Payroll User"}
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
                    Payroll Admin
                  </p>
                </div>
                <div className="flex flex-col text-[12px] bg-white text-left">
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

        {/* PAGE */}

        <div className="flex-1 overflow-y-auto p-5">

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
              <p className="text-[11px] text-[#777]">
                Total Records
              </p>
              <h2 className="text-[24px] font-semibold mt-2">
                {filteredRows.length}
              </h2>
            </div>

            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
              <p className="text-[11px] text-[#777]">
                Module
              </p>
              <h2 className="text-[24px] font-semibold mt-2 font-mono text-[16px]">
                {activeModule}
              </h2>
            </div>

            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
              <p className="text-[11px] text-[#777]">
                Status
              </p>
              <h2 className="text-[24px] font-semibold mt-2">
                Approved
              </h2>
            </div>
          </div>

          <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden mb-5">

    <table className="w-full">

      <thead className="bg-[#FAF7F2]">
        <tr>
          <th className="p-3 text-left">S No</th>
          <th className="p-3 text-left">Employee Code</th>
          <th className="p-3 text-left">Pay Component</th>
          <th className="p-3 text-left">Payment Frequency</th>
          <th className="p-3 text-left">Effective From</th>
          <th className="p-3 text-left">Effective To</th>
          <th className="p-3 text-left">Amount</th>
          <th className="p-3 text-left">Reason</th>
          <th className="p-3 text-left">Remarks</th>
          <th className="p-3 text-left">Payment for the month</th>
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
        {row.designation}
      </td>

      <td className="p-3 text-[12px]">
        {row.employeeHome}
      </td>

      <td className="p-3 text-[12px]">
        {row.amount}
      </td>

      <td className="p-3 text-[12px]">
        {row.overtimeHours}
      </td>

      <td className="p-3 text-[12px]">
        {row.remarks}
      </td>

      <td className="p-3 text-[12px]">
        {row.holidayDate}
      </td>

    </tr>

  ))}

</tbody>

    </table>

  </div>

  <div className="flex justify-center">

    <button
      onClick={exportExcel}
      className="
        flex
        items-center
        gap-3
        px-10
        py-5
        bg-black
        text-white
        rounded-2xl
        text-[15px]
        font-medium
      "
    >
      <Download size={20} />
      Export Payroll Sheet
    </button>

  </div>

</div>

      </div>

    </div>
  );
}