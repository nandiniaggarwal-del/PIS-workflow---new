import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import * as XLSX from "xlsx";
import {
  Clock3,
  Plane,
  BadgeIndianRupee,
  CalendarRange,
  Bell,
  Upload,
  Download,
  Plus,
  Trash2,
} from "lucide-react";

const timeline = [
  "Maker (Business SPOC)",
  "HRBP",
  "HOD",
  "Payroll",
];
const MakerScreen = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [modules, setModules] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeModule, setActiveModule] = useState("");
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
 
  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem("user"));
    if (!storedUser || storedUser.role.toLowerCase() !== "maker") {
      alert("Access Denied: Maker role required.");
      if (storedUser) {
        const r = storedUser.role.toLowerCase();
        if (r === "admin") navigate("/admin");
        else if (r === "hrbp") navigate("/hrbp");
        else if (r === "hod") navigate("/hod");
        else if (r === "payroll") navigate("/payroll");
        else navigate("/");
      } else {
        navigate("/");
      }
      return;
    }
    fetchConfig();
    fetchPayrollData();
    fetchWorkflowHistory();
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
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const fetchWorkflowHistory = async () => {
    try {
      const response = await API.get("/workflow/history");
      setHistory(response.data);
    } catch (error) {
      console.log("Failed to fetch history:", error);
    }
  };

  const fetchPayrollData = async () => {
    try {
      const response = await API.get("/workflow/maker");
      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };
  const saveSheet = async () => {
    try {
      await API.post(
        "/workflow/save-maker",
        rows
      );

      alert("Saved");
    } catch (error) {
      console.log(error);
    }
  };

  const handleChange = (rowId, field, value) => {
    const updated = rows.map(r => r.id === rowId ? { ...r, [field]: value } : r);
    setRows(updated);
  };

  const addRow = () => {
    const newRow = {
      id: Date.now(),
      sno: rows.length + 1,
      empCode: "",
      empName: "",
      grade: "",
      designation: "",
      employeeHome: "",
      type: activeModule,
      module: activeModule,
      amount: "",
      overtimeHours: "",
      holidayDate: "",
      remarks: "",
      history: []
    };
    setRows([...rows, newRow]);
  };

  const deleteRow = (rowId) => {
    setRows(rows.filter(r => r.id !== rowId));
  };
const downloadTemplate = () => {
  const link = document.createElement("a");
  link.href = "/template.csv";
  link.download = "template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
  const normalizeDate = (dateVal) => {
    if (!dateVal) return "";
    if (typeof dateVal === 'number') {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    const str = dateVal.toString().trim();
    if (!str) return "";
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return str;
  };

  const uploadTemplate = () => {
    if (!selectedFile) {
      alert("Select a file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const formattedRows = jsonData.map((row, index) => {
        const empCode = row.ecode || row["Employee Code"] || "";
        const empName = row.name || row["Employee Name"] || "";
        const grade = row.grade || row["Grade"] || row["Payment Frequency"] || "";
        
        // Normalize date fields from template columns so they match calendar format (YYYY-MM-DD)
        const designation = normalizeDate(row.designation || row["Designation"] || row["Effective From"] || "");
        const employeeHome = normalizeDate(row.employeeHome || row["Employee Home"] || row["Effective To"] || "");
        
        const amount = row.amount !== undefined ? row.amount.toString() : (row["Amount"] !== undefined ? row["Amount"].toString() : "");
        const overtimeHours = row.overtimeHours || row["Reason"] || "";
        const remarks = row.remarks || row["Remarks"] || "";
        const holidayDate = row.holidayDate || row["Payment for the month"] || "";

        return {
          id: Date.now() + index,
          sno: index + 1,
          empCode,
          empName,
          grade,
          designation,
          employeeHome,
          type: activeModule,
          module: activeModule,
          amount,
          overtimeHours,
          remarks,
          holidayDate,
        };
      });

      // Clear any existing draft rows in state for the active module, then append the newly uploaded rows
      setRows(prevRows => [
        ...prevRows.filter(r => r.module !== activeModule && r.type !== activeModule),
        ...formattedRows
      ]);

      alert("Template Uploaded Successfully");
    };

    reader.readAsArrayBuffer(
      selectedFile
    );
  };
const filteredRows =
  rows.filter(
    row =>
      row.module === activeModule
  );
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

        {/* LOGO */}

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
              transition-all
            "
          >
            Payroll
          </span>
        </div>

        {/* MENU */}

        <div className="flex flex-col gap-2 px-3 overflow-y-auto flex-1 max-h-[calc(100vh-100px)]">

          {modules.map((item, index) => {
            let Icon = BadgeIndianRupee;

            const active = activeModule === item.name;
            
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
                  transition-all
                  min-w-[200px]

                  ${active
                    ? "bg-[#F26B5B] text-white"
                    : "text-[#B8B8B8] hover:bg-[#1E1E1E] hover:text-white"
                  }
                `}
              >

                <Icon size={18} className="flex-shrink-0" />

                <span
                  className="
                    text-[13px]
                    font-medium
                    whitespace-nowrap
                    opacity-0
                    group-hover:opacity-100
                    transition-all
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
  Maker (Business SPOC) Dashboard
</h1>

            <p className="text-[11px] text-[#777]">
              Maker (Business SPOC)
            </p>
          </div>

          <div className="flex items-center gap-5">

            {/* NOTIFICATIONS */}

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

            {/* USER */}

            <div className="relative group">

              <div className="flex items-center gap-3 cursor-pointer">

                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                  {user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "MA"}
                </div>

                <div className="text-[12px] font-medium">
                  {user?.name || "User"}
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
                    {user?.name}
                  </p>
                </div>

                <div className="flex flex-col text-[12px] bg-white">
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

          <div className="flex items-center justify-between mb-5">

            <div>

              <h2 className="text-[18px] font-semibold">
                {activeModule}
              </h2>

              <p className="text-[12px] text-[#777] mt-1">
                Payroll workflow processing
              </p>
            </div>

            <div className="flex gap-3">

              {/* ADD ROW */}

              <button
                onClick={addRow}
                className="
                  h-[36px]
                  px-4
                  bg-[#F3E8D7]
                  text-black
                  rounded-xl
                  flex
                  items-center
                  gap-2
                  text-[12px]
                  font-medium
                "
              >
                <Plus size={14} />
                Add Row
              </button>

              {/* DOWNLOAD */}

              <button
                onClick={downloadTemplate}
                className="
      h-[36px]
      px-4
      bg-[#F26B5B]
      text-white
      rounded-xl
      flex
      items-center
      gap-2
      text-[12px]
      font-medium
    "
              >
                <Download size={14} />
                Download Template
              </button>

              {/* FILE PICKER */}

              <label
                className="
      h-[36px]
      px-4
      bg-[#F3E8D7]
      text-black
      rounded-xl
      flex
      items-center
      gap-2
      text-[12px]
      font-medium
      cursor-pointer
    "
              >
                <Upload size={14} />
                Choose File

                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) =>
                    setSelectedFile(
                      e.target.files[0]
                    )
                  }
                />
              </label>

              {/* UPLOAD */}

              <button
                onClick={uploadTemplate}
                className="
      h-[36px]
      px-4
      bg-black
      text-white
      rounded-xl
      flex
      items-center
      gap-2
      text-[12px]
      font-medium
    "
              >
                <Upload size={14} />
                Upload Sheet
              </button>

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
                        className={`
                          absolute
                          top-[9px]
                          left-1/2
                          w-full
                          h-[2px]

                          ${index === 0
                            ? "bg-[#F26B5B]"
                            : "bg-[#E5E0D8]"
                          }
                        `}
                      />
                    )}

                    <div
                      className={`
                        w-5
                        h-5
                        rounded-full
                        z-10

                        ${index === 0
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

          {/* TABLE */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden">

            <div className="overflow-x-auto overflow-y-auto max-h-[520px]">

              <table className="min-w-[1600px] border-collapse">

                <thead className="bg-[#FAF7F2] sticky top-0 z-20">

                  <tr>

                    <th className="p-3">S No</th>
                    <th className="p-3">Employee Code</th>
                    <th className="p-3">Pay Component</th>
                    <th className="p-3">Payment Frequency</th>
                    <th className="p-3">Effective From</th>
                    <th className="p-3">Effective To</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3">Payment for the month</th>
                    <th className="p-3 text-center">Actions</th>

                  </tr>
                </thead>

                <tbody>

                  {filteredRows?.map((row, index) => (

                    <tr
                      key={row.id}
                      className="border-t border-[#EFEAE2]"
                    >

                      {/* S NO */}

                      <td className="p-3 text-[12px] text-center">
                        {index + 1}
                      </td>

                      {/* Employee Code */}

                      <td className="p-3">
                        <input
                          value={row.empCode || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "empCode",
                              e.target.value
                            )
                          }
                          placeholder="Employee Code"
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
                        />
                      </td>

                      {/* Pay Component */}

                      <td className="p-3 text-[12px]">
                        {row.type}
                      </td>

                      {/* Payment Frequency */}

                      <td className="p-3">
                        <input
                          value={row.grade || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "grade",
                              e.target.value
                            )
                          }
                          placeholder="Payment Frequency"
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
                        />
                      </td>

                      {/* Effective From */}

                      <td className="p-3">
                        <input
                          type="date"
                          value={row.designation || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "designation",
                              e.target.value
                            )
                          }
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px] min-h-[38px]"
                        />
                      </td>

                      {/* Effective To */}

                      <td className="p-3">
                        <input
                          type="date"
                          value={row.employeeHome || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "employeeHome",
                              e.target.value
                            )
                          }
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px] min-h-[38px]"
                        />
                      </td>

                      {/* Amount */}

                      <td className="p-3">
                        <input
                          type="text"
                          value={row.amount || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "amount",
                              e.target.value
                            )
                          }
                          placeholder="Amount"
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
                        />
                      </td>

                      {/* Reason */}

                      <td className="p-3">
                        <input
                          value={row.overtimeHours || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "overtimeHours",
                              e.target.value
                            )
                          }
                          placeholder="Reason"
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
                        />
                      </td>

                      {/* Remarks */}

                      <td className="p-3">
                        <input
                          value={row.remarks || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "remarks",
                              e.target.value
                            )
                          }
                          placeholder="Remarks"
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
                        />
                      </td>

                      {/* Payment for the month */}

                      <td className="p-3">
                        <input
                          value={row.holidayDate || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "holidayDate",
                              e.target.value
                            )
                          }
                          placeholder="Payment for the month"
                          className="w-full border border-[#E7E3DC] rounded-lg p-2 text-[12px]"
                        />
                      </td>

                      {/* ACTIONS */}

                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-[#F26B5B] hover:text-[#d35a4d] transition-colors p-1"
                          title="Delete Row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>

                    </tr>

                  ))}

                </tbody>
              </table>
            </div>

            <div className="h-[58px] border-t border-[#EFEAE2] px-5 flex items-center justify-end">

              <button
                onClick={async () => {
                  try {

                    await API.post(
  "/workflow/save-maker",
  rows
);

const response =
  await API.get(
    "/workflow/submit-hrbp"
  );

                    alert(response.data.message);

                    fetchPayrollData();
                    fetchWorkflowHistory();

                  } catch (error) {
                    console.log(error);
                  }
                }}
                className="h-[36px] px-5 bg-black text-white rounded-xl text-[12px] font-medium"
              >
                Submit Sheet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MakerScreen;