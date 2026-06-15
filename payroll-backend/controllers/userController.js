const users = require("../data/users");

const getCurrentUser = (req, res) => {
  res.json(users[0]);
};

module.exports = {
  getCurrentUser,
};