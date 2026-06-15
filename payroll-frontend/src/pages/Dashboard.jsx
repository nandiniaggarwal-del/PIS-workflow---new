import Header from "../components/Header";
import WorkflowTracker from "../components/WorkflowTracker";
import FileTrackerTable from "../components/FileTrackerTable";

const Dashboard = () => {
  return (
    <div className="flex-1 p-6">
      <Header />

      <WorkflowTracker />

      <FileTrackerTable />
    </div>
  );
};

export default Dashboard;