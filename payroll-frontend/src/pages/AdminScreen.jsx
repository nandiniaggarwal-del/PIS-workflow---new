import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { Users, UserPlus, Trash2, Shield, Search, LogOut } from "lucide-react";

export default function AdminScreen() {
  const [usersList, setUsersList] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("maker");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Route guard check
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role.toLowerCase() !== "admin") {
      alert("Access Denied: Admin role required.");
      if (storedUser) {
        const r = storedUser.role.toLowerCase();
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
    setCurrentUser(storedUser);
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const response = await API.get("/users");
      setUsersList(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!email.trim() || !role) {
      alert("Please enter a valid email and select a role.");
      return;
    }
    try {
      const response = await API.post("/users", {
        email: email.trim(),
        role: role
      });
      alert(response.data.message);
      setUsersList(response.data.users);
      setEmail("");
      setRole("maker");
    } catch (error) {
      console.error("Failed to save user:", error);
      alert("Error saving user.");
    }
  };

  const handleDeleteUser = async (userEmail) => {
    if (userEmail.toLowerCase() === currentUser?.email.toLowerCase()) {
      alert("You cannot delete your own admin account.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${userEmail}?`)) return;
    try {
      const response = await API.delete(`/users/${userEmail}`);
      alert(response.data.message);
      setUsersList(response.data.users);
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Error deleting user.");
    }
  };

  const handleRoleChange = async (userEmail, newRole) => {
    try {
      const response = await API.post("/users", {
        email: userEmail,
        role: newRole
      });
      setUsersList(response.data.users);
      if (userEmail.toLowerCase() === currentUser?.email.toLowerCase() && newRole !== "admin") {
        alert("You have demoted yourself. You will be logged out.");
        handleLogout();
      }
    } catch (error) {
      console.error("Failed to update user role:", error);
      alert("Error updating role.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("loginEmail");
    navigate("/");
  };

  const filteredUsers = usersList.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex flex-col gap-2 px-3">
          <div className="flex items-center gap-4 h-[44px] px-3 rounded-xl bg-[#F26B5B] text-white cursor-pointer min-w-[200px]">
            <Shield size={18} />
            <span className="text-[13px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all">
              User Access List
            </span>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <div className="h-[58px] bg-white border-b border-[#E7E3DC] px-6 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold">User Role Configurator</h1>
            <p className="text-[11px] text-[#777]">System Administration</p>
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ADD USER FORM */}
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="text-[14px] font-semibold mb-1 flex items-center gap-2">
                  <UserPlus size={16} className="text-[#F26B5B]" />
                  Add/Modify Access
                </h3>
                <p className="text-[11px] text-[#777] mb-4">
                  Define roles dynamically. Existing emails will have their role updated.
                </p>
              </div>

              <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#777]">User Email</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] transition-colors"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#777]">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="border border-[#E7E3DC] p-2 rounded-xl text-[12px] bg-white outline-none focus:border-[#F26B5B] transition-colors"
                  >
                    <option value="maker">Maker (Business SPOC)</option>
                    <option value="hrbp">HRBP</option>
                    <option value="hod">Approver (HOD)</option>
                    <option value="payroll">Payroll Admin</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-black text-white h-[38px] rounded-xl text-[12px] font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Save Access Permission
                </button>
              </form>
            </div>

            {/* QUICK STATS */}
            <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="text-[14px] font-semibold mb-1 flex items-center gap-2">
                  <Users size={16} className="text-[#F26B5B]" />
                  Access Statistics
                </h3>
                <p className="text-[11px] text-[#777] mb-4">
                  Current active permissions breakdown
                </p>
              </div>

              <div className="flex flex-col gap-2 text-[12px]">
                <div className="flex justify-between border-b border-[#F5F5F3] py-2">
                  <span className="text-[#777]">Total Configured Accounts</span>
                  <span className="font-semibold">{usersList.length}</span>
                </div>
                <div className="flex justify-between border-b border-[#F5F5F3] py-2">
                  <span className="text-[#777]">Makers</span>
                  <span className="font-semibold">{usersList.filter(u => u.role === "maker").length}</span>
                </div>
                <div className="flex justify-between border-b border-[#F5F5F3] py-2">
                  <span className="text-[#777]">HRBPs</span>
                  <span className="font-semibold">{usersList.filter(u => u.role === "hrbp").length}</span>
                </div>
                <div className="flex justify-between border-b border-[#F5F5F3] py-2">
                  <span className="text-[#777]">HODs</span>
                  <span className="font-semibold">{usersList.filter(u => u.role === "hod").length}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#777]">Admins</span>
                  <span className="font-semibold">{usersList.filter(u => u.role === "admin").length}</span>
                </div>
              </div>
            </div>
            
            {/* INFORMATION */}
            <div className="bg-[#FAF7F2] border border-[#E7E3DC] rounded-2xl p-5 flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="text-[14px] font-semibold mb-1 text-[#F26B5B]">
                  Role Access Policy
                </h3>
                <p className="text-[11px] text-[#777] mb-4">
                  Security directives enforced by route guards
                </p>
              </div>

              <div className="text-[11px] text-neutral-600 flex flex-col gap-2">
                <p><strong>Maker:</strong> Submits lists and details.</p>
                <p><strong>HRBP:</strong> Validates fields and flags columns.</p>
                <p><strong>HOD:</strong> Authorizes the final amount.</p>
                <p><strong>Payroll:</strong> Exports database CSV logs.</p>
                <p className="mt-2 text-[10px] text-red-500 font-medium">
                  * Admins can configure, but only roles can view their respective boards.
                </p>
              </div>
            </div>
          </div>

          {/* ACCESS MATRIX TABLE */}
          <div className="bg-white border border-[#E7E3DC] rounded-2xl p-5 flex-1 flex flex-col gap-4 min-h-[350px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-semibold">Authorized System Users</h3>
                <p className="text-[11px] text-[#777]">Active access rights</p>
              </div>

              {/* SEARCH */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-[#E7E3DC] pl-8 pr-4 py-2 rounded-xl text-[12px] outline-none focus:border-[#F26B5B] w-[220px] transition-colors"
                />
                <Search size={14} className="absolute left-2.5 top-3 text-[#999]" />
              </div>
            </div>

            <div className="overflow-x-auto border border-[#EFEAE2] rounded-xl flex-1 max-h-[300px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[#FAF7F2] sticky top-0 z-10 border-b border-[#EFEAE2]">
                  <tr>
                    <th className="p-3 text-[11px] font-semibold text-[#777] text-left w-[80px]">S.No</th>
                    <th className="p-3 text-[11px] font-semibold text-[#777] text-left">Email Address</th>
                    <th className="p-3 text-[11px] font-semibold text-[#777] text-left w-[200px]">Assigned Role</th>
                    <th className="p-3 text-[11px] font-semibold text-[#777] text-center w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item, index) => (
                    <tr key={item.email} className="border-t border-[#EFEAE2] hover:bg-[#FAF7F2] transition-colors">
                      <td className="p-3 text-[12px]">{index + 1}</td>
                      <td className="p-3 text-[12px] font-medium text-neutral-800">{item.email}</td>
                      <td className="p-3">
                        <select
                          value={item.role}
                          onChange={(e) => handleRoleChange(item.email, e.target.value)}
                          className="border border-[#E7E3DC] px-2 py-1 rounded-lg text-[11px] bg-white outline-none w-full"
                        >
                          <option value="maker">Maker</option>
                          <option value="hrbp">HRBP</option>
                          <option value="hod">HOD</option>
                          <option value="payroll">Payroll</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteUser(item.email)}
                          disabled={item.email.toLowerCase() === currentUser?.email.toLowerCase()}
                          className={`transition-colors p-1 ${
                            item.email.toLowerCase() === currentUser?.email.toLowerCase()
                              ? "text-neutral-300 cursor-not-allowed"
                              : "text-[#F26B5B] hover:text-red-700"
                          }`}
                          title="Revoke Access"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-[12px] text-[#777]">
                        No authorized users found matching search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
