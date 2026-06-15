import { useState } from "react";
import { uploadedFiles as initialFiles } from "../data/dummyData";

const FileTrackerTable = () => {
  const [files, setFiles] = useState(initialFiles);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];

    if (!uploadedFile) return;

    const newFile = {
      id: Date.now(),
      fileName: uploadedFile.name,
      module: "Uploaded Module",
      uploadedBy: "Current User",
      stage: "HRBP Submission",
      status: "Uploaded",
    };

    setFiles((prev) => [newFile, ...prev]);
  };

  return (
    <div className="bg-[#FFFDF8] border border-[#E7E1D7] p-8 rounded-[28px] mt-6 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Payroll Files
          </h2>

          <p className="text-[#6B7280] mt-1 text-sm">
            Upload and track payroll workflow templates
          </p>
        </div>

        <div className="flex gap-4">
          <a
            href="/template.csv"
            download="Payroll_Template.csv"
            className="bg-[#0E2A47] hover:opacity-90 text-white px-6 py-3 rounded-2xl text-sm font-medium shadow-md"
          >
            Download Template
          </a>

          <label className="bg-[#EFE7DA] hover:bg-[#E5D8C5] text-[#0E2A47] px-6 py-3 rounded-2xl cursor-pointer text-sm font-medium">
            Upload Filled Sheet

            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="bg-[#F8F6F1] border border-[#E7E1D7] rounded-2xl p-5 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-[#0E2A47]">
                {file.fileName}
              </h3>

              <p className="text-sm text-[#6B7280] mt-1">
                {file.module} • {file.uploadedBy}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-[#374151]">
                {file.stage}
              </div>

              <div className="bg-[#EFE7DA] text-[#0E2A47] px-4 py-2 rounded-full text-sm font-medium">
                {file.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileTrackerTable;