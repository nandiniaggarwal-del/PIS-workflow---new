import { useState, useEffect } from "react";
import API from "../services/api";

import {
  Clock3,
  Plane,
  BadgeIndianRupee,
  CalendarRange,
  Bell,
  Download,
} from "lucide-react";

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
const user =
  JSON.parse(
    localStorage.getItem(
      "user"
    )
  );

export default function PayrollScreen() {
  const [rows, setRows] = useState([]);

  const [activeModule, setActiveModule] =
    useState("Overtime");

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const filteredRows =
  rows.filter(
    row =>
      row.module === activeModule
  );

  const fetchPayrollData = async () => {
    try {
      const response =
        await API.get("/workflow/payroll");

      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };

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

    <h2 className="text-[24px] font-semibold mt-2">
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



 const exportExcel = () => {

  const csvRows = [];

  csvRows.push(
    [
      "Employee Code",
      "Employee Name",
      "Input Type",
      activeModule === "Overtime"
        ? "OT Hours"
        : activeModule === "Holiday Payout"
        ? "Date"
        : "Amount",
      "Remarks",
    ].join(",")
  );

  filteredRows.forEach((row) => {

    csvRows.push(
      [
        row.empCode,
        row.empName,
        row.type,

        activeModule === "Overtime"
          ? row.overtimeHours
          : activeModule === "Holiday Payout"
          ? row.payoutDate
          : row.amount,

        row.remarks,
      ].join(",")
    );

  });

  const blob = new Blob(
    [csvRows.join("\n")],
    {
      type: "text/csv",
    }
  );

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `${activeModule}.csv`;

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

        <div className="flex flex-col gap-2 px-3">

          {modules.map((item) => {

            const Icon = item.icon;

            return (
              <div
                key={item.label}
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
                  min-w-[200px]

                  ${
                    activeModule === item.label
                      ? "bg-[#F26B5B] text-white"
                      : "text-[#B8B8B8]"
                  }
                `}
              >
                <Icon size={18} />

                <span
                  className="
                    opacity-0
                    group-hover:opacity-100
                    text-[13px]
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

            <Bell size={17} />

            <div className="flex items-center gap-3">

              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                PY
              </div>

              <div className="text-[12px] font-medium">
                Payroll User
              </div>

            </div>

          </div>

        </div>

        {/* PAGE */}

        <div className="flex-1 overflow-y-auto p-5">

  <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden mb-5">

    <table className="w-full">

      <thead className="bg-[#FAF7F2]">

        <tr>
          <th>S No</th>
<th>Ecode</th>
<th>Name</th>
<th>Grade</th>
<th>Designation</th>
<th>Employee Home</th>
<th>Input Type</th>
<th>
  {activeModule === "Overtime"
    ? "OT Hours"
    : activeModule === "Holiday Payout"
    ? "Date"
    : "Amount"}
</th>
<th>Remarks</th>
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
        {row.empName}
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
        {row.type}
      </td>

      <td className="p-3 text-[12px]">

        {activeModule === "Overtime"
          ? row.overtimeHours
          : activeModule === "Holiday Payout"
          ? row.holidayDate
          : row.amount}

      </td>

      <td className="p-3 text-[12px]">
        {row.remarks}
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