const Header = () => {
  return (
    <div className="bg-[#FFFDF8] border border-[#E7E1D7] p-7 rounded-[28px] flex justify-between items-center shadow-sm">
      <div>
        <h1 className="text-4xl font-semibold text-[#0E2A47]">
          Payroll Workflow
        </h1>

        <p className="text-[#6B7280] mt-2 text-sm">
          August 2025 Processing Cycle
        </p>
      </div>

      <div className="bg-[#EFE7DA] px-5 py-3 rounded-2xl text-sm font-medium text-[#0E2A47]">
        HRBP SPOC
      </div>
    </div>
  );
};

export default Header;