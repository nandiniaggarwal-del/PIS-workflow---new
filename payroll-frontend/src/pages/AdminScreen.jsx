import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { Users, Shield, LogOut, Settings, Plus, Edit2, Trash2, Save, FileJson } from "lucide-react";

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState("users"); // "users" or "earning_heads" or "json"
  const [config, setConfig] = useState({ users: [], earning_heads: [] });
  
  // User Form State
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmpId, setUserEmpId] = useState("");
  const [userRole, setUserRole] = useState("Maker");
  const [userAllowedModules, setUserAllowedModules] = useState("");
  const [editingUserIndex, setEditingUserIndex] = useState(null);

  // Earning Head Form State
  const [headName, setHeadName] = useState("");
  const [headInputType, setHeadInputType] = useState("amount");
  const [headEmpHome, setHeadEmpHome] = useState("ALL");
  const [headInitiators, setHeadInitiators] = useState("");
  const [headHrbp, setHeadHrbp] = useState("NA");
  const [headApprover, setHeadApprover] = useState("");
  const [headRoutingRules, setHeadRoutingRules] = useState([]);
  const [editingHeadIndex, setEditingHeadIndex] = useState(null);

  // JSON Raw Editor State
  const [rawJson, setRawJson] = useState("");

  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");

  useEffect(() => {
    // Route guard check
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      alert("Access Denied: Admin role required.");
      if (currentUser && currentUser.role) {
        const r = currentUser.role.toLowerCase();
        if (r === "maker") navigate("/maker");
        else if (r === "hrbp") navigate("/hrbp");
        else if (r === "hod") navigate("/hod");
        else if (r === "payroll") navigate("/payroll");
        else navigate("/");
      } else {
        navigate("/");
      }
      return;
    }
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await API.get("/admin/config");
      setConfig(response.data);
      setRawJson(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("Failed to fetch configuration:", error);
    }
  };

  const handleSaveConfig = async (newConfig) => {
    try {
      const response = await API.post("/admin/config", newConfig);
      setConfig(response.data);
      setRawJson(JSON.stringify(response.data, null, 2));
      alert("Configuration updated successfully!");
      // Reset forms
      resetUserForm();
      resetHeadForm();
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Failed to save config.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    navigate("/");
  };

  // User Actions
  const resetUserForm = () => {
    setUserEmail("");
    setUserName("");
    setUserEmpId("");
    setUserRole("Maker");
    setUserAllowedModules("");
    setEditingUserIndex(null);
  };

  const handleAddOrEditUser = (e) => {
    e.preventDefault();
    if (!userEmail || !userName || !userEmpId) {
      alert("Please fill all user fields.");
      return;
    }
    const updatedUsers = [...config.users];
    
    const allowedModulesArray = userAllowedModules
      ? userAllowedModules.split(",").map(m => m.trim()).filter(Boolean)
      : ["*"];

    const newUser = {
      name: userName,
      email: userEmail,
      employee_id: userEmpId,
      role: userRole.toLowerCase(),
      allowed_modules: allowedModulesArray
    };

    if (editingUserIndex !== null) {
      updatedUsers[editingUserIndex] = newUser;
    } else {
      updatedUsers.push(newUser);
    }

    const updatedConfig = { ...config, users: updatedUsers };
    handleSaveConfig(updatedConfig);
    resetUserForm();
  };

  const handleEditUser = (index) => {
    const user = config.users[index];
    setUserEmail(user.email);
    setUserName(user.name);
    setUserEmpId(user.employee_id);
    setUserRole(user.role);
    setUserAllowedModules(user.allowed_modules ? user.allowed_modules.join(", ") : "*");
    setEditingUserIndex(index);
  };

  const handleDeleteUser = (index) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const updatedUsers = config.users.filter((_, i) => i !== index);
    const updatedConfig = { ...config, users: updatedUsers };
    handleSaveConfig(updatedConfig);
  };

  // Earning Head Actions
  const resetHeadForm = () => {
    setHeadName("");
    setHeadInputType("amount");
    setHeadEmpHome("ALL");
    setHeadInitiators("");
    setHeadHrbp("NA");
    setHeadApprover("");
    setHeadRoutingRules([]);
    setEditingHeadIndex(null);
  };

  const handleAddOrEditHead = (e) => {
    e.preventDefault();
    if (!headName || !headApprover) {
      alert("Please fill head name and default approver.");
      return;
    }
    const parsedRules = headRoutingRules
      .filter(r => r.initiator_ids.trim() || r.approver.trim())
      .map(r => ({
        initiator_ids: r.initiator_ids.split(",").map(s => s.trim()).filter(Boolean),
        approver: r.approver.trim()
      }));

    const updatedHeads = [...config.earning_heads];
    const newHead = {
      name: headName.toUpperCase(),
      employee_home: headEmpHome,
      initiators: headInitiators.split(",").map(i => i.trim()).filter(Boolean),
      hrbp: headHrbp,
      approver: headApprover,
      input_type: headInputType,
      routing_rules: parsedRules
    };

    if (editingHeadIndex !== null) {
      updatedHeads[editingHeadIndex] = newHead;
    } else {
      updatedHeads.push(newHead);
    }

    const updatedConfig = { ...config, earning_heads: updatedHeads };
    handleSaveConfig(updatedConfig);
  };

  const handleEditHead = (index) => {
    const head = config.earning_heads[index];
    setHeadName(head.name);
    setHeadInputType(head.input_type || "amount");
    setHeadEmpHome(head.employee_home || "ALL");
    setHeadInitiators((head.initiators || []).join(", "));
    setHeadHrbp(head.hrbp || "NA");
    setHeadApprover(head.approver);
    setHeadRoutingRules(
      (head.routing_rules || []).map(r => ({
        initiator_ids: (r.initiator_ids || []).join(", "),
        approver: r.approver || ""
      }))
    );
    setEditingHeadIndex(index);
  };

  const handleDeleteHead = (index) => {
    if (!confirm("Are you sure you want to delete this earning head?")) return;
    const updatedHeads = config.earning_heads.filter((_, i) => i !== index);
    const updatedConfig = { ...config, earning_heads: updatedHeads };
    handleSaveConfig(updatedConfig);
  };

  const handleSaveRawJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.users || !parsed.earning_heads) {
        alert("JSON must contain 'users' and 'earning_heads' keys.");
        return;
      }
      handleSaveConfig(parsed);
    } catch (e) {
      alert("Invalid JSON text: " + e.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F5F3] overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-[68px] hover:w-[220px] transition-all duration-300 bg-[#111111] flex flex-col py-4 overflow-hidden group z-30">
        {/* LOGO */}
        <div className="px-5 mb-8 flex items-center min-w-[220px]">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/7/75/1mg_Logo.png"
            alt="logo"
            className="w-8 brightness-0 invert"
          />
          <span className="ml-4 text-white text-[14px] font-semibold opacity-0 group-hover:opacity-100 transition-all">
            Access Portal
          </span>
        </div>

        {/* MENU */}
        <div className="flex flex-col gap-2 px-3 flex-1">
          <div 
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-4 h-[44px] px-3 rounded-xl cursor-pointer min-w-[200px] ${
              activeTab === "users" ? "bg-[#F26B5B] text-white" : "text-[#B8B8B8] hover:bg-[#1E1E1E] hover:text-white"
            }`}
          >
            <Users size={18} />
            <span className="text-[13px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all">
              User Directory
            </span>
          </div>

          <div 
            onClick={() => setActiveTab("earning_heads")}
            className={`flex items-center gap-4 h-[44px] px-3 rounded-xl cursor-pointer min-w-[200px] ${
              activeTab === "earning_heads" ? "bg-[#F26B5B] text-white" : "text-[#B8B8B8] hover:bg-[#1E1E1E] hover:text-white"
            }`}
          >
            <Settings size={18} />
            <span className="text-[13px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all">
              Earning Heads
            </span>
          </div>

          <div 
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-4 h-[44px] px-3 rounded-xl cursor-pointer min-w-[200px] ${
              activeTab === "json" ? "bg-[#F26B5B] text-white" : "text-[#B8B8B8] hover:bg-[#1E1E1E] hover:text-white"
            }`}
          >
            <FileJson size={18} />
            <span className="text-[13px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all">
              Raw JSON Configuration
            </span>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <div className="h-[58px] bg-white border-b border-[#E7E3DC] px-6 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold">Workflow Rules & Directory Configurator</h1>
            <p className="text-[11px] text-[#777]">System Administration Portal</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px] font-semibold">
                AD
              </div>
              <div className="text-[12px] font-medium">
                {currentUser?.email || "Admin User"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#777] hover:text-black transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "users" && (
            <div className="flex flex-col gap-6">
                {/* USER FORM */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5">
                  <div>
                    <h3 className="text-[14px] font-semibold mb-1">
                      {editingUserIndex !== null ? "Edit User Access" : "Add New User Access"}
                    </h3>
                    <p className="text-[11px] text-[#777] mb-4">
                      Define credentials and role scope for payroll users.
                    </p>
                  </div>

                  <form onSubmit={handleAddOrEditUser} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Full Name</label>
                      <input
                        type="text"
                        placeholder="Nandini Aggarwal"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">User Email</label>
                      <input
                        type="email"
                        placeholder="nandini@company.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Employee ID</label>
                      <input
                        type="text"
                        placeholder="1MG5000"
                        value={userEmpId}
                        onChange={(e) => setUserEmpId(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">System Role</label>
                      <select
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] bg-white outline-none focus:border-[#F26B5B] transition-colors"
                      >
                        <option value="Maker">Maker (Business SPOC)</option>
                        <option value="HRBP">HRBP</option>
                        <option value="HOD">Approver (HOD)</option>
                        <option value="Payroll">Payroll Admin</option>
                        <option value="Admin">Administrator</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Allowed Modules (Comma Separated, e.g. REFERRAL BONUS)</label>
                      <input
                        type="text"
                        placeholder="REFERRAL BONUS, JOINING BONUS"
                        value={userAllowedModules}
                        onChange={(e) => setUserAllowedModules(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-black text-white h-[38px] rounded-xl text-[12px] font-semibold hover:bg-neutral-800 transition-colors"
                      >
                        {editingUserIndex !== null ? "Save Changes" : "Create Access Link"}
                      </button>
                      {editingUserIndex !== null && (
                        <button
                          type="button"
                          onClick={resetUserForm}
                          className="px-4 border border-[#E7E3DC] h-[38px] rounded-xl text-[12px] hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* USER TABLE */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-[14px] font-semibold">User Roster Directory</h3>
                    <p className="text-[11px] text-[#777]">Currently seeded accounts mapped to roles and IDs</p>
                  </div>

                  <div className="overflow-x-auto border border-[#EFEAE2] rounded-xl">
                    <table className="w-full border-collapse">
                       <thead className="bg-[#FAF7F2] border-b border-[#EFEAE2]">
                        <tr>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Name</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Email Address</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Employee ID</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Role</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Allowed Modules</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-center w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.users.map((u, index) => (
                          <tr key={index} className="border-t border-[#EFEAE2] hover:bg-[#FAF7F2]">
                            <td className="p-3 text-[12px] font-medium text-neutral-800">{u.name}</td>
                            <td className="p-3 text-[12px] text-neutral-600">{u.email}</td>
                            <td className="p-3 text-[12px] font-mono">{u.employee_id}</td>
                            <td className="p-3 text-[12px]"><span className="px-2 py-0.5 rounded-full bg-neutral-100 text-[10px] font-semibold">{u.role}</span></td>
                            <td className="p-3 text-[12px] font-mono text-[11px] text-neutral-500 max-w-[200px] truncate" title={u.allowed_modules ? u.allowed_modules.join(", ") : "*"}>
                              {u.allowed_modules ? u.allowed_modules.join(", ") : "*"}
                            </td>
                            <td className="p-3 text-center flex justify-center gap-2">
                              <button onClick={() => handleEditUser(index)} className="text-neutral-500 hover:text-black">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteUser(index)} className="text-[#F26B5B] hover:text-red-700">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          )}

          {activeTab === "earning_heads" && (
            <div className="flex flex-col gap-6">
                {/* EARNING HEAD FORM */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 font-sans">
                  <div>
                    <h3 className="text-[14px] font-semibold mb-1">
                      {editingHeadIndex !== null ? "Edit Earning Head" : "Add New Earning Head"}
                    </h3>
                    <p className="text-[11px] text-[#777] mb-4">
                      Create earning heads, define input type, and configure timelines/routing.
                    </p>
                  </div>

                  <form onSubmit={handleAddOrEditHead} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Earning Head Name</label>
                      <input
                        type="text"
                        placeholder="e.g. OVERTIME HOURS"
                        value={headName}
                        onChange={(e) => setHeadName(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Input Type</label>
                      <select
                        value={headInputType}
                        onChange={(e) => setHeadInputType(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] bg-white outline-none focus:border-[#F26B5B] transition-colors"
                      >
                        <option value="amount">Amount</option>
                        <option value="days">Days</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Employee Home Scope</label>
                      <input
                        type="text"
                        placeholder="e.g. ALL or 1MG"
                        value={headEmpHome}
                        onChange={(e) => setHeadEmpHome(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Initiator IDs (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1MG5051, 1MG5052"
                        value={headInitiators}
                        onChange={(e) => setHeadInitiators(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">HRBP (Employee ID or 'NA' to bypass)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1MG5003 or NA"
                        value={headHrbp}
                        onChange={(e) => setHeadHrbp(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-[#777]">Default Approver HOD (Employee ID)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1MG5998"
                        value={headApprover}
                        onChange={(e) => setHeadApprover(e.target.value)}
                        className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[#777]">Custom Routing Rules</label>
                        <button
                          type="button"
                          onClick={() => setHeadRoutingRules([...headRoutingRules, { initiator_ids: "", approver: "" }])}
                          className="text-[10px] font-semibold text-[#F26B5B] hover:underline"
                        >
                          + Add Rule
                        </button>
                      </div>
                      <p className="text-[10px] text-[#999] -mt-1">When specific makers submit, route to a different approver instead of the default.</p>
                      {headRoutingRules.length === 0 && (
                        <p className="text-[11px] text-[#aaa] italic">No custom rules. All makers route to the default approver above.</p>
                      )}
                      {headRoutingRules.map((rule, ri) => (
                        <div key={ri} className="flex items-end gap-2 p-2 bg-[#FAF7F2] rounded-xl border border-[#EFEAE2]">
                          <div className="flex-1 flex flex-col gap-0.5">
                            <label className="text-[9px] font-semibold text-[#999] uppercase">Maker Employee IDs (comma separated)</label>
                            <input
                              type="text"
                              value={rule.initiator_ids}
                              onChange={(e) => {
                                const updated = [...headRoutingRules];
                                updated[ri] = { ...updated[ri], initiator_ids: e.target.value };
                                setHeadRoutingRules(updated);
                              }}
                              placeholder="e.g. 1MG5466, 1MG6284"
                              className="border border-[#E7E3DC] p-1.5 rounded-lg text-[11px] outline-none focus:border-[#F26B5B]"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5" style={{minWidth: "120px"}}>
                            <label className="text-[9px] font-semibold text-[#999] uppercase">Route to Approver ID</label>
                            <input
                              type="text"
                              value={rule.approver}
                              onChange={(e) => {
                                const updated = [...headRoutingRules];
                                updated[ri] = { ...updated[ri], approver: e.target.value };
                                setHeadRoutingRules(updated);
                              }}
                              placeholder="e.g. 1MG6318"
                              className="border border-[#E7E3DC] p-1.5 rounded-lg text-[11px] outline-none focus:border-[#F26B5B]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setHeadRoutingRules(headRoutingRules.filter((_, i) => i !== ri))}
                            className="text-[#F26B5B] hover:text-red-700 pb-1"
                            title="Remove this rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-black text-white h-[38px] rounded-xl text-[12px] font-semibold hover:bg-neutral-800 transition-colors"
                      >
                        {editingHeadIndex !== null ? "Save Changes" : "Create Earning Head"}
                      </button>
                      {editingHeadIndex !== null && (
                        <button
                          type="button"
                          onClick={resetHeadForm}
                          className="px-4 border border-[#E7E3DC] h-[38px] rounded-xl text-[12px] hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* EARNING HEADS LIST TABLE */}
                <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-[14px] font-semibold">Workflow Earning Heads Configuration</h3>
                    <p className="text-[11px] text-[#777]">Defined rules, input constraints, and workflows</p>
                  </div>

                  <div className="overflow-x-auto border border-[#EFEAE2] rounded-xl">
                    <table className="w-full border-collapse">
                      <thead className="bg-[#FAF7F2] border-b border-[#EFEAE2]">
                        <tr>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Name</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Input</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Home</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">HRBP</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Default Approver</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Rules</th>
                          <th className="p-3 text-[11px] font-semibold text-[#777] text-center w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.earning_heads.map((eh, index) => (
                          <tr key={index} className="border-t border-[#EFEAE2] hover:bg-[#FAF7F2]">
                            <td className="p-3 text-[12px] font-bold text-neutral-800">{eh.name}</td>
                            <td className="p-3 text-[12px] capitalize font-semibold">{eh.input_type}</td>
                            <td className="p-3 text-[12px] font-mono">{eh.employee_home}</td>
                            <td className="p-3 text-[12px]">
                              {eh.hrbp === "NA" ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">Bypassed</span>
                              ) : (
                                <span className="font-mono">{eh.hrbp}</span>
                              )}
                            </td>
                            <td className="p-3 text-[12px] font-mono">{eh.approver}</td>
                            <td className="p-3 text-[12px] font-mono">
                              {(eh.routing_rules || []).length > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-semibold">
                                  {(eh.routing_rules || []).length} Custom
                                </span>
                              ) : (
                                <span className="text-[#999]">None</span>
                              )}
                            </td>
                            <td className="p-3 text-center flex justify-center gap-2">
                              <button onClick={() => handleEditHead(index)} className="text-neutral-500 hover:text-black">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteHead(index)} className="text-[#F26B5B] hover:text-red-700">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col gap-4 flex-1 h-[calc(100vh-160px)]">
              <div>
                <h3 className="text-[14px] font-semibold flex items-center gap-2">
                  <FileJson size={16} className="text-[#F26B5B]" />
                  Raw JSON Configuration Seeding
                </h3>
                <p className="text-[11px] text-[#777]">
                  View or modify the database configurations directly in standard JSON payload structure.
                </p>
              </div>

              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                className="flex-1 w-full p-4 border border-[#E7E3DC] rounded-2xl font-mono text-[12px] outline-none focus:border-[#F26B5B] resize-none"
              />

              <div className="flex gap-3 justify-end mt-2">
                <button
                  onClick={fetchConfig}
                  className="px-5 h-[38px] border border-[#E7E3DC] rounded-xl text-[12px] font-semibold hover:bg-neutral-50"
                >
                  Reload Original
                </button>
                <button
                  onClick={handleSaveRawJson}
                  className="px-6 h-[38px] bg-black text-white rounded-xl text-[12px] font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Apply Configuration JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
