
const API_BASE = "https://grancum.onrender.com";

const translations = {
  hy: {
    navManicure: "Մատնահարդարում",
    navPedicure: "Ոտնահարդարում",
    navCourses: "Դասընթացներ",
    register: "Գրանցվել",
    heroTitle: "Բացահայտիր քո <i>տաղանդը</i>",
    heroText: "Սովորիր մատնահարդարման արվեստը և ձեռք բեր նոր մասնագիտական հմտություններ։",
    coursesEyebrow: "OUR COURSES",
    coursesTitle: "Մեր դասընթացները",
    coursesSubtitle: "Ընտրիր քեզ համապատասխան ծրագիրը։",
    loading: "Բեռնվում է...",
    noCourses: "Այս պահին դասընթացներ չկան։",
    choose: "Գրանցվել այս դասընթացին",
    formTitle: "Սկսիր քո <i>նոր ճանապարհը։</i>",
    formText: "Լրացրու հայտը, և մենք կկապվենք քեզ հետ՝ դասընթացի մանրամասները ներկայացնելու համար։",
    backHome: "← Վերադառնալ գլխավոր էջ",
    registerTitle: "Դասընթացի գրանցում",
    nameLabel: "Անուն",
    phoneLabel: "Հեռախոս",
    courseLabel: "Ընտրիր դասընթացը",
    chooseCourse: "Ընտրել դասընթացը",
    submit: "Ուղարկել հայտը",
    sending: "Ուղարկվում է...",
    success: "Հայտը հաջողությամբ ուղարկվեց։ Մենք կկապվենք քեզ հետ։",
    error: "Չհաջողվեց ուղարկել հայտը։ Փորձիր կրկին։",
    fill: "Լրացրու բոլոր դաշտերը։",
    priceContact: "Գինը ճշտել",
    dram: "դր.",
    footer: "Գեղեցկությունը սկսվում է խնամքից։"
  },

  ru: {
    navManicure: "Маникюр",
    navPedicure: "Педикюр",
    navCourses: "Курсы",
    register: "Записаться",
    heroTitle: "Открой свой <i>талант</i>",
    heroText: "Освой искусство маникюра и получи новые профессиональные навыки.",
    coursesEyebrow: "OUR COURSES",
    coursesTitle: "Наши курсы",
    coursesSubtitle: "Выбери подходящую программу.",
    loading: "Загрузка...",
    noCourses: "На данный момент курсов нет.",
    choose: "Записаться на курс",
    formTitle: "Начни свой <i>новый путь.</i>",
    formText: "Оставь заявку, и мы свяжемся с тобой, чтобы рассказать подробности курса.",
    backHome: "← Вернуться на главную",
    registerTitle: "Запись на курс",
    nameLabel: "Имя",
    phoneLabel: "Телефон",
    courseLabel: "Выбери курс",
    chooseCourse: "Выбрать курс",
    submit: "Отправить заявку",
    sending: "Отправка...",
    success: "Заявка успешно отправлена. Мы свяжемся с тобой.",
    error: "Не удалось отправить заявку. Попробуй ещё раз.",
    fill: "Заполни все поля.",
    priceContact: "Уточнить цену",
    dram: "др.",
    footer: "Красота начинается с ухода."
  },

  en: {
    navManicure: "Manicure",
    navPedicure: "Pedicure",
    navCourses: "Courses",
    register: "Register",
    heroTitle: "Discover your <i>talent</i>",
    heroText: "Learn the art of manicure and gain new professional skills.",
    coursesEyebrow: "OUR COURSES",
    coursesTitle: "Our courses",
    coursesSubtitle: "Choose the program that suits you.",
    loading: "Loading...",
    noCourses: "There are currently no courses.",
    choose: "Register for this course",
    formTitle: "Start your <i>new journey.</i>",
    formText: "Submit your details and we will contact you with more information about the course.",
    backHome: "← Back to homepage",
    registerTitle: "Course registration",
    nameLabel: "Name",
    phoneLabel: "Phone",
    courseLabel: "Choose a course",
    chooseCourse: "Choose a course",
    submit: "Send application",
    sending: "Sending...",
    success: "Your application has been sent. We will contact you.",
    error: "Could not send your application. Please try again.",
    fill: "Please complete all fields.",
    priceContact: "Contact for price",
    dram: "AMD",
    footer: "Beauty begins with care."
  }
};

const $ = id => document.getElementById(id);

let lang = "hy";
let courses = [];

function t(key) {
  return translations[lang][key] || translations.hy[key] || key;
}

function getCourseName(course) {
  if (lang === "ru") return course.nameRu || course.name;
  if (lang === "en") return course.nameEn || course.name;
  return course.nameHy || course.name;
}

function getCourseDescription(course) {
  if (lang === "ru") return course.descriptionRu || course.description || "";
  if (lang === "en") return course.descriptionEn || course.description || "";
  return course.descriptionHy || course.description || "";
}

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return t("priceContact");
  }

  return `${Number(price).toLocaleString()} ${t("dram")}`;
}

function renderCourses() {
  const grid = $("coursesGrid");
  const select = $("courseSelect");

  grid.replaceChildren();
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("chooseCourse");
  select.appendChild(placeholder);

  if (!courses.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = t("noCourses");
    grid.appendChild(empty);
    return;
  }

  courses.forEach((course, index) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = getCourseName(course);
    select.appendChild(option);

    const card = document.createElement("article");
    card.className = "course-card";

    const top = document.createElement("div");
    top.className = "course-card-top";

    const number = document.createElement("span");
    number.className = "course-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const flower = document.createElement("span");
    flower.className = "course-flower";
    flower.textContent = "✿";

    top.append(number, flower);

    const content = document.createElement("div");
    content.className = "course-card-content";

    const title = document.createElement("h3");
    title.textContent = getCourseName(course);

    const description = document.createElement("p");
    description.textContent = getCourseDescription(course);

    const price = document.createElement("div");
    price.className = "course-price";
    price.textContent = formatPrice(course.price);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "course-register-button";
    button.textContent = t("choose");

    button.addEventListener("click", () => {
      select.value = course.id;
      $("courseRegistration").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    content.append(title, description, price, button);
    card.append(top, content);
    grid.appendChild(card);
  });
}

async function loadCourses() {
  try {
    const response = await fetch(`${API_BASE}/api/services`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Courses loading failed");
    }

    const allServices = Array.isArray(data) ? data : data.services || [];

    courses = allServices.filter(service =>
      service.category === "courses"
    );

    renderCourses();
  } catch (error) {
    console.error(error);
    courses = [];
    renderCourses();
    $("coursesGrid").textContent = t("error");
  }
}

function setLanguage(next) {
  lang = translations[next] ? next : "hy";
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;

    if (translations[lang][key]) {
      element.innerHTML = translations[lang][key];
    }
  });

  $("courseName").placeholder =
    lang === "hy" ? "Անուն Ազգանուն" :
    lang === "ru" ? "Имя Фамилия" : "Full name";

  $("coursePhone").placeholder = "+374 ...";

  renderCourses();
}

$("language").addEventListener("change", event => {
  setLanguage(event.target.value);
});

$("courseForm").addEventListener("submit", async event => {
  event.preventDefault();

  const name = $("courseName").value.trim();
  const phone = $("coursePhone").value.trim();
  const courseId = $("courseSelect").value;
  const message = $("courseMessage");
  const button = $("courseSubmit");

  if (!name || !phone || !courseId) {
    message.textContent = t("fill");
    message.className = "course-message error";
    return;
  }

  button.disabled = true;
  button.querySelector("span").textContent = t("sending");

  try {
    const response = await fetch(`${API_BASE}/api/course-registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        phone,
        courseId,
        language: lang
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || t("error"));
    }

    $("courseForm").reset();
    message.textContent = t("success");
    message.className = "course-message success";
  } catch (error) {
    message.textContent = error.message || t("error");
    message.className = "course-message error";
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = t("submit");
  }
});

setLanguage("hy");
loadCourses();
