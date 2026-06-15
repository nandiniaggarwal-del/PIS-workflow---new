import { uploadedFiles } from "../data/dummyData";

const ReviewerPanel = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow mt-6">
      <h2 className="text-xl font-semibold mb-6">
        Reviewer Validation Panel
      </h2>

      <div className="space-y-6">
        {uploadedFiles.map((file) => (
          <div
            key={file.id}
            className="border rounded-xl p-5"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-semibold text-lg">
                  {file.fileName}
                </h3>

                <p className="text-gray-500 text-sm">
                  Current Stage: {file.stage}
                </p>
              </div>

              <div className="space-x-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                  Approve
                </button>

                <button className="bg-red-600 text-white px-4 py-2 rounded-lg">
                  Reject
                </button>

                <button className="bg-yellow-500 text-white px-4 py-2 rounded-lg">
                  Return
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Column Name"
                className="border border-gray-300 p-3 rounded-lg"
              />

              <input
                type="text"
                placeholder="Schema / Validation Rule"
                className="border border-gray-300 p-3 rounded-lg"
              />
            </div>

            <textarea
              placeholder="Reviewer comments..."
              className="border border-gray-300 p-3 rounded-lg w-full mt-4 h-24"
            ></textarea>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewerPanel;