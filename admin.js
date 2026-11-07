const API_BASE = "https://nailartliana-1.onrender.com";

const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Սխալ տեղի ունեցավ։");
  }

  return data;
}

function showMessage(elementId, message, isError = false) {
  const element = $(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = `message ${isError ? "error" : "success"}`;
}

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "—";
  }

  return `${Number(price).toLocaleString("hy-AM")} ֏`;
}

function formatDate(date) {
  if (!date) return "—";

  const parts = String(date).split("-");
  if (parts.length !== 3) return date;

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("hy-AM");
}

function categoryName(category) {
  const names = {
    manicure: "Մատնահարդարում",
    pedicure: "Ոտնահարդարում",
    courses: "Դասընթացներ"
  };

  return names[category] || "Մատնահարդարում";
}

function makeCell(text) {
  const td = document.createElement("td");
  td.textContent = text ?? "—";
  return td;
}

// LOGIN
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = $("password").value.trim();

  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    $("password").value = "";
    showDashboard();
  } catch (error) {
    showMessage("loginMessage", error.message, true);
  }
});

function showDashboard() {
  $("loginPage").hidden = true;
  $("dashboard").hidden = false;
  refreshAll();
}

function showLogin() {
  $("dashboard").hidden = true;
  $("loginPage").hidden = false;
}

// LOGOUT
$("logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } catch (error) {
    console.error(error);
  }

  showLogin();
});

// BOOKINGS
async function loadBookings() {
  const data = await api("/api/admin/bookings");
  const bookings = Array.isArray(data) ? data : data.bookings || [];

  const tbody = $("bookingsTable");
  tbody.replaceChildren();

  $("totalBookings").textContent = bookings.length;

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Yerevan"
  });

  const todayCount = bookings.filter(item => item.date === today).length;
  $("todayBookings").textContent = todayCount;

  if (!bookings.length) {
    const row = document.createElement("tr");
    const cell = makeCell("Գրանցումներ դեռ չկան։");
    cell.colSpan = 6;
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  bookings.sort((a, b) => {
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  });

  bookings.forEach(booking => {
    const row = document.createElement("tr");

    row.appendChild(makeCell(booking.name));
    row.appendChild(makeCell(booking.phone));
    row.appendChild(makeCell(booking.service));
    row.appendChild(makeCell(formatDate(booking.date)));
    row.appendChild(makeCell(booking.time));

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");

    deleteButton.textContent = "Ջնջել";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", async () => {
      if (!confirm("Ջնջե՞լ այս գրանցումը։")) return;

      try {
        await api(`/api/admin/bookings/${encodeURIComponent(booking.id)}`, {
          method: "DELETE"
        });
        await loadBookings();
      } catch (error) {
        alert(error.message);
      }
    });

    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
}

// COURSE REGISTRATIONS
async function loadCourseRegistrations() {
  const data = await api("/api/admin/course-registrations");
  const registrations = Array.isArray(data)
    ? data
    : data.registrations || [];

  const tbody = $("courseRegistrationsTable");
  tbody.replaceChildren();

  $("courseRegistrationsCount").textContent = registrations.length;
  $("totalCourseRegistrations").textContent = registrations.length;

  if (!registrations.length) {
    const row = document.createElement("tr");
    const cell = makeCell("Դասընթացների հայտեր դեռ չկան։");
    cell.colSpan = 6;
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  registrations.forEach(registration => {
    const row = document.createElement("tr");

    row.appendChild(makeCell(registration.name));
    row.appendChild(makeCell(registration.phone));
    row.appendChild(makeCell(registration.course));
    row.appendChild(makeCell(formatPrice(registration.coursePrice)));
    row.appendChild(makeCell(formatDateTime(registration.createdAt)));

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");

    deleteButton.textContent = "Ջնջել";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", async () => {
      if (!confirm("Ջնջե՞լ այս դասընթացի հայտը։")) return;

      try {
        await api(
          `/api/admin/course-registrations/${encodeURIComponent(registration.id)}`,
          { method: "DELETE" }
        );

        await loadCourseRegistrations();
      } catch (error) {
        alert(error.message);
      }
    });

    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
}

// SERVICES
async function loadServices() {
  const data = await api("/api/admin/services");
  const services = Array.isArray(data) ? data : data.services || [];

  const list = $("servicesList");
  list.replaceChildren();

  $("servicesCount").textContent = services.length;

  if (!services.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Ծառայություններ դեռ չկան։";
    list.appendChild(empty);
    return;
  }

  services.forEach(service => {
    const card = document.createElement("div");
    card.className = "service-admin-card";

    const header = document.createElement("div");
    header.className = "service-admin-header";

    const title = document.createElement("h3");
    title.textContent = service.name;

    const category = document.createElement("span");
    category.className = "category-label";
    category.textContent = categoryName(service.category);

    header.append(title, category);

    const fields = document.createElement("div");
    fields.className = "service-edit-fields";

    const categoryField = document.createElement("div");
    const categoryLabel = document.createElement("label");
    categoryLabel.textContent = "Բաժին";

    const categorySelect = document.createElement("select");

    [
      ["manicure", "Մատնահարդարում"],
      ["pedicure", "Ոտնահարդարում"],
      ["courses", "Դասընթացներ"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      categorySelect.appendChild(option);
    });

    categorySelect.value = service.category || "manicure";
    categoryField.append(categoryLabel, categorySelect);

    const nameField = document.createElement("div");
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Անուն";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 100;
    nameInput.value = service.name || "";
    nameField.append(nameLabel, nameInput);

    const priceField = document.createElement("div");
    const priceLabel = document.createElement("label");
    priceLabel.textContent = "Գին (դրամ)";

    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.max = "10000000";
    priceInput.step = "1";
    priceInput.value = service.price ?? "";
    priceField.append(priceLabel, priceInput);

    const descriptionField = document.createElement("div");
    descriptionField.className = "service-description-field";

    const descriptionLabel = document.createElement("label");
    descriptionLabel.textContent = "Նկարագրություն";

    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.maxLength = 500;
    descriptionInput.value = service.description || "";
    descriptionField.append(descriptionLabel, descriptionInput);

    fields.append(
      categoryField,
      nameField,
      priceField,
      descriptionField
    );

    const footer = document.createElement("div");
    footer.className = "service-admin-footer";

    const activeLabel = document.createElement("label");
    activeLabel.className = "service-active-label";

    const activeCheckbox = document.createElement("input");
    activeCheckbox.type = "checkbox";
    activeCheckbox.checked = service.active !== false;

    activeLabel.append(activeCheckbox, document.createTextNode(" Ակտիվ է"));

    const actions = document.createElement("div");
    actions.className = "service-admin-actions";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Պահպանել";
    saveButton.className = "primary-button";

    saveButton.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const priceValue = priceInput.value.trim();
      const description = descriptionInput.value.trim();

      if (!name) {
        alert("Մուտքագրիր ծառայության անունը։");
        return;
      }

      if (
        priceValue === "" ||
        !Number.isInteger(Number(priceValue)) ||
        Number(priceValue) < 0
      ) {
        alert("Մուտքագրիր ճիշտ գին։");
        return;
      }

      try {
        await api(`/api/admin/services/${encodeURIComponent(service.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: categorySelect.value,
            name,
            price: Number(priceValue),
            description,
            active: activeCheckbox.checked
          })
        });

        showMessage("servicesMessage", "Փոփոխությունները պահպանվեցին։");
        await loadServices();
      } catch (error) {
        showMessage("servicesMessage", error.message, true);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Ջնջել";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", async () => {
      if (!confirm(`Ջնջե՞լ «${service.name}» ծառայությունը։`)) return;

      try {
        await api(`/api/admin/services/${encodeURIComponent(service.id)}`, {
          method: "DELETE"
        });

        showMessage("servicesMessage", "Ծառայությունը ջնջվեց։");
        await loadServices();
      } catch (error) {
        showMessage("servicesMessage", error.message, true);
      }
    });

    actions.append(saveButton, deleteButton);
    footer.append(activeLabel, actions);

    card.append(header, fields, footer);
    list.appendChild(card);
  });
}

// ADD SERVICE
$("addServiceForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const category = $("newServiceCategory").value;
  const name = $("newServiceName").value.trim();
  const price = Number($("newServicePrice").value);
  const description = $("newServiceDescription").value.trim();

  if (!name || !Number.isInteger(price) || price < 0) {
    showMessage("serviceAddMessage", "Ստուգիր լրացված տվյալները։", true);
    return;
  }

  try {
    await api("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        name,
        price,
        description
      })
    });

    $("addServiceForm").reset();
    showMessage("serviceAddMessage", "Հաջողությամբ ավելացվեց։");
    await loadServices();
  } catch (error) {
    showMessage("serviceAddMessage", error.message, true);
  }
});

// BLOCKED TIMES
async function loadBlocks() {
  const data = await api("/api/admin/blocks");
  const blocks = Array.isArray(data) ? data : data.blocks || [];

  $("blocksCount").textContent = blocks.length;
  $("totalBlocks").textContent = blocks.length;

  const list = $("blockedList");
  list.replaceChildren();

  if (!blocks.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Փակված ժամեր չկան։";
    list.appendChild(empty);
    return;
  }

  blocks.forEach(block => {
    const item = document.createElement("div");
    item.className = "blocked-item";

    const info = document.createElement("span");
    info.textContent =
      `${formatDate(block.date)} · ${block.time === "*" ? "Ամբողջ օրը" : block.time}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Բացել";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", async () => {
      if (!confirm("Բացե՞լ այս ժամը։")) return;

      try {
        await api(`/api/admin/blocks/${encodeURIComponent(block.id)}`, {
          method: "DELETE"
        });
        await loadBlocks();
      } catch (error) {
        alert(error.message);
      }
    });

    item.append(info, deleteButton);
    list.appendChild(item);
  });
}

// ADD BLOCK
$("blockButton").addEventListener("click", async () => {
  const date = $("blockDate").value;
  const time = $("blockTime").value;

  if (!date) {
    showMessage("blockMessage", "Ընտրիր ամսաթիվը։", true);
    return;
  }

  try {
    await api("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, time })
    });

    showMessage("blockMessage", "Ժամը հաջողությամբ փակվեց։");
    await loadBlocks();
  } catch (error) {
    showMessage("blockMessage", error.message, true);
  }
});

// REFRESH
async function refreshAll() {
  try {
    await Promise.all([
      loadBookings(),
      loadCourseRegistrations(),
      loadServices(),
      loadBlocks()
    ]);
  } catch (error) {
    console.error(error);
    alert("Չհաջողվեց բեռնել տվյալները։ Ստուգիր կապը սերվերի հետ։");
  }
}

$("refreshButton").addEventListener("click", refreshAll);
$("refreshServicesButton").addEventListener("click", loadServices);

// CHECK SESSION
async function checkSession() {
  try {
    const result = await api("/api/admin/me");

    if (result.authenticated) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    showLogin();
  }
}

checkSession();
