const users = require("../data/users");
const { saveUsers } = require("../data/users");

const getCurrentUser = (req, res) => {
  if (req.user) {
    const user = users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
    if (user) {
      return res.json(user);
    }
  }
  res.json(users[0]);
};

const getAllUsers = (req, res) => {
  res.json(users);
};

const createUser = (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ message: "Email and role are required" });
  }
  const list = [...users];
  const index = list.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (index !== -1) {
    list[index].role = role.trim().toLowerCase();
  } else {
    list.push({ email: email.trim().toLowerCase(), role: role.trim().toLowerCase() });
  }
  saveUsers(list);
  res.json({ message: "User saved successfully", users: list });
};

const deleteUser = (req, res) => {
  const { email } = req.params;
  const list = users.filter(u => u.email.toLowerCase() !== email.trim().toLowerCase());
  saveUsers(list);
  res.json({ message: "User deleted successfully", users: list });
};

module.exports = {
  getCurrentUser,
  getAllUsers,
  createUser,
  deleteUser
};