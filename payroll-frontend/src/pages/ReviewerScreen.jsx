import { useState, useEffect } from "react";
import API from "../services/api";

import {
  Clock3,
  Plane,
  BadgeIndianRupee,
  CalendarRange,
  Bell,
} from "lucide-react";

const timeline = [
  "HRBP",
  "Reviewer",
  "Approver",
  "HRBP Validation",
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

export default function ReviewerScreen() {
  const [rows, setRows] = useState([]);
  const [activeModule, setActiveModule] =
    useState("Overtime");

  const [reviewerComments, setReviewerComments] =
  useState("");

  const [flaggedColumns, setFlaggedColumns] =
    useState([]);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      const response = await API.get("/workflow/reviewer");

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
            Reviewer
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
              Payroll Input Review
            </h1>

            <p className="text-[11px] text-[#777]">
              {user?.name}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <Bell size={17} />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                RV
              </div>

              <div className="text-[12px] font-medium">
                {user?.name}
              </div>
            </div>
          </div>
        </div>

        {/* PAGE */}

        <div className="flex-1 overflow-y-auto p-5">

          <div className="mb-5">
            <h2 className="text-[18px] font-semibold">
              {activeModule}
            </h2>

            <p className="text-[12px] text-[#777]">
              Review payroll inputs
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
              Reviewer Comments
            </h3>

            <textarea
  value={reviewerComments}
  onChange={(e) =>
    setReviewerComments(
      e.target.value
    )
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
      "/workflow/save-review",
      {
        comments: reviewerComments,
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

            <table className="w-full">
              <thead className="bg-[#FAF7F2]">
                <tr>
                  <th className="p-3 text-left text-[12px]">
                    Employee Code
                  </th>
                  <th className="p-3 text-left text-[12px]">
                    Employee Name
                  </th>
                  <th className="p-3 text-left text-[12px]">
                    Input Type
                  </th>
                  <th className="p-3 text-left text-[12px]">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-t border-[#EFEAE2]"
                  >
                    <td className="p-3 text-[12px]">
                      {row.empCode}
                    </td>

                    <td className="p-3 text-[12px]">
                      {row.empName}
                    </td>

                    <td className="p-3 text-[12px]">
                      {row.type}
                    </td>

                    <td className="p-3 text-[12px]">
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="h-[58px] border-t border-[#EFEAE2] px-5 flex items-center justify-end gap-3">

<button
  onClick={async () => {

    try {

      const response =
        await API.get(
          "/workflow/reject-review"
        );

      alert(
        response.data.message
      );

      fetchPayrollData();

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
                        "/workflow/submit-approval"
                      );

                    alert(
                      response.data.message
                    );

                    fetchPayrollData();
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