require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------
// CORS
// -------------------------

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

allowedOrigins.push("http://localhost:3000");

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "").replace(/\/$/, "");

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

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// FILES / DATABASE
// -------------------------

const BOOKINGS_FILE = path.join(__dirname, "bookings.json");
const BLOCKS_FILE = path.join(__dirname, "blocked-slots.json");
const SERVICES_FILE = path.join(__dirname, "services.json");
const COURSE_REGISTRATIONS_FILE = path.join(
  __dirname,
  "course-registrations.json"
);

const DEFAULT_SERVICES = [
  {
    id: "manicure",
    category: "manicure",
    name: "Մատնահարդարում",
    price: null,
    description: "",
    active: true
  },
  {
    id: "gel",
    category: "manicure",
    name: "Գել լաք",
    price: null,
    description: "",
    active: true
  },
  {
    id: "extension",
    category: "manicure",
    name: "Եղունգների երկարացում",
    price: null,
    description: "",
    active: true
  }
];

const SLOTS = [
  "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00"
];

function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : fallback;
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

function getCourseRegistrations() {
  return readJson(COURSE_REGISTRATIONS_FILE);
}

function saveCourseRegistrations(registrations) {
  writeJson(COURSE_REGISTRATIONS_FILE, registrations);
}

// -------------------------
// VALIDATION / HELPERS
// -------------------------

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

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

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

// -------------------------
// TELEGRAM
// -------------------------

async function sendTelegram(booking) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  const message = [
    "💅 ՆՈՐ ԳՐԱՆՑՈՒՄ — NAIL ART LIANA",
    "",
    `👤 Անուն: ${booking.name}`,
    `📞 Հեռախոս: ${booking.phone}`,
    `💎 Ծառայություն: ${booking.service}`,
    `💰 Գին: ${
      booking.servicePrice === null
        ? "Նշված չէ"
        : booking.servicePrice + " ֏"
    }`,
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
          text: message
        })
      }
    );

    if (!response.ok) {
      console.error("Telegram API error:", await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error("Telegram error:", error.message);
    return false;
  }
}

async function sendCourseTelegram(registration) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  const message = [
    "🎓 ՆՈՐ ԴԱՍԸՆԹԱՑԻ ՀԱՅՏ — NAIL ART LIANA",
    "",
    `👤 Անուն: ${registration.name}`,
    `📞 Հեռախոս: ${registration.phone}`,
    `📚 Դասընթաց: ${registration.course}`,
    `💰 Գին: ${
      registration.coursePrice === null
        ? "Նշված չէ"
        : registration.coursePrice + " ֏"
    }`
  ].join("\n");

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    if (!response.ok) {
      console.error("Telegram course API error:", await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error("Telegram course error:", error.message);
    return false;
  }
}

// -------------------------
// CUSTOMER: SERVICES
// -------------------------

app.get("/api/services", (req, res) => {
  const services = getServices()
    .filter(service => service.active !== false)
    .map(service => ({
      id: service.id,
      category: service.category || "manicure",
      name: service.name,
      price: service.price,
      description: service.description || ""
    }));

  res.json({ services });
});

// -------------------------
// CUSTOMER: SLOTS
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
// CUSTOMER: MANICURE BOOKINGS
// -------------------------

app.post("/api/bookings", async (req, res) => {
  const name = cleanText(req.body?.name, 80);
  const phone = cleanText(req.body?.phone, 30);
  const serviceId = cleanText(req.body?.service, 100);
  const date = String(req.body?.date || "");
  const time = String(req.body?.time || "");
  const language = req.body?.language;

  if (
    name.length < 2 ||
    phone.length < 5 ||
    !serviceId ||
    !validDate(date) ||
    !SLOTS.includes(time)
  ) {
    return res.status(400).json({
      error: "Ստուգեք լրացված տվյալները։"
    });
  }

  const selectedService = getServices().find(
    item => item.id === serviceId && item.active !== false
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
    name,
    phone,
    service: selectedService.name,
    serviceId: selectedService.id,
    servicePrice: selectedService.price ?? null,
    date,
    time,
    language: ["hy", "ru", "en"].includes(language) ? language : "hy",
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
// CUSTOMER: COURSE REGISTRATION
// -------------------------

app.post("/api/course-registrations", async (req, res) => {
  const name = cleanText(req.body?.name, 80);
  const phone = cleanText(req.body?.phone, 30);
  const course = cleanText(
    req.body?.course || req.body?.courseName,
    150
  );

  const rawPrice = req.body?.coursePrice ?? req.body?.price ?? null;
  const coursePrice =
    rawPrice === null || rawPrice === ""
      ? null
      : Number(rawPrice);

  if (
    name.length < 2 ||
    phone.length < 5 ||
    course.length < 2
  ) {
    return res.status(400).json({
      error: "Ստուգեք լրացված տվյալները։"
    });
  }

  if (
    coursePrice !== null &&
    (!Number.isSafeInteger(coursePrice) ||
      coursePrice < 0 ||
      coursePrice > 10000000)
  ) {
    return res.status(400).json({
      error: "Սխալ դասընթացի գին։"
    });
  }

  const registration = {
    id: crypto.randomUUID(),
    name,
    phone,
    course,
    coursePrice,
    language: ["hy", "ru", "en"].includes(req.body?.language)
      ? req.body.language
      : "hy",
    createdAt: new Date().toISOString()
  };

  const registrations = getCourseRegistrations();
  registrations.push(registration);
  saveCourseRegistrations(registrations);

  const telegramSent = await sendCourseTelegram(registration);

  res.json({
    ok: true,
    registrationId: registration.id,
    telegramSent
  });
});

// -------------------------
// ADMIN AUTH / SESSIONS
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
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = sessions.get(token);

  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: "Unauthorized" });
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
}

app.post("/api/admin/login", (req, res) => {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return res.status(503).json({
      error: "Ադմինի գաղտնաբառը կարգավորված չէ Render-ում։"
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

  const secure =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";

  res.setHeader(
    "Set-Cookie",
    `nail_admin=; Path=/; HttpOnly; SameSite=None; Max-Age=0${secure ? "; Secure" : ""}`
  );

  res.json({ ok: true });
});

// -------------------------
// ADMIN: BOOKINGS
// -------------------------

app.get("/api/admin/bookings", requireAdmin, (req, res) => {
  const bookings = getBookings();

  bookings.sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );

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
// ADMIN: COURSE REGISTRATIONS
// -------------------------

app.get(
  "/api/admin/course-registrations",
  requireAdmin,
  (req, res) => {
    const registrations = getCourseRegistrations();

    registrations.sort((a, b) =>
      String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      )
    );

    res.json({ registrations });
  }
);

app.delete(
  "/api/admin/course-registrations/:id",
  requireAdmin,
  (req, res) => {
    const registrations = getCourseRegistrations();
    const filtered = registrations.filter(
      registration => registration.id !== req.params.id
    );

    if (filtered.length === registrations.length) {
      return res.status(404).json({
        error: "Դասընթացի հայտը չի գտնվել։"
      });
    }

    saveCourseRegistrations(filtered);
    res.json({ ok: true });
  }
);

// -------------------------
// ADMIN: SERVICES
// -------------------------

app.get("/api/admin/services", requireAdmin, (req, res) => {
  res.json({ services: getServices() });
});

app.post("/api/admin/services", requireAdmin, (req, res) => {
  const name = cleanText(req.body?.name, 100);
  const description = cleanText(req.body?.description, 500);
  const price = req.body?.price;
  const category = String(req.body?.category || "manicure");

  if (name.length < 2) {
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

  if (!["manicure", "pedicure", "courses"].includes(category)) {
    return res.status(400).json({
      error: "Սխալ բաժին։"
    });
  }

  const services = getServices();

  const newService = {
    id: crypto.randomUUID(),
    category,
    name,
    price,
    description,
    active: true
  };

  services.push(newService);
  saveServices(services);

  res.json({ ok: true, service: newService });
});

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
    ? cleanText(req.body.name, 100)
    : oldService.name;

  const description = req.body?.description !== undefined
    ? cleanText(req.body.description, 500)
    : oldService.description || "";

  const price = req.body?.price !== undefined
    ? req.body.price
    : oldService.price;

  const active = req.body?.active !== undefined
    ? req.body.active
    : oldService.active !== false;

  const category = req.body?.category !== undefined
    ? String(req.body.category)
    : oldService.category || "manicure";

  if (name.length < 2) {
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

  if (!["manicure", "pedicure", "courses"].includes(category)) {
    return res.status(400).json({
      error: "Սխալ բաժին։"
    });
  }

  services[index] = {
    ...oldService,
    category,
    name,
    price,
    description,
    active
  };

  saveServices(services);
  res.json({ ok: true, service: services[index] });
});

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
// ADMIN: BLOCKED SLOTS
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

if (!fs.existsSync(SERVICES_FILE)) {
  saveServices(DEFAULT_SERVICES);
}

// Ensure all JSON database files exist
readJson(BOOKINGS_FILE);
readJson(BLOCKS_FILE);
readJson(COURSE_REGISTRATIONS_FILE);

console.log("SERVER FILE STARTED");

app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER IS RUNNING ON PORT " + PORT);
});
