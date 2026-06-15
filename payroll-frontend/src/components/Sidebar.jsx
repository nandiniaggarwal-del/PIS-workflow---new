const Sidebar = ({
  activeTab,
  setActiveTab,
}) => {
  const menuItems = [
    "Dashboard",
    "Overtime",
    "Holiday Payout",
    "Incentives",
    "Long Leave",
    "Reviewer Panel",
  ];

  return (
    <div className="w-72 bg-[#FFFDF8] border-r border-[#E7E1D7] h-screen p-7">
      <h1 className="text-3xl font-semibold text-[#0E2A47] mb-14">
        PayrollFlow
      </h1>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <div
            key={item}
            onClick={() => setActiveTab(item)}
            className={`px-4 py-3 rounded-2xl cursor-pointer font-medium transition-all duration-200
              
              ${
                activeTab === item
                  ? "bg-[#0E2A47] text-white shadow-md"
                  : "text-[#4B5563] hover:bg-[#EFE7DA] hover:text-[#0E2A47]"
              }
            `}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;