const fs = require("fs");
const path = require("path");
const FILE_PATH = path.join(__dirname, "otpStore.json");

const load = () => {
  try {
    if (fs.existsSync(FILE_PATH)) {
      return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    }
  } catch (err) {
    console.error("Error loading otpStore:", err);
  }
  return {};
};

const save = (data) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving otpStore:", err);
  }
};

const otpStore = new Proxy({}, {
  get(target, prop) {
    const data = load();
    return data[prop];
  },
  set(target, prop, value) {
    const data = load();
    if (value === undefined) {
      delete data[prop];
    } else {
      data[prop] = value;
    }
    save(data);
    return true;
  },
  deleteProperty(target, prop) {
    const data = load();
    delete data[prop];
    save(data);
    return true;
  }
});

module.exports = otpStore;