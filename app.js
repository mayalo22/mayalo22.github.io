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

function renderDirectShop(books, directSales) {
  document.querySelector("#direct-shop-books").innerHTML = books.map(book => `
    <button class="direct-shop-book" type="button" data-direct-shop-book="${book.id}" aria-label="הזמנת ${book.title} ישירות מהסופרת">
      <img src="${book.cover}" alt="עטיפת ${book.title}" loading="lazy">
      <span><strong>${book.title}</strong><small>${directSales.price} ₪</small></span>
    </button>`).join("");
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 0xffffffff);
  return `MG-${date}-${values[0].toString(36).slice(0, 5).toUpperCase().padStart(5, "0")}`;
}

function connectDirectOrders(directSales, books) {
  const dialog = document.querySelector("#direct-order-dialog");
  const form = document.querySelector("#direct-order-form");
  const payment = document.querySelector("#order-payment");
  const options = document.querySelector("#order-book-options");
  const status = document.querySelector("#order-form-status");
  const submitButton = form.querySelector(".order-submit");
  const booksById = new Map(books.map(book => [book.id, book]));

  options.innerHTML = books.map(book => `
    <label class="order-book-option">
      <input type="checkbox" name="orderedBooks" value="${book.id}">
      <img src="${book.cover}" alt="" loading="lazy">
      <span><strong>${book.title}</strong><small>${directSales.price} ₪</small></span>
    </label>`).join("");

  const selectedBooks = () => [...form.querySelectorAll('input[name="orderedBooks"]:checked')]
    .map(input => booksById.get(input.value))
    .filter(Boolean);

  const updateSummary = () => {
    const selected = selectedBooks();
    const booksTotal = selected.length * directSales.price;
    const shipping = selected.length ? directSales.shipping : 0;
    document.querySelector("#order-selection-text").textContent = selected.length
      ? selected.map(book => book.title).join(" · ")
      : "יש לבחור לפחות ספר אחד";
    document.querySelector("#order-price-breakdown").textContent = selected.length
      ? `${selected.length} ספרים: ${booksTotal} ₪ · משלוח אחד: ${shipping} ₪`
      : "";
    document.querySelector("#order-total").textContent = selected.length ? `סה״כ: ${booksTotal + shipping} ₪` : "";
  };

  const openOrder = selectedIds => {
    form.reset();
    form.querySelectorAll('input[name="orderedBooks"]').forEach(input => {
      input.checked = selectedIds.includes(input.value);
    });
    status.textContent = "";
    submitButton.disabled = false;
    submitButton.textContent = "אישור ההזמנה וקבלת מספר הזמנה";
    form.hidden = false;
    payment.hidden = true;
    updateSummary();
    dialog.showModal();
  };

  document.querySelectorAll("[data-direct-order]").forEach(trigger => trigger.addEventListener("click", event => {
    event.preventDefault();
    openOrder([trigger.dataset.bookId]);
  }));
  document.querySelectorAll("[data-direct-shop-book]").forEach(trigger => trigger.addEventListener("click", () => openOrder([trigger.dataset.directShopBook])));
  document.querySelector("[data-open-direct-shop]").addEventListener("click", () => openOrder(books.map(book => book.id)));
  options.addEventListener("change", updateSummary);

  document.querySelector("[data-close-order]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelector("#order-bit").href = directSales.bitUrl;
  document.querySelector("#order-bit-qr").src = directSales.bitQr;
  document.querySelector("#order-paybox").href = directSales.payboxUrl;
  document.querySelector("#order-paybox-qr").src = directSales.payboxQr;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (form.elements.website.value) return;
    const selected = selectedBooks();
    if (!selected.length) {
      status.textContent = "יש לבחור לפחות ספר אחד.";
      form.querySelector('input[name="orderedBooks"]')?.focus();
      return;
    }
    const fields = new FormData(form);
    const booksTotal = selected.length * directSales.price;
    const total = booksTotal + directSales.shipping;
    const orderNumber = createOrderNumber();
    const bookTitles = selected.map(book => book.title).join(", ");
    const message = [
      `היי מעיין, ההזמנה שלי היא ${orderNumber}`,
      `ספרים: ${bookTitles}`,
      `סה״כ: ${total} ₪`
    ].join("\n");

    submitButton.disabled = true;
    submitButton.textContent = "שולחת את ההזמנה…";
    status.textContent = "";

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${directSales.orderEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `הזמנה חדשה מהאתר — ${orderNumber}`,
          _template: "table",
          _captcha: "false",
          _url: "https://mayalo22.github.io/#direct-shop",
          "מספר הזמנה": orderNumber,
          "ספרים": bookTitles,
          "כמות ספרים": selected.length,
          "מחיר ספרים": `${booksTotal} ₪`,
          "משלוח": `${directSales.shipping} ₪`,
          "סה״כ לתשלום": `${total} ₪`,
          "שם מלא": fields.get("fullName"),
          "כתובת מלאה": fields.get("address"),
          "טלפון": fields.get("phone")
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.success === "false") throw new Error("order email failed");

      document.querySelector("#order-number").textContent = orderNumber;
      document.querySelector("#payment-total").textContent = `${total} ₪`;
      document.querySelector("#order-whatsapp").href = `https://wa.me/${directSales.whatsappNumber}?text=${encodeURIComponent(message)}`;
      form.hidden = true;
      payment.hidden = false;
    } catch (error) {
      status.textContent = "לא הצלחנו לשלוח את ההזמנה כרגע. בדקו את החיבור ונסו שוב.";
      submitButton.disabled = false;
      submitButton.textContent = "ניסיון נוסף לשליחת ההזמנה";
    }
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
    renderDirectShop(data.books, data.directSales);
    connectTabs();
    connectDirectOrders(data.directSales, data.books);
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
