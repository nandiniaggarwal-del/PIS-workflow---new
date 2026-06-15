const steps = [
  "HRBP Submission",
  "Business Review",
  "Approver",
  "Payroll",
  "Completed",
];

const WorkflowTracker = () => {
  return (
    <div className="bg-[#FFFDF8] border border-[#E7E1D7] p-8 rounded-[28px] mt-6 shadow-sm">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Workflow Status
          </h2>

          <p className="text-[#6B7280] mt-1 text-sm">
            Real-time payroll movement tracking
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center relative"
          >
            <div className="w-14 h-14 rounded-full bg-[#0E2A47] text-white flex items-center justify-center font-semibold z-10 shadow-lg">
              {index + 1}
            </div>

            <p className="mt-4 text-sm font-medium text-center text-[#374151]">
              {step}
            </p>

            {index !== steps.length - 1 && (
              <div className="absolute top-7 left-1/2 w-full h-[3px] bg-[#E7E1D7]"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowTracker;