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
const user =
  JSON.parse(
    localStorage.getItem(
      "user"
    )
  );


const modules = [
  {
    icon: Clock3,
    label: "Overtime",
  },
  {
    icon: BadgeIndianRupee,
    label: "Incentive",
  },
  {
    icon: CalendarRange,
    label: "Holiday Payout",
  },
  {
    icon: BadgeIndianRupee,
    label: "Joining Bonus",
  },
  {
    icon: BadgeIndianRupee,
    label: "Referral Bonus",
  },
  {
    icon: BadgeIndianRupee,
    label: "Retention Bonus",
  },
];

const MakerScreen = () => {

  const [rows, setRows] = useState([]);
  const [selectedFile, setSelectedFile] =
    useState(null);

  const [activeModule, setActiveModule] =
    useState("Overtime");

  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
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
    fetchPayrollData();
    fetchWorkflowHistory();
  }, []);

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
  const uploadTemplate = () => {

    if (!selectedFile) {

      alert("Select a file");

      return;
    }

    const reader =
      new FileReader();

    reader.onload = (e) => {

      const data =
        new Uint8Array(
          e.target.result
        );

      const workbook =
        XLSX.read(data, {
          type: "array",
        });

      const sheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[sheetName];

      const jsonData =
        XLSX.utils.sheet_to_json(
          worksheet
        );

      const formattedRows =
  jsonData.map((row, index) => {
    const empCode = row.ecode || row["Employee Code"] || "";
    const empName = row.name || row["Employee Name"] || "";
    const grade = row.grade || row["Grade"] || "";
    const designation = row.designation || row["Designation"] || "";
    const employeeHome = row.employeeHome || row["Employee Home"] || "";
    const amount = row.amount || row["Amount"] || "";
    const overtimeHours = row.overtimeHours || row["Overtime Hours"] || "";
    const remarks = row.remarks || row["Remarks"] || row["Reason"] || "";
    const holidayDate = row.holidayDate || row["Holiday Date"] || row["Payment for the month"] || "";
    const type = row.type || row["Pay Component"] || activeModule;

    return {
      id: index + 1,
      sno: row.sno || (index + 1).toString(),
      empCode,
      empName,
      grade,
      designation,
      employeeHome,
      type,
      amount: amount.toString(),
      overtimeHours: overtimeHours.toString(),
      remarks,
      holidayDate,
    };
  });

      const taggedRows =
  formattedRows.map(row => ({
    ...row,
    module: activeModule,
    type: activeModule,
  }));

setRows(taggedRows);

      alert(
        "Template Uploaded Successfully"
      );
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

        <div className="flex flex-col gap-2 px-3">

          {modules.map((item, index) => {
            const Icon = item.icon;

            const active =
              activeModule === item.label;
            
            return (
              <div
                key={index}
                onClick={() =>
                  setActiveModule(item.label)
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

                <Icon size={18} />

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
                  {item.label}
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

            <div className="relative group">

              <div className="relative cursor-pointer">

                <Bell size={17} />

                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F26B5B] text-white text-[9px] flex items-center justify-center">
                  3
                </div>
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

                <div className="px-4 py-3 border-b border-[#EFEAE2]">

                  <h3 className="text-[13px] font-semibold">
                    Notifications
                  </h3>
                </div>

                <div className="max-h-[320px] overflow-y-auto">

                  {[
  "Overtime sheet pending HRBP review",
  "Incentive sheet pending HRBP review",
  "Holiday payout pending HRBP review",
].map((item, index) => (
                    <div
                      key={index}
                      className="
                        px-4
                        py-3
                        border-b
                        border-[#F4F1EC]
                        hover:bg-[#FAF7F2]
                        cursor-pointer
                      "
                    >

                      <p className="text-[12px] text-[#333]">
                        {item}
                      </p>

                      <p className="text-[10px] text-[#999] mt-1">
                        2 mins ago
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* USER */}

            <div className="relative group">

              <div className="flex items-center gap-3 cursor-pointer">

                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                  NA
                </div>

                <div className="text-[12px] font-medium">
                  Nandini
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

                {[
                  "Account Settings",
                  "Profile",
                  "Notifications",
                  "Help & Support",
                  "Logout",
                ].map((item, index) => (
                  <div
                    key={index}
                    className="
                      px-4
                      py-3
                      text-[12px]
                      hover:bg-[#FAF7F2]
                      cursor-pointer
                      border-b
                      border-[#F5F1EB]
                      last:border-none
                    "
                  >
                    {item}
                  </div>
                ))}
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
                  accept=".xlsx,.xls"
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

              {timeline.map((step, index) => (
                <div
                  key={step}
                  className="flex-1 flex flex-col items-center relative"
                >

                  {index !== timeline.length - 1 && (
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
              ))}
            </div>
          </div>

          {/* TABLE */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden">

            <div className="overflow-x-auto overflow-y-auto max-h-[520px]">

              <table className="min-w-[1600px] border-collapse">

                <thead className="bg-[#FAF7F2] sticky top-0 z-20">

                  <tr>

                    <th className="p-3">S No</th>

                    <th className="p-3">
                      Ecode
                    </th>

                    <th className="p-3">
                      Name
                    </th>

                    <th className="p-3">
                      Grade
                    </th>

                    <th className="p-3">
                      Designation
                    </th>

                    <th className="p-3">
                      Employee Home
                    </th>

                    <th className="p-3">
                      Input Type
                    </th>

                    <th className="p-3">
  {activeModule === "Overtime"
    ? "OT Hours"
    : activeModule === "Holiday Payout"
    ? "Date"
    : "Amount"}
</th>

                    <th className="p-3">
                      Remarks
                    </th>

                    <th className="p-3 text-center">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredRows?.map((row, index) => (

                    <tr
                      key={index}
                      className="border-t border-[#EFEAE2]"
                    >

                      {/* S NO */}

                      <td className="p-3 text-[12px] text-center">
                        {index + 1}
                      </td>

                      {/* ECODE */}

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
                          placeholder="Ecode"
                          className="
                            w-full
                            border
                            border-[#E7E3DC]
                            rounded-lg
                            p-2
                            text-[12px]
                          "
                        />
                      </td>

                      {/* NAME */}

                      <td className="p-3">
                        <input
                          value={row.empName || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "empName",
                              e.target.value
                            )
                          }
                          placeholder="Name"
                          className="
                            w-full
                            border
                            border-[#E7E3DC]
                            rounded-lg
                            p-2
                            text-[12px]
                          "
                        />
                      </td>

                      {/* GRADE */}

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
                          placeholder="Grade"
                          className="
                            w-full
                            border
                            border-[#E7E3DC]
                            rounded-lg
                            p-2
                            text-[12px]
                          "
                        />
                      </td>

                      {/* DESIGNATION */}

                      <td className="p-3">
                        <input
                          value={row.designation || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "designation",
                              e.target.value
                            )
                          }
                          placeholder="Designation"
                          className="
                            w-full
                            border
                            border-[#E7E3DC]
                            rounded-lg
                            p-2
                            text-[12px]
                          "
                        />
                      </td>

                      {/* EMPLOYEE HOME */}

                      <td className="p-3">
                        <input
                          value={row.employeeHome || ""}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "employeeHome",
                              e.target.value
                            )
                          }
                          placeholder="Home"
                          className="
                            w-full
                            border
                            border-[#E7E3DC]
                            rounded-lg
                            p-2
                            text-[12px]
                          "
                        />
                      </td>

                      {/* INPUT TYPE */}

                      <td className="p-3 text-[12px]">
                        {row.type}
                      </td>

                      {/* DYNAMIC COLUMN */}

                      <td className="p-3">

                        {row.type === "Holiday Payout" ? (

                          <input
                            type="date"
                            value={row.holidayDate || ""}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "holidayDate",
                                e.target.value
                              )
                            }
                            className="
                              w-full
                              border
                              border-[#E7E3DC]
                              rounded-lg
                              p-2
                              text-[12px]
                            "
                          />

                        ) : (

                          <input
                            value={
                              row.type === "Overtime"
                                ? row.overtimeHours || ""
                                : row.amount || ""
                            }
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                row.type === "Overtime"
                                  ? "overtimeHours"
                                  : "amount",
                                e.target.value
                              )
                            }
                            placeholder={row.type === "Overtime" ? "Hours" : "Amount"}
                            className="
                              w-full
                              border
                              border-[#E7E3DC]
                              rounded-lg
                              p-2
                              text-[12px]
                            "
                          />

                        )}

                      </td>

                      {/* REMARKS */}

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
                          className="
                            w-full
                            border
                            border-[#E7E3DC]
                            rounded-lg
                            p-2
                            text-[12px]
                          "
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