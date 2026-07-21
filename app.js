const formatLabels = { digital: "דיגיטלי", print: "מודפס", audio: "קולי" };
const formatOrder = ["digital", "print", "audio"];

const money = value => value == null
  ? '<span class="price-value unavailable">לא זמין</span>'
  : `<span class="price-value">${new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 1 }).format(value)}</span>`;

function priceRows(rows, book, format, directSales) {
  const available = rows.filter(item => item.price != null);
  if (format === "print" && directSales) {
    available.unshift({
      store: "רכישה ישירה מהסופרת",
      price: directSales.price,
      comparisonPrice: directSales.price + directSales.shipping,
      note: `בתוספת ${directSales.shipping} ₪ משלוח`,
      direct: true
    });
  }
  const bestPrice = Math.min(...available.map(item => Number(item.comparisonPrice ?? item.price)));
  return available.map(item => {
    const isBest = Number(item.comparisonPrice ?? item.price) === bestPrice;
    const href = item.direct ? "#direct-order" : item.url;
    const directAttributes = item.direct ? ` data-direct-order data-book-id="${book.id}" data-book-title="${book.title}"` : ' target="_blank" rel="noopener"';
    return `
    <a class="price-row${isBest ? " best-offer" : ""}${item.direct ? " direct-offer" : ""}" href="${href}"${directAttributes} aria-label="רכישת הספר ב${item.store} במחיר ${item.price} שקלים${item.note ? `, ${item.note}` : ""}${isBest ? ", ההצעה המשתלמת ביותר" : ""}">
      <span class="store-cell"><span class="store-name">${item.store}</span>${item.note ? `<small>${item.note}</small>` : ""}</span>
      ${money(item.price)}
      <span class="buy-link">${isBest ? '<span class="best-badge">★ המחיר המשתלם ביותר</span>' : ""} ${item.direct ? "להזמנה" : "לרכישה ↗"}</span>
    </a>`;
  }).join("");
}

function renderBook(book, index, directSales) {
  const availableFormats = formatOrder.filter(key => key === "print" && directSales || book.prices[key]?.some(p => p.price != null));
  const initial = availableFormats[0];
  const tabs = availableFormats.map(key => `
    <button class="format-tab ${key === initial ? "active" : ""}" type="button" data-format="${key}" aria-pressed="${key === initial}">${formatLabels[key]}</button>`).join("");
  const panels = availableFormats.map(key => `
    <div class="price-panel" data-panel="${key}" ${key === initial ? "" : "hidden"}>${priceRows(book.prices[key] || [], book, key, directSales)}</div>`).join("");
  const extras = book.extras?.length ? `<div class="book-extra">${book.extras.map(extra => `<a href="${extra.url}" target="_blank" rel="noopener">${extra.label}</a>`).join("")}</div>` : "";
  return `
    <article class="book reveal" id="book-${book.id}">
      <div class="book-cover-wrap" data-number="0${index + 1}"><img src="${book.cover}" alt="עטיפת ${book.title}" loading="lazy"></div>
      <div class="book-meta">
        <p class="book-kicker">${book.kicker}</p>
        <h3>${book.title}</h3>
        <p class="book-description">${book.description}</p>
        <div class="tags">${book.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
        <div class="format-tabs" role="tablist" aria-label="פורמט הספר">${tabs}</div>
        <div class="price-list">${panels}</div>
        ${extras}
      </div>
    </article>`;
}

function renderInstagram(items) {
  const grid = document.querySelector("#instagram-grid");
  if (!items?.length) {
    grid.innerHTML = `<a class="insta-card insta-fallback" href="https://www.instagram.com/maayan_gilad_writing/" target="_blank" rel="noopener"><div class="insta-caption"><p>הפוסטים והסרטונים החדשים מחכים לכן באינסטגרם.</p><span>לצפייה באינסטגרם ↗</span></div></a>`;
    return;
  }
  grid.innerHTML = items.slice(0, 6).map(item => `
    <a class="insta-card" href="${item.url}" target="_blank" rel="noopener" aria-label="פתיחת הפוסט באינסטגרם">
      <span class="insta-media">
        <img src="${item.image}" alt="${item.alt || "פוסט מאינסטגרם של מעיין גלעד"}" loading="lazy" referrerpolicy="no-referrer">
        <span class="insta-type" aria-hidden="true">${item.isVideo ? "▶" : "◎"}</span>
        <span class="insta-image-fallback">לצפייה בפוסט באינסטגרם</span>
      </span>
      <span class="insta-caption"><p>${item.caption || "לצפייה בפוסט באינסטגרם"}</p><span>לצפייה בפוסט ↗</span></span>
    </a>`).join("");

  grid.querySelectorAll("img").forEach(img => img.addEventListener("error", () => {
    img.closest(".insta-media")?.classList.add("image-missing");
  }, { once: true }));
}

function connectTabs() {
  document.querySelectorAll(".book").forEach(book => {
    book.querySelectorAll(".format-tab").forEach(tab => tab.addEventListener("click", () => {
      const format = tab.dataset.format;
      book.querySelectorAll(".format-tab").forEach(button => {
        const active = button === tab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active);
      });
      book.querySelectorAll(".price-panel").forEach(panel => panel.hidden = panel.dataset.panel !== format);
    }));
  });
}

function connectDirectOrders(directSales) {
  const dialog = document.querySelector("#direct-order-dialog");
  const form = document.querySelector("#direct-order-form");
  const payment = document.querySelector("#order-payment");
  let selectedBook = "";

  document.querySelectorAll("[data-direct-order]").forEach(trigger => trigger.addEventListener("click", event => {
    event.preventDefault();
    selectedBook = trigger.dataset.bookTitle;
    document.querySelector("#order-book-title").textContent = selectedBook;
    form.reset();
    form.hidden = false;
    payment.hidden = true;
    dialog.showModal();
  }));

  document.querySelector("[data-close-order]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelector("#order-bit").href = directSales.bitUrl;
  document.querySelector("#order-bit-qr").src = directSales.bitQr;
  document.querySelector("#order-paybox").href = directSales.payboxUrl;
  document.querySelector("#order-paybox-qr").src = directSales.payboxQr;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const fields = new FormData(form);
    const total = directSales.price + directSales.shipping;
    const message = [
      "היי מעיין, אני רוצה להזמין ספר ישירות ממך:",
      `ספר: ${selectedBook}`,
      `שם מלא: ${fields.get("fullName")}`,
      `כתובת מלאה: ${fields.get("address")}`,
      `טלפון: ${fields.get("phone")}`,
      `מחיר הספר: ${directSales.price} ₪`,
      `משלוח: ${directSales.shipping} ₪`,
      `סה״כ: ${total} ₪`
    ].join("\n");
    const whatsappUrl = `https://wa.me/${directSales.whatsappNumber}?text=${encodeURIComponent(message)}`;
    document.querySelector("#order-whatsapp").href = whatsappUrl;
    form.hidden = true;
    payment.hidden = false;
    window.open(whatsappUrl, "_blank", "noopener");
  });
}

function connectReveal() {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
}

async function init() {
  try {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("data unavailable");
    const data = await response.json();
    document.querySelector("#books-list").innerHTML = data.books.map((book, index) => renderBook(book, index, data.directSales)).join("");
    renderInstagram(data.instagram);
    connectTabs();
    connectDirectOrders(data.directSales);
    const date = new Date(data.updatedAt);
    document.querySelector("#price-status").textContent = `המחירים נבדקו לאחרונה ב־${new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeZone: "Asia/Jerusalem" }).format(date)} · המחיר הקובע הוא המחיר באתר החנות בעת הרכישה.`;
  } catch (error) {
    document.querySelector("#books-list").innerHTML = "<p>לא הצלחנו לטעון את המחירים כרגע. אפשר לנסות לרענן את הדף.</p>";
    document.querySelector("#price-status").textContent = "המחירים לא נטענו.";
  }
  document.querySelector("#year").textContent = new Date().getFullYear();
  connectReveal();
}

init();
