import { useState, useEffect } from "react";
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

const modules = [
  {
    icon: Clock3,
    label: "Overtime",
  },
  {
    icon: Plane,
    label: "Long Leave",
  },
  {
    icon: BadgeIndianRupee,
    label: "Incentives",
  },
  {
    icon: CalendarRange,
    label: "Holiday Payment",
  },
];

export default function ApproverScreen() {
  const [rows, setRows] = useState([]);

  const [activeModule, setActiveModule] =
    useState("Overtime");

  const [comments, setComments] =
    useState("");

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      const response =
        await API.get("/workflow/approver");

      setRows(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const totalAmount = rows.reduce(
    (sum, row) =>
      sum + Number(row.amount || 0),
    0
  );

  const totalEmployees = rows.length;

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
            Approver
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
      Payroll Approval Dashboard
    </h1>

    <p className="text-[11px] text-[#777]">
      Approver
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
          AP
        </div>

        <div className="text-[12px] font-medium">
          Approver User
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
            Approver User
          </p>

          <p className="text-[11px] text-[#888] mt-1">
            Department Approver
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
              Final Approval Review
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
              Approver Comments
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

  <h3 className="text-[13px] font-semibold mb-2">
    Reviewer Comments
  </h3>

  <p className="text-[12px] text-[#444]">
    {rows[0]?.reviewerComments ||
      "No comments available"}
  </p>

</div>
<div className="
bg-white
border
border-[#E7E3DC]
rounded-2xl
p-5
mb-5
">

<h3 className="
text-[13px]
font-semibold
mb-3
">
Flagged Columns
</h3>

<div className="
flex
gap-2
flex-wrap
">
{rows[0]?.flaggedColumns?.map(
(column,index)=>(

<div
key={index}
className="
px-3
py-2
rounded-lg
bg-[#F26B5B]
text-white
text-[11px]
"
>
{column}
</div>

))
}
</div>

</div>
<div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 mb-5">

  <h3 className="text-[13px] font-semibold mb-3">
    Reviewer Flags
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

  {rows[0]?.history?.length ? (

    rows[0].history.map(
      (item, index) => (

        <div
          key={index}
          className="border-b border-[#EFEAE2] py-2"
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
    )

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

                    <th className="text-left p-3 text-[12px]">
                      Employee Code
                    </th>

                    <th className="text-left p-3 text-[12px]">
                      Employee Name
                    </th>

                    <th className="text-left p-3 text-[12px]">
                      Input Type
                    </th>

                    <th className="text-left p-3 text-[12px]">
                      Amount
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {rows.map((row) => (
                    <tr
                      key={row.id}
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
                        ₹ {row.amount}
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

      const response =
        await API.get(
          "/workflow/reject-approval"
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
                                "/workflow/submit-hrbp-validation"
                            );

                        alert(response.data.message);

                        fetchPayrollData();
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
                Approve & Send to HRBP Validation
              </button>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}