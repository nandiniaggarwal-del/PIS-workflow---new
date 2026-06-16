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

export default function HRBPScreen() {
  const [rows, setRows] = useState([]);
  const [activeModule, setActiveModule] =
    useState("Overtime");

  const [hrbpComments, setHrbpComments] =
  useState("");

  const [flaggedColumns, setFlaggedColumns] =
    useState([]);

  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
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
      const response = await API.get("/workflow/hrbp");

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
            <Bell size={17} />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                HR
              </div>

              <div className="text-[12px] font-medium">
                {user?.name}
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
          </div>

          {/* TIMELINE */}

          <div className="bg-white border border-[#E7E3DC] rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between">
              {timeline.map((step, index) => (
                <div
                  key={step}
                  className="flex-1 flex flex-col items-center relative"
                >
                  {index !==
                    timeline.length - 1 && (
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

                  <p className="mt-2 text-[11px]">
                    {step}
                  </p>
                </div>
              ))}
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
  <th className="p-3">Ecode</th>
  <th className="p-3">Name</th>
  <th className="p-3">Grade</th>
  <th className="p-3">Designation</th>
  <th className="p-3">Employee Home</th>
  <th className="p-3">Input Type</th>
  <th className="p-3">
    {activeModule === "Overtime"
      ? "OT Hours"
      : activeModule === "Holiday Payout"
      ? "Date"
      : "Amount"}
  </th>
  <th className="p-3">Remarks</th>
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

            <div className="h-[58px] border-t border-[#EFEAE2] px-5 flex items-center justify-end gap-3">

<button
  onClick={async () => {

    try {
      await API.post(
        "/workflow/save-hrbp-review",
        {
          comments: hrbpComments,
          flaggedColumns,
        }
      );

      const response =
        await API.get(
          "/workflow/return-maker"
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
                    const response =
                      await API.get(
                        "/workflow/submit-hod"
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