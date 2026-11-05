
const loginPage = document.getElementById("loginPage");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");

const totalBookings = document.getElementById("totalBookings");
const todayBookings = document.getElementById("todayBookings");
const totalBlocks = document.getElementById("totalBlocks");

const bookingsTable = document.getElementById("bookingsTable");

const blockDate = document.getElementById("blockDate");
const blockTime = document.getElementById("blockTime");
const blockButton = document.getElementById("blockButton");
const blockMessage = document.getElementById("blockMessage");

const blockedList = document.getElementById("blockedList");
const blocksCount = document.getElementById("blocksCount");

// SERVICES
const addServiceForm = document.getElementById("addServiceForm");
const newServiceName = document.getElementById("newServiceName");
const newServicePrice = document.getElementById("newServicePrice");
const newServiceDescription = document.getElementById("newServiceDescription");

const servicesList = document.getElementById("servicesList");
const servicesCount = document.getElementById("servicesCount");
const serviceAddMessage = document.getElementById("serviceAddMessage");
const servicesMessage = document.getElementById("servicesMessage");
const refreshServicesButton = document.getElementById("refreshServicesButton");

// -------------------------
// GENERAL
// -------------------------

function localToday() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

blockDate.min = localToday();

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Սխալ տեղի ունեցավ։");
  }

  return data;
}

function showLogin() {
  loginPage.hidden = false;
  dashboard.hidden = true;
}

function showDashboard() {
  loginPage.hidden = true;
  dashboard.hidden = false;
}

function showMessage(element, text, success = false) {
  if (!element) return;

  element.textContent = text;
  element.style.color = success ? "#287b55" : "#b13f59";
}

function createCell(text) {
  const td = document.createElement("td");
  td.textContent = text || "—";
  return td;
}

function formatDate(date) {
  if (!date) return "—";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatPrice(price) {
  return price === null || price === undefined
    ? "Գինը նշված չէ"
    : `${Number(price).toLocaleString("hy-AM")} ֏`;
}

// -------------------------
// BOOKINGS
// -------------------------

async function loadBookings() {
  const data = await api("/api/admin/bookings");
  const bookings = data.bookings || [];

  totalBookings.textContent = bookings.length;

  todayBookings.textContent = bookings.filter(
    booking => booking.date === localToday()
  ).length;

  bookingsTable.innerHTML = "";

  if (!bookings.length) {
    const row = document.createElement("tr");
    const cell = createCell("Գրանցումներ դեռ չկան։");

    cell.colSpan = 6;
    row.appendChild(cell);
    bookingsTable.appendChild(row);

    return;
  }

  bookings.forEach(booking => {
    const row = document.createElement("tr");

    row.appendChild(createCell(booking.name));
    row.appendChild(createCell(booking.phone));
    row.appendChild(createCell(booking.service));
    row.appendChild(createCell(formatDate(booking.date)));
    row.appendChild(createCell(booking.time));

    const actionCell = document.createElement("td");
    const button = document.createElement("button");

    button.className = "delete-button";
    button.textContent = "Չեղարկել";

    button.addEventListener("click", async () => {
      const confirmed = confirm(
        `${booking.name} — ${formatDate(booking.date)} ${booking.time}\nՉեղարկե՞լ գրանցումը։`
      );

      if (!confirmed) return;

      try {
        await api(
          `/api/admin/bookings/${encodeURIComponent(booking.id)}`,
          { method: "DELETE" }
        );

        await refreshAll();
      } catch (error) {
        alert(error.message);
      }
    });

    actionCell.appendChild(button);
    row.appendChild(actionCell);

    bookingsTable.appendChild(row);
  });
}

// -------------------------
// BLOCKS
// -------------------------

async function loadBlocks() {
  const data = await api("/api/admin/blocks");
  const blocks = data.blocks || [];

  blocksCount.textContent = blocks.length;
  totalBlocks.textContent = blocks.length;

  blockedList.innerHTML = "";

  if (!blocks.length) {
    const empty = document.createElement("p");

    empty.className = "muted";
    empty.textContent = "Փակված ժամեր չկան։";

    blockedList.appendChild(empty);
    return;
  }

  blocks.sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );

  blocks.forEach(block => {
    const item = document.createElement("div");
    item.className = "blocked-item";

    const info = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = formatDate(block.date);

    const subtitle = document.createElement("span");

    subtitle.textContent =
      block.time === "*"
        ? "Ամբողջ օրը փակ է"
        : `${block.time} — փակ է`;

    info.appendChild(title);
    info.appendChild(subtitle);

    const removeButton = document.createElement("button");

    removeButton.className = "delete-button";
    removeButton.textContent = "Բացել";

    removeButton.addEventListener("click", async () => {
      try {
        await api(
          `/api/admin/blocks/${encodeURIComponent(block.id)}`,
          { method: "DELETE" }
        );

        await refreshAll();
      } catch (error) {
        alert(error.message);
      }
    });

    item.appendChild(info);
    item.appendChild(removeButton);

    blockedList.appendChild(item);
  });
}

// -------------------------
// SERVICES
// -------------------------

async function loadServices() {
  const data = await api("/api/admin/services");
  const services = data.services || [];

  servicesCount.textContent = services.length;
  servicesList.innerHTML = "";

  if (!services.length) {
    const empty = document.createElement("p");

    empty.className = "muted";
    empty.textContent = "Ծառայություններ դեռ չկան։";

    servicesList.appendChild(empty);
    return;
  }

  services.forEach(service => {
    const card = document.createElement("div");
    card.className = "service-admin-card";

    // HEADER
    const header = document.createElement("div");
    header.className = "service-admin-header";

    const title = document.createElement("h3");
    title.textContent = service.name;

    const status = document.createElement("span");
    status.className = "service-status";
    status.textContent = service.active ? "Ակտիվ" : "Անջատված";

    status.style.color = service.active ? "#287b55" : "#b13f59";

    header.appendChild(title);
    header.appendChild(status);

    // NAME
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Ծառայության անուն";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = service.name;
    nameInput.maxLength = 100;

    // PRICE
    const priceLabel = document.createElement("label");
    priceLabel.textContent = "Գին (դրամ)";

    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.max = "10000000";
    priceInput.step = "1";
    priceInput.placeholder = "Գին";

    priceInput.value = service.price ?? "";

    // DESCRIPTION
    const descriptionLabel = document.createElement("label");
    descriptionLabel.textContent = "Նկարագրություն";

    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.maxLength = 500;
    descriptionInput.placeholder = "Նկարագրություն";
    descriptionInput.value = service.description || "";

    // ACTIVE CHECKBOX
    const activeLabel = document.createElement("label");
    activeLabel.className = "service-active-label";

    const activeCheckbox = document.createElement("input");
    activeCheckbox.type = "checkbox";
    activeCheckbox.checked = service.active;

    activeLabel.appendChild(activeCheckbox);
    activeLabel.appendChild(
      document.createTextNode(" Ծառայությունը հասանելի է հաճախորդներին")
    );

    // SAVE BUTTON
    const saveButton = document.createElement("button");

    saveButton.type = "button";
    saveButton.className = "primary-button";
    saveButton.textContent = "Պահպանել փոփոխությունները";

    saveButton.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const description = descriptionInput.value.trim();
      const rawPrice = priceInput.value.trim();

      if (name.length < 2 || name.length > 100) {
        alert("Ծառայության անունը պետք է լինի 2-100 նիշ։");
        return;
      }

      const price = rawPrice === "" ? null : Number(rawPrice);

      if (
        price !== null &&
        (!Number.isSafeInteger(price) ||
          price < 0 ||
          price > 10000000)
      ) {
        alert("Մուտքագրիր ճիշտ գին։");
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "Պահպանվում է...";

      try {
        await api(
          `/api/admin/services/${encodeURIComponent(service.id)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name,
              price,
              description,
              active: activeCheckbox.checked
            })
          }
        );

        showMessage(
          servicesMessage,
          "Փոփոխությունները հաջողությամբ պահպանվեցին։",
          true
        );

        await loadServices();

      } catch (error) {
        alert(error.message);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Պահպանել փոփոխությունները";
      }
    });

    // DELETE BUTTON
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Ջնջել ծառայությունը";

    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm(
        `Ջնջե՞լ «${service.name}» ծառայությունը։`
      );

      if (!confirmed) return;

      deleteButton.disabled = true;

      try {
        await api(
          `/api/admin/services/${encodeURIComponent(service.id)}`,
          { method: "DELETE" }
        );

        showMessage(
          servicesMessage,
          "Ծառայությունը ջնջվեց։",
          true
        );

        await loadServices();

      } catch (error) {
        alert(error.message);
        deleteButton.disabled = false;
      }
    });

    card.appendChild(header);

    card.appendChild(nameLabel);
    card.appendChild(nameInput);

    card.appendChild(priceLabel);
    card.appendChild(priceInput);

    card.appendChild(descriptionLabel);
    card.appendChild(descriptionInput);

    card.appendChild(activeLabel);

    const actions = document.createElement("div");
    actions.className = "service-admin-actions";

    actions.appendChild(saveButton);
    actions.appendChild(deleteButton);

    card.appendChild(actions);

    servicesList.appendChild(card);
  });
}

// -------------------------
// ADD SERVICE
// -------------------------

addServiceForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = newServiceName.value.trim();
  const price = Number(newServicePrice.value);
  const description = newServiceDescription.value.trim();

  if (name.length < 2 || name.length > 100) {
    showMessage(
      serviceAddMessage,
      "Ծառայության անունը պետք է լինի 2-100 նիշ։"
    );
    return;
  }

  if (
    !newServicePrice.value.trim() ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    price > 10000000
  ) {
    showMessage(serviceAddMessage, "Մուտքագրիր ճիշտ գին։");
    return;
  }

  const submitButton = addServiceForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;
  submitButton.textContent = "Ավելացվում է...";

  try {
    await api("/api/admin/services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        price,
        description
      })
    });

    addServiceForm.reset();

    showMessage(
      serviceAddMessage,
      "Նոր ծառայությունը հաջողությամբ ավելացվեց։",
      true
    );

    await loadServices();

  } catch (error) {
    showMessage(serviceAddMessage, error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ավելացնել ծառայությունը";
  }
});

// -------------------------
// REFRESH
// -------------------------

async function refreshAll() {
  await Promise.all([
    loadBookings(),
    loadBlocks(),
    loadServices()
  ]);
}

refreshButton.addEventListener("click", async () => {
  try {
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

refreshServicesButton.addEventListener("click", async () => {
  try {
    await loadServices();
    showMessage(servicesMessage, "Ծառայությունները թարմացվեցին։", true);
  } catch (error) {
    showMessage(servicesMessage, error.message);
  }
});

// -------------------------
// LOGIN
// -------------------------

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  showMessage(loginMessage, "Ստուգվում է...");

  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password: passwordInput.value
      })
    });

    passwordInput.value = "";

    showDashboard();

    await refreshAll();

  } catch (error) {
    showMessage(loginMessage, error.message);
  }
});

// -------------------------
// LOGOUT
// -------------------------

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", {
      method: "POST"
    });
  } catch (error) {
    console.error(error);
  }

  showLogin();
});

// -------------------------
// BLOCK TIME
// -------------------------

blockButton.addEventListener("click", async () => {
  const date = blockDate.value;
  const time = blockTime.value;

  if (!date) {
    showMessage(blockMessage, "Նախ ընտրիր ամսաթիվը։");
    return;
  }

  blockButton.disabled = true;

  try {
    await api("/api/admin/blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        date,
        time
      })
    });

    showMessage(
      blockMessage,
      "Ժամը հաջողությամբ փակվեց։",
      true
    );

    await refreshAll();

  } catch (error) {
    showMessage(blockMessage, error.message);
  } finally {
    blockButton.disabled = false;
  }
});

// -------------------------
// SESSION CHECK
// -------------------------

async function checkSession() {
  try {
    await api("/api/admin/me");

    showDashboard();

    await refreshAll();

  } catch {
    showLogin();
  }
}

checkSession();
