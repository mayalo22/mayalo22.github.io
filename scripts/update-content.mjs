import { readFile, writeFile } from "node:fs/promises";

const dataUrl = new URL("../data.json", import.meta.url);
const data = JSON.parse(await readFile(dataUrl, "utf8"));
const headers = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  "accept-language": "he-IL,he;q=0.9,en;q=0.7"
};

const decode = value => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<!--.*?-->/gs, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ");

async function fetchText(url, extraHeaders = {}) {
  const response = await fetch(encodeURI(url), { headers: { ...headers, ...extraHeaders }, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

const formats = {
  digital: ["ספר דיגיטלי", "דיגיטלי"],
  print: ["ספר מודפס", "מודפס"],
  audio: ["ספר קולי", "קולי"]
};

function segment(text, labels, length = 170) {
  const positions = labels.map(label => text.indexOf(label)).filter(pos => pos >= 0);
  if (!positions.length) return "";
  const start = Math.min(...positions);
  return text.slice(start, start + length);
}

function numbers(value) {
  return [...value.matchAll(/(?:₪\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*(?:₪|ש[״"]?ח))/g)].map(match => Number(match[1] || match[2]));
}

function focusOnProduct(html, title) {
  for (const match of html.matchAll(/<h1\b/gi)) {
    const sample = decode(html.slice(match.index, match.index + 18000));
    if (sample.includes(title)) {
      const index = sample.indexOf(title);
      return sample.slice(index, index + 1800);
    }
  }
  const text = decode(html);
  const index = text.indexOf(title);
  return text.slice(Math.max(0, index), Math.max(0, index) + 1800);
}

function extractPrice(html, title, format, mode) {
  let text = focusOnProduct(html, title);
  if (mode === "evrit") {
    const full = decode(html);
    const marker = full.indexOf("איזה פורמט בא לך?");
    if (marker >= 0) text = full.slice(Math.max(0, marker - 450), marker + 550);
  }
  const section = segment(text, formats[format]);
  if (!section) return null;
  if (mode === "steimatzky") {
    const match = section.match(/מחיר מוצר\s*([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : null;
  }
  const found = numbers(section);
  if (!found.length) return null;
  if (mode === "bbooks") return found.length > 1 ? found[1] : found[0];
  return found[0];
}

const sources = {
  stars: {
    evrit: "https://www.e-vrit.co.il/product/39908/x",
    bbooks: "https://bbooks.co.il/book/כוכבים-רואים-רק-בחושך",
    indiebook: "https://indiebook.co.il/shop/כוכבים-רואים-רק-בחושך",
    steimatzky: "https://www.steimatzky.co.il/012010569",
    booknet: "https://www.booknet.co.il/מוצרים/כוכבים-רואים-רק-בחושך-160100000079"
  },
  never: {
    evrit: "https://www.e-vrit.co.il/product/38170/x",
    bbooks: "https://bbooks.co.il/book/לא-אוותר-לעולם",
    indiebook: "https://indiebook.co.il/shop/לא-אוותר-לעולם",
    steimatzky: "https://www.steimatzky.co.il/012010524",
    booknet: "https://www.booknet.co.il/מוצרים/לא-אוותר-לעולם-160100000073"
  },
  transparent: {
    evrit: "https://www.e-vrit.co.il/product/36953/x",
    direct: "https://dovrati.com/product/ילדה-שקופה"
  }
};

const storeModes = { "עברית": "evrit", "ביבוקס": "bbooks", "אינדיבוק": "indiebook", "סטימצקי": "steimatzky", "צומת ספרים": "booknet" };

for (const book of data.books) {
  const urls = sources[book.id];
  if (!urls) continue;
  const pages = {};
  for (const [key, url] of Object.entries(urls)) {
    try { pages[key] = await fetchText(url); }
    catch (error) { console.warn(`Keeping last value: ${book.id}/${key}: ${error.message}`); }
  }
  for (const format of Object.keys(book.prices)) {
    for (const offer of book.prices[format]) {
      if (offer.price == null) continue;
      const mode = storeModes[offer.store];
      if (!pages[mode]) continue;
      const next = extractPrice(pages[mode], book.title, format, mode);
      if (Number.isFinite(next) && next > 0 && next < 500) offer.price = next;
    }
  }
}

data.updatedAt = new Date().toISOString();
await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Updated ${data.books.length} books at ${data.updatedAt}`);
