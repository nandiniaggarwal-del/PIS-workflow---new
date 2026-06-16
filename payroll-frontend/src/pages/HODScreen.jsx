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
const user =
  JSON.parse(
    localStorage.getItem(
      "user"
    )
  );

const timeline = [
  "Maker (Business SPOC)",
  "HRBP",
  "Approver (HOD)",
  "Payroll",
];

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

export default function HODScreen() {
  const [rows, setRows] = useState([]);

  const [activeModule, setActiveModule] =
    useState("Overtime");

  const [comments, setComments] =
    useState("");

  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role.toLowerCase() !== "hod") {
      alert("Access Denied: HOD role required.");
      if (storedUser) {
        const r = storedUser.role.toLowerCase();
        if (r === "admin") navigate("/admin");
        else if (r === "maker") navigate("/maker");
        else if (r === "hrbp") navigate("/hrbp");
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
      const response =
        await API.get("/workflow/hod");

      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };
  const filteredRows =
  rows.filter(
    row =>
      row.module === activeModule
  );

  const totalAmount = filteredRows.reduce(
    (sum, row) =>
      sum + Number(row.amount || 0),
    0
  );

  const totalEmployees = filteredRows.length;

  const averagePayout =
    totalEmployees > 0
      ? Math.round(
          totalAmount / totalEmployees
        )
      : 0;

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
            Approver (HOD)
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
                      : "text-[#B8B8B8] hover:bg-[#1E1E1E] hover:text-white"
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

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}

<div className="h-[58px] bg-white border-b border-[#E7E3DC] px-6 flex items-center justify-between">

  <div>

    <h1 className="text-[15px] font-semibold">
      Approver (HOD) Dashboard
    </h1>

    <p className="text-[11px] text-[#777]">
      Approver (HOD)
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
            "2 approval requests pending",
            "Holiday payout submitted",
            "Incentive payout awaiting decision",
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
                5 mins ago
              </p>

            </div>
          ))}
        </div>
      </div>
    </div>

    {/* USER MENU */}

    <div className="relative group">

      <div className="flex items-center gap-3 cursor-pointer">

        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
          Approver (HOD)
        </div>

        <div className="text-[12px] font-medium">
          User
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
            Approver (HOD)
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

          {/* TITLE */}

          <div className="mb-5">

            <h2 className="text-[18px] font-semibold">
              {activeModule}
            </h2>

            <p className="text-[12px] text-[#777]">
              Approver (HOD) Review
            </p>
          </div>

          {/* KPI CARDS */}

          <div className="grid grid-cols-3 gap-4 mb-5">

            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">

              <p className="text-[11px] text-[#777]">
                Total Amount
              </p>

              <h2 className="text-[24px] font-semibold mt-2">
                ₹ {totalAmount.toLocaleString()}
              </h2>
            </div>

            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">

              <p className="text-[11px] text-[#777]">
                Employees Impacted
              </p>

              <h2 className="text-[24px] font-semibold mt-2">
                {totalEmployees}
              </h2>
            </div>

            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">

              <p className="text-[11px] text-[#777]">
                Average Payout
              </p>

              <h2 className="text-[24px] font-semibold mt-2">
                ₹ {averagePayout.toLocaleString()}
              </h2>
            </div>

          </div>

          {/* COMMENTS */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 mb-5">

            <h3 className="text-[13px] font-semibold mb-3">
              Approver (HOD) Comments
            </h3>

            <textarea
              value={comments}
              onChange={(e) =>
                setComments(
                  e.target.value
                )
              }
              placeholder="Enter approval comments..."
              className="
                w-full
                h-[110px]
                border
                border-[#E7E3DC]
                rounded-xl
                p-3
                text-[12px]
                outline-none
                resize-none
              "
            />
          </div>
          

<div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 mb-5">

  <h3 className="text-[13px] font-semibold mb-3">
    Approver (HOD) Flags
  </h3>

  {rows[0]?.flaggedColumns?.length ? (

    <div className="flex gap-2 flex-wrap">

      {rows[0].flaggedColumns.map(
        (column, index) => (

          <div
            key={index}
            className="
              px-3
              py-1
              rounded-lg
              bg-[#F26B5B]
              text-white
              text-[11px]
            "
          >
            {column}
          </div>

        )
      )}

    </div>

  ) : (

    <p className="text-[12px] text-[#777]">
      No flagged columns
    </p>

  )}

</div>
<div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 mb-5">

  <h3 className="text-[13px] font-semibold mb-3">
    Workflow History
  </h3>

  {history?.length ? (
    <div className="max-h-[150px] overflow-y-auto pr-2">
      {history.map(
        (item, index) => (

          <div
            key={index}
            className="border-b border-[#EFEAE2] py-2 last:border-none"
          >

            <p className="text-[12px] font-medium">
              {item.action}
            </p>

            <p className="text-[11px] text-[#777]">
              {item.user}
            </p>

            <p className="text-[10px] text-[#999]">
              {item.timestamp}
            </p>

          </div>

        )
      )}
    </div>
  ) : (

    <p className="text-[12px] text-[#777]">
      No workflow history
    </p>

  )}

</div>

          {/* TABLE */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl overflow-hidden">

            <div className="overflow-auto max-h-[520px]">

              <table className="w-full">

                <thead className="bg-[#FAF7F2] sticky top-0">

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

      <td className="p-3">

        <input
          value={row.remarks || ""}
          onChange={(e) => {
            const updated = rows.map(r => r.id === row.id ? { ...r, remarks: e.target.value } : r);
            setRows(updated);
          }}
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

            {/* ACTIONS */}

            <div className="h-[58px] border-t border-[#EFEAE2] px-5 flex items-center justify-end gap-3">

    <button
  onClick={async () => {

    try {

      await API.post(
        "/workflow/save-hod-review",
        {
          comments
        }
      );

      const response =
        await API.get(
          "/workflow/return-hrbp"
        );

      alert(
        response.data.message
      );

      fetchPayrollData();
      fetchWorkflowHistory();

    } catch (error) {

      console.log(error);

    }

  }}
>
  Reject
</button>

              <button
                onClick={async () => {
                    try {
                        const response =
                            await API.get(
                                "/workflow/submit-payroll"
                            );

                        alert(response.data.message);

                        fetchPayrollData();
                        fetchWorkflowHistory();
                    } catch (error) {
                        console.log(error);
                    }
                }}
                className="
                  h-[36px]
                  px-5
                  rounded-xl
                  bg-black
                  text-white
                  text-[12px]
                "
              >
                Approve & Send to Payroll
              </button>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}