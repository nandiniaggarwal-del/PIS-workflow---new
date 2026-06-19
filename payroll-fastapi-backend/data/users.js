const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const initialUsers = [
        { email: "nandini.aggarwal@1mg.com", role: "maker" },
        { email: "mukul.vaibhav@1mg.com", role: "hrbp" },
        { email: "hod@company.com", role: "hod" },
        { email: "payroll@company.com", role: "payroll" },
        { email: "amit.khatri@1mg.com", role: "admin" }
      ];
      fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), "utf8");
      return initialUsers;
    }
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load users:", error);
    return [];
  }
}

function saveUsers(usersList) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersList, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save users:", error);
  }
}

const usersProxy = new Proxy([], {
  get(target, prop) {
    if (prop === "saveUsers") {
      return saveUsers;
    }
    const list = loadUsers();
    const value = list[prop];
    if (typeof value === "function") {
      return value.bind(list);
    }
    return value;
  },
  set(target, prop, value) {
    return false;
  }
});

module.exports = usersProxy;