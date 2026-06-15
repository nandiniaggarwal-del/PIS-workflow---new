import { useState, useEffect } from "react";
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
} from "lucide-react";

const timeline = [
  "Maker",
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

const HRBPScreen = () => {

  const [rows, setRows] = useState([]);
  const [selectedFile, setSelectedFile] =
    useState(null);

  const [activeModule, setActiveModule] =
    useState("Overtime");

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      const response = await API.get("/workflow/hrbp");
      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };
  const saveSheet = async () => {
    try {
      await API.post(
        "/workflow/save-hrbp",
        rows
      );

      alert("Saved");
    } catch (error) {
      console.log(error);
    }
  };

  const handleChange = (index, field, value) => {
    const updated = [...rows];

    updated[index][field] = value;

    setRows(updated);
  };
const downloadTemplate = () => {

  let templateData = [];

  switch (activeModule) {

    case "Overtime":
      templateData = [
        {
          sno: "",
          ecode: "",
          name: "",
          grade: "",
          designation: "",
          employeeHome: "",
          inputType: "Overtime",
          overtimeHours: "",
          remarks: "",
        },
      ];
      break;

    case "Incentive":
      templateData = [
        {
          sno: "",
          ecode: "",
          name: "",
          grade: "",
          designation: "",
          employeeHome: "",
          inputType: "Incentive",
          amount: "",
          remarks: "",
        },
      ];
      break;

    case "Holiday Payout":
      templateData = [
        {
          sno: "",
          ecode: "",
          name: "",
          grade: "",
          designation: "",
          employeeHome: "",
          inputType: "Holiday Payout",
          holidayDate: "",
        },
      ];
      break;

    case "Joining Bonus":
      templateData = [
        {
          sno: "",
          ecode: "",
          name: "",
          grade: "",
          designation: "",
          employeeHome: "",
          inputType: "Joining Bonus",
          amount: "",
          remarks: "",
        },
      ];
      break;

    case "Referral Bonus":
      templateData = [
        {
          sno: "",
          ecode: "",
          name: "",
          grade: "",
          designation: "",
          employeeHome: "",
          inputType: "Referral Bonus",
          amount: "",
          remarks: "",
        },
      ];
      break;

    case "Retention Bonus":
      templateData = [
        {
          sno: "",
          ecode: "",
          name: "",
          grade: "",
          designation: "",
          employeeHome: "",
          inputType: "Retention Bonus",
          amount: "",
          remarks: "",
        },
      ];
      break;

    default:
      break;
  }

  const worksheet =
    XLSX.utils.json_to_sheet(templateData);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    activeModule
  );

  XLSX.writeFile(
    workbook,
    `${activeModule}.xlsx`
  );
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
        jsonData.map(
          (row, index) => ({
            id: index + 1,

            sno: row.sno || "",

            empCode:
              row.ecode || "",

            empName:
              row.name || "",

            grade:
              row.grade || "",

            designation:
              row.designation || "",

            employeeHome:
              row.employeeHome ||
              "",

            type:
              row.inputType || "",

            amount:
              row.amount || "",

            overtimeHours:
              row.overtimeHours ||
              "",

            remarks:
              row.remarks || "",
          })
        );

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
              Payroll Input Sheet
            </h1>

            <p className="text-[11px] text-[#777]">
              HRBP SPOC
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

                <div className="px-4 py-3 border-b border-[#EFEAE2]">

                  <h3 className="text-[13px] font-semibold">
                    Notifications
                  </h3>
                </div>

                <div className="max-h-[320px] overflow-y-auto">

                  {[
                    "Overtime sheet pending review",
                    "Holiday payout awaiting approval",
                    "Payroll file returned by reviewer",
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

                    <th className="p-3">
                      Remarks
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

                      <td className="p-3 text-[12px]">
                        {index + 1}
                      </td>

                      {/* ECODE */}

                      <td className="p-3 text-[12px]">
                        {row.empCode}
                      </td>

                      {/* NAME */}

                      <td className="p-3 text-[12px]">
                        {row.empName}
                      </td>

                      {/* GRADE */}

                      <td className="p-3 text-[12px]">
                        {row.grade}
                      </td>

                      {/* DESIGNATION */}

                      <td className="p-3 text-[12px]">
                        {row.designation}
                      </td>

                      {/* EMPLOYEE HOME */}

                      <td className="p-3 text-[12px]">
                        {row.employeeHome}
                      </td>

                      {/* INPUT TYPE */}

                      <td className="p-3">

                        <select
                          value={row.type}
                          onChange={(e) =>
                            handleChange(
                              index,
                              "type",
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
                        >
                          <option>Overtime</option>

                          <option>Incentive</option>

                          <option>Holiday Payout</option>

                          <option>Joining Bonus</option>

                          <option>Referral Bonus</option>

                          <option>Retention Bonus</option>

                        </select>

                      </td>

                      {/* DYNAMIC COLUMN */}

                      <td className="p-3">

                        {row.type === "Holiday Payout" ? (

                          <input
                            type="date"
                            value={row.payoutDate || ""}
                            onChange={(e) =>
                              handleChange(
                                index,
                                "payoutDate",
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
                                index,
                                row.type === "Overtime"
                                  ? "overtimeHours"
                                  : "amount",
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

                        )}

                      </td>

                      {/* REMARKS */}

                      <td className="p-3">

                        <input
                          value={row.remarks || ""}
                          onChange={(e) =>
                            handleChange(
                              index,
                              "remarks",
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
                      "/workflow/save-hrbp",
                      rows
                    );

                    const response =
                      await API.get(
                        "/workflow/submit-review"
                      );

                    alert(response.data.message);

                    fetchPayrollData();

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
export default HRBPScreen;