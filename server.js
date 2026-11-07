
require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


const app = express();
const PORT = process.env.PORT || 3000;

// CORS SETTINGS
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

allowedOrigins.push("http://localhost:3000");

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});



const BOOKINGS_FILE = path.join(__dirname, "bookings.json");
const BLOCKS_FILE = path.join(__dirname, "blocked-slots.json");
const SERVICES_FILE = path.join(__dirname, "services.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SLOTS = [
  "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00"
];

const DEFAULT_SERVICES = [
  {
    id: "manicure",
    name: "Մատնահարդարում",
    price: null,
    description: "",
    active: true
  },
  {
    id: "gel",
    name: "Գել լաք",
    price: null,
    description: "",
    active: true
  },
  {
    id: "extension",
    name: "Եղունգների երկարացում",
    price: null,
    description: "",
    active: true
  }
];

// -------------------------
// JSON DATABASE
// -------------------------

function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error("File read error:", file, error.message);
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getBookings() {
  return readJson(BOOKINGS_FILE);
}

function getBlocks() {
  return readJson(BLOCKS_FILE);
}

function getServices() {
  return readJson(SERVICES_FILE, DEFAULT_SERVICES);
}

function saveServices(services) {
  writeJson(SERVICES_FILE, services);
}

// -------------------------
// DATE VALIDATION
// -------------------------

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isPast(date, time) {
  const appointment = new Date(`${date}T${time}:00+04:00`);
  return appointment <= new Date();
}

function isBooked(date, time) {
  return getBookings().some(
    booking => booking.date === date && booking.time === time
  );
}

function isBlocked(date, time) {
  return getBlocks().some(
    block =>
      block.date === date &&
      (block.time === "*" || block.time === time)
  );
}

function isUnavailable(date, time) {
  return isBooked(date, time) || isBlocked(date, time);
}

// -------------------------
// TELEGRAM
// -------------------------

async function sendTelegram(booking) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  const text = [
    "💅 ՆՈՐ ԳՐԱՆՑՈՒՄ — NAIL ART LIANA",
    "",
    `👤 Անուն: ${booking.name}`,
    `📞 Հեռախոս: ${booking.phone}`,
    `💎 Ծառայություն: ${booking.service}`,
    `💰 Գին: ${booking.servicePrice === null ? "Նշված չէ" : booking.servicePrice + " ֏"}`,
    `📅 Ամսաթիվ: ${booking.date}`,
    `🕒 Ժամ: ${booking.time}`
  ].join("\n");

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Telegram error:", error.message);
    return false;
  }
}

// -------------------------
// CUSTOMER SERVICES
// -------------------------

app.get("/api/services", (req, res) => {
  const services = getServices()
    .filter(service => service.active)
    .map(service => ({
      id: service.id,
      name: service.name,
      price: service.price,
      description: service.description
    }));

  res.json({ services });
});

// -------------------------
// CUSTOMER SLOTS
// -------------------------

app.get("/api/slots", (req, res) => {
  const date = String(req.query.date || "");

  if (!validDate(date)) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const slots = SLOTS.map(time => {
    let reason = null;

    if (isBooked(date, time)) {
      reason = "booked";
    } else if (isBlocked(date, time)) {
      reason = "blocked";
    } else if (isPast(date, time)) {
      reason = "past";
    }

    return {
      time,
      available: reason === null,
      reason
    };
  });

  res.json({ slots });
});

// -------------------------
// CUSTOMER BOOKINGS
// -------------------------

app.post("/api/bookings", async (req, res) => {
  const {
    name,
    phone,
    service,
    date,
    time,
    language
  } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof phone !== "string" ||
    typeof service !== "string" ||
    typeof date !== "string" ||
    typeof time !== "string"
  ) {
    return res.status(400).json({
      error: "Լրացրեք բոլոր դաշտերը։"
    });
  }

  const cleanName = name.trim();
  const cleanPhone = phone.trim();

  if (
    cleanName.length < 2 ||
    cleanName.length > 80 ||
    cleanPhone.length < 5 ||
    cleanPhone.length > 30
  ) {
    return res.status(400).json({
      error: "Ստուգեք մուտքագրված տվյալները։"
    });
  }

  if (!validDate(date) || !SLOTS.includes(time)) {
    return res.status(400).json({
      error: "Սխալ տվյալներ։"
    });
  }

  const selectedService = getServices().find(
    item => item.id === service && item.active
  );

  if (!selectedService) {
    return res.status(400).json({
      error: "Այս ծառայությունը հասանելի չէ։"
    });
  }

  if (isPast(date, time)) {
    return res.status(400).json({
      error: "Այս ժամը արդեն անցել է։"
    });
  }

  if (isUnavailable(date, time)) {
    return res.status(409).json({
      error: "Այս ժամը արդեն զբաղված է։ Ընտրեք մեկ այլ ժամ։"
    });
  }

  const booking = {
    id: crypto.randomUUID(),
    name: cleanName,
    phone: cleanPhone,
    service: selectedService.name,
    serviceId: selectedService.id,
    servicePrice: selectedService.price,
    date,
    time,
    language: ["hy", "ru", "en"].includes(language)
      ? language
      : "hy",
    createdAt: new Date().toISOString()
  };

  const bookings = getBookings();
  bookings.push(booking);
  writeJson(BOOKINGS_FILE, bookings);

  const telegramSent = await sendTelegram(booking);

  res.json({
    ok: true,
    bookingId: booking.id,
    telegramSent
  });
});

// -------------------------
// ADMIN AUTH
// -------------------------

const sessions = new Map();
const SESSION_DURATION = 8 * 60 * 60 * 1000;

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");

  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");

    if (key === name) return value.join("=");
  }

  return null;
}

function requireAdmin(req, res, next) {
  const token = getCookie(req, "nail_admin");

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const session = sessions.get(token);

  if (!session || session.expires < Date.now()) {
    sessions.delete(token);

    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

function cookieOptions(req) {
  const secure =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";

return [
  "Path=/",
  "HttpOnly",
  "SameSite=None",
  "Max-Age=28800",
  ...(secure ? ["Secure"] : [])
].join("; "); 

app.post("/api/admin/login", (req, res) => {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return res.status(503).json({
      error: "Ադմինի գաղտնաբառը կարգավորված չէ։"
    });
  }

  const entered = String(req.body?.password || "");

  if (entered !== password) {
    return res.status(401).json({
      error: "Սխալ գաղտնաբառ։"
    });
  }

  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    expires: Date.now() + SESSION_DURATION
  });

  res.setHeader(
    "Set-Cookie",
    `nail_admin=${token}; ${cookieOptions(req)}`
  );

  res.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ authenticated: true });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  const token = getCookie(req, "nail_admin");
  sessions.delete(token);

  res.setHeader(
    "Set-Cookie",
    "nail_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
  );

  res.json({ ok: true });
});

// -------------------------
// ADMIN SERVICES
// -------------------------

app.get("/api/admin/services", requireAdmin, (req, res) => {
  res.json({
    services: getServices()
  });
});

// ADD SERVICE

app.post("/api/admin/services", requireAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();
  const price = req.body?.price;

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({
      error: "Ծառայության անունը պետք է լինի 2-100 նիշ։"
    });
  }

  if (
    !Number.isSafeInteger(price) ||
    price < 0 ||
    price > 10000000
  ) {
    return res.status(400).json({
      error: "Մուտքագրեք ճիշտ գին։"
    });
  }

  const services = getServices();

  const newService = {
    id: crypto.randomUUID(),
    name,
    price,
    description: description.slice(0, 500),
    active: true
  };

  services.push(newService);
  saveServices(services);

  res.json({
    ok: true,
    service: newService
  });
});

// UPDATE SERVICE

app.put("/api/admin/services/:id", requireAdmin, (req, res) => {
  const services = getServices();

  const index = services.findIndex(
    service => service.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Ծառայությունը չի գտնվել։"
    });
  }

  const oldService = services[index];

  const name = req.body?.name !== undefined
    ? String(req.body.name).trim()
    : oldService.name;

  const description = req.body?.description !== undefined
    ? String(req.body.description).trim()
    : oldService.description;

  const price = req.body?.price !== undefined
    ? req.body.price
    : oldService.price;

  const active = req.body?.active !== undefined
    ? req.body.active
    : oldService.active;

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({
      error: "Սխալ ծառայության անուն։"
    });
  }

  if (
    price !== null &&
    (!Number.isSafeInteger(price) ||
      price < 0 ||
      price > 10000000)
  ) {
    return res.status(400).json({
      error: "Սխալ գին։"
    });
  }

  if (typeof active !== "boolean") {
    return res.status(400).json({
      error: "Սխալ կարգավիճակ։"
    });
  }

  services[index] = {
    ...oldService,
    name,
    price,
    description: description.slice(0, 500),
    active
  };

  saveServices(services);

  res.json({
    ok: true,
    service: services[index]
  });
});

// DELETE SERVICE

app.delete("/api/admin/services/:id", requireAdmin, (req, res) => {
  const services = getServices();

  const filtered = services.filter(
    service => service.id !== req.params.id
  );

  if (filtered.length === services.length) {
    return res.status(404).json({
      error: "Ծառայությունը չի գտնվել։"
    });
  }

  saveServices(filtered);

  res.json({ ok: true });
});

// -------------------------
// ADMIN BOOKINGS
// -------------------------

app.get("/api/admin/bookings", requireAdmin, (req, res) => {
  const bookings = getBookings();

  bookings.sort((a, b) => {
    return `${a.date} ${a.time}`.localeCompare(
      `${b.date} ${b.time}`
    );
  });

  res.json({ bookings });
});

app.delete("/api/admin/bookings/:id", requireAdmin, (req, res) => {
  const bookings = getBookings();

  const filtered = bookings.filter(
    booking => booking.id !== req.params.id
  );

  if (filtered.length === bookings.length) {
    return res.status(404).json({
      error: "Գրանցումը չի գտնվել։"
    });
  }

  writeJson(BOOKINGS_FILE, filtered);

  res.json({ ok: true });
});

// -------------------------
// ADMIN BLOCKS
// -------------------------

app.get("/api/admin/blocks", requireAdmin, (req, res) => {
  res.json({ blocks: getBlocks() });
});

app.post("/api/admin/blocks", requireAdmin, (req, res) => {
  const date = String(req.body?.date || "");
  const time = String(req.body?.time || "");

  if (!validDate(date)) {
    return res.status(400).json({
      error: "Սխալ ամսաթիվ։"
    });
  }

  if (time !== "*" && !SLOTS.includes(time)) {
    return res.status(400).json({
      error: "Սխալ ժամ։"
    });
  }

  const bookings = getBookings();

  if (time === "*") {
    if (bookings.some(booking => booking.date === date)) {
      return res.status(409).json({
        error: "Այս օրը արդեն գրանցումներ կան։ Նախ չեղարկեք դրանք։"
      });
    }

    if (isBlocked(date, "*")) {
      return res.status(409).json({
        error: "Օրն արդեն փակ է։"
      });
    }
  } else if (isUnavailable(date, time)) {
    return res.status(409).json({
      error: "Այս ժամը արդեն զբաղված կամ փակ է։"
    });
  }

  const blocks = getBlocks();

  blocks.push({
    id: crypto.randomUUID(),
    date,
    time,
    createdAt: new Date().toISOString()
  });

  writeJson(BLOCKS_FILE, blocks);

  res.json({ ok: true });
});

app.delete("/api/admin/blocks/:id", requireAdmin, (req, res) => {
  const blocks = getBlocks();

  const filtered = blocks.filter(
    block => block.id !== req.params.id
  );

  if (filtered.length === blocks.length) {
    return res.status(404).json({
      error: "Փակումը չի գտնվել։"
    });
  }

  writeJson(BLOCKS_FILE, filtered);

  res.json({ ok: true });
});

// -------------------------
// START SERVER
// -------------------------

// Create services.json on first start
if (!fs.existsSync(SERVICES_FILE)) {
  saveServices(DEFAULT_SERVICES);
}

app.listen(PORT, () => {
  console.log(`NAIL ART LIANA running on port ${PORT}`);
});
