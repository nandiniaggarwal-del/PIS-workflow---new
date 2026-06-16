const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-payroll-key-123456";

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null; // Expired
    return payload;
  } catch {
    return null;
  }
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token required" });
  }
  const token = authHeader.split(" ")[1];
  const userPayload = verifyToken(token);
  if (!userPayload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  req.user = userPayload;
  next();
};

const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize
};
