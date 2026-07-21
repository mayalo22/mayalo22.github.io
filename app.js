const formatLabels = { digital: "דיגיטלי", print: "מודפס", audio: "קולי" };
const formatOrder = ["digital", "print", "audio"];

const money = value => value == null
  ? '<span class="price-value unavailable">לא זמין</span>'
  : `<span class="price-value">${new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 1 }).format(value)}</span>`;

function priceRows(rows) {
  const available = rows.filter(item => item.price != null);
  const bestPrice = Math.min(...available.map(item => Number(item.price)));
  return available.map(item => {
    const isBest = Number(item.price) === bestPrice;
    return `
    <a class="price-row${isBest ? " best-offer" : ""}" href="${item.url}" target="_blank" rel="noopener" aria-label="רכישת הספר ב${item.store} במחיר ${item.price} שקלים${isBest ? ", ההצעה המשתלמת ביותר" : ""}">
      <span class="store-name">${item.store}</span>
      ${money(item.price)}
      <span class="buy-link">${isBest ? '<span class="best-badge">הכי משתלם</span>' : ""} לרכישה ↗</span>
    </a>`;
  }).join("");
}

function renderBook(book, index) {
  const availableFormats = formatOrder.filter(key => book.prices[key]?.some(p => p.price != null));
  const initial = availableFormats[0];
  const tabs = availableFormats.map(key => `
    <button class="format-tab ${key === initial ? "active" : ""}" type="button" data-format="${key}" aria-pressed="${key === initial}">${formatLabels[key]}</button>`).join("");
  const panels = availableFormats.map(key => `
    <div class="price-panel" data-panel="${key}" ${key === initial ? "" : "hidden"}>${priceRows(book.prices[key] || [])}</div>`).join("");
  const extras = book.extras?.length ? `<div class="book-extra">${book.extras.map(extra => `<a href="${extra.url}" target="_blank" rel="noopener">${extra.label}</a>`).join("")}</div>` : "";
  const directPurchase = book.directPurchase ? `
    <div class="direct-purchase">
      <div class="direct-purchase-head">
        <div><span class="direct-label">רכישה ישירה ממעיין</span><strong>עותק מודפס · ${money(book.directPurchase.price)}</strong></div>
        <span class="direct-badge">Bit / PayBox</span>
      </div>
      <p>לתשלום ב־Bit או PayBox למספר:</p>
      <div class="payment-number" dir="ltr">
        <a href="tel:${book.directPurchase.phone}">${book.directPurchase.phoneDisplay}</a>
        <button class="copy-phone" type="button" data-phone="${book.directPurchase.phone}" aria-label="העתקת מספר הטלפון">העתקת המספר</button>
      </div>
      <div class="payment-qrs">
        <a class="payment-qr" href="${book.directPurchase.bitUrl}" target="_blank" rel="noopener" aria-label="תשלום ישיר ב-Bit">
          <img src="${book.directPurchase.bitQr}" alt="קוד QR לתשלום ב-Bit למעיין גלעד" loading="lazy">
          <span><strong>תשלום ב־Bit</strong><small>ללחיצה או לסריקה</small></span>
        </a>
        <a class="payment-qr" href="${book.directPurchase.payboxUrl}" target="_blank" rel="noopener" aria-label="תשלום ישיר ב-PayBox">
          <img src="${book.directPurchase.payboxQr}" alt="קוד QR לתשלום ב-PayBox למעיין גלעד" loading="lazy">
          <span><strong>תשלום ב־PayBox</strong><small>ללחיצה או לסריקה</small></span>
        </a>
      </div>
      <div class="payment-actions">
        <a href="${book.directPurchase.bitUrl}" target="_blank" rel="noopener">קישור ישיר ל־Bit ↗</a>
        <a href="${book.directPurchase.payboxUrl}" target="_blank" rel="noopener">קישור ישיר ל־PayBox ↗</a>
        <a class="whatsapp-confirm" href="${book.directPurchase.whatsapp}" target="_blank" rel="noopener">שליחת אישור בוואטסאפ ↗</a>
      </div>
      <small>לאחר התשלום, שלחו אישור וכתובת למשלוח בוואטסאפ.</small>
    </div>` : "";
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
        ${directPurchase}
      </div>
    </article>`;
}

function renderInstagram(items) {
  const grid = document.querySelector("#instagram-grid");
  if (!items?.length) {
    grid.innerHTML = `<a class="insta-card" href="https://www.instagram.com/maayan_gilad_writing/" target="_blank" rel="noopener"><div class="insta-overlay"><p>הפוסטים והסרטונים החדשים מחכים לכן באינסטגרם ↗</p></div></a>`;
    return;
  }
  grid.innerHTML = items.slice(0, 6).map(item => `
    <a class="insta-card" href="${item.url}" target="_blank" rel="noopener" aria-label="פתיחת הפוסט באינסטגרם">
      <img src="${item.image}" alt="${item.alt || "פוסט מאינסטגרם של מעיין גלעד"}" loading="lazy">
      <span class="insta-type" aria-hidden="true">${item.isVideo ? "▶" : "◎"}</span>
      <div class="insta-overlay"><p>${item.caption || "לצפייה בפוסט באינסטגרם"}</p></div>
    </a>`).join("");
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

function connectPayments() {
  document.querySelectorAll(".copy-phone").forEach(button => button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.phone);
      button.textContent = "המספר הועתק ✓";
    } catch {
      button.textContent = button.dataset.phone;
    }
    window.setTimeout(() => button.textContent = original, 2200);
  }));
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
    document.querySelector("#books-list").innerHTML = data.books.map(renderBook).join("");
    renderInstagram(data.instagram);
    connectTabs();
    connectPayments();
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
