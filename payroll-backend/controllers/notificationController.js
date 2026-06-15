const notifications = require("../data/notifications");

const getNotifications = (req, res) => {
  res.json(notifications);
};

module.exports = {
  getNotifications,
};