// Ausflugsziele – Frontend ohne Build-Schritt und ohne Abhängigkeiten.
// Routing über den URL-Hash (#/…), damit kein Server-Rewrite nötig ist.

"use strict";

// ---------------------------------------------------------------- Hilfsfunktionen

/** Erzeugt ein DOM-Element. Texte werden immer als Textknoten eingefügt (kein innerHTML). */
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (["value", "checked", "disabled", "hidden", "selected"].includes(key)) el[key] = value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Icon-Pfade aus Lucide (https://lucide.dev, ISC-Lizenz)
const ICONS = {
  compass: '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/>',
  plus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
};

function icon(name, className = "") {
  const span = document.createElement("span");
  // Nur feste Konstanten aus ICONS, keine Benutzereingaben.
  span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const svg = span.firstChild;
  svg.setAttribute("class", `icon ${className}`.trim());
  return svg;
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Ruft die PHP-API auf und liefert `data` zurück oder wirft einen ApiError. */
async function api(route, { method = "GET", body, query } = {}) {
  // Arrays werden als key[]=…&key[]=… übertragen, damit PHP sie als Liste erhält.
  const params = new URLSearchParams([
    ["r", route],
    ...Object.entries(query ?? {}).flatMap(([key, value]) => (Array.isArray(value) ? value.map((item) => [`${key}[]`, item]) : [[key, value]])),
  ]);
  const headers = { "X-Requested-With": "fetch" };
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`api.php?${params}`, { method, headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Keine Verbindung zum Server");
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    // Session abgelaufen: zur Anmeldung wechseln (fehlgeschlagene Logins ausgenommen).
    if (response.status === 401 && session.user && route !== "login" && route !== "change-password") {
      session.user = null;
      setTimeout(render);
    }
    throw new ApiError(response.status, result?.error?.message ?? "Unbekannter Fehler");
  }
  return result.data;
}

function go(path) {
  if (location.hash === `#${path}`) render();
  else location.hash = path;
}

/** Bindet ein Formular an einen async-Handler mit Lade- und Fehlerzustand. */
function bindForm(form, handler) {
  const message = h("p", { class: "error", hidden: true, role: "alert" });
  form.append(message);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const label = button?.textContent;
    message.hidden = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Bitte warten …";
    }
    try {
      await handler(new FormData(form));
    } catch (error) {
      message.className = "error";
      message.textContent = error.message;
      message.hidden = false;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  });
  return {
    success(text) {
      message.className = "success";
      message.textContent = text;
      message.hidden = false;
    },
  };
}

let hintCounter = 0;

/** Beschriftetes Eingabefeld; ein optionaler Hinweis wird per aria-describedby mit dem Feld verknüpft. */
function field(label, input, hint) {
  if (!hint) return h("label", { class: "field" }, label, input);
  const id = `field-${++hintCounter}`;
  input.id = id;
  input.setAttribute("aria-describedby", `${id}-hint`);
  return h("div", { class: "field" }, h("label", { for: id }, label), input, h("span", { id: `${id}-hint`, class: "hint" }, hint));
}

function pageHeader(eyebrow, title, action) {
  return h("div", { class: "header" }, h("div", null, h("p", { class: "eyebrow" }, eyebrow), h("h1", null, title)), action);
}

function isSafeUrl(url) {
  return /^https?:\/\//i.test(url ?? "");
}

/** Kurzform der Domain für Link-Buttons, z. B. „openstreetmap.org“. */
function linkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- Komponenten

function destinationCard(destination) {
  return h(
    "a",
    { href: `#/destinations/${encodeURIComponent(destination.id)}`, class: "card destination-card" },
    h(
      "div",
      { class: "top" },
      h(
        "div",
        null,
        h("h3", null, destination.name),
        destination.address ? h("p", { class: "meta" }, icon("pin", "sm"), destination.address) : null,
      ),
      h(
        "div",
        { class: "flags" },
        destination.favorite ? h("span", { title: "Favorit" }, icon("heart", "sm fav")) : icon("heart", "sm"),
        destination.visited ? h("span", { title: "Besucht" }, icon("check", "sm visited")) : null,
      ),
    ),
    h("p", { class: "meta" }, icon("star", "sm star"), `${destination.rating ?? "–"} / 5`),
    destination.tags.length ? h("div", { class: "tags" }, destination.tags.slice(0, 3).map((tag) => h("span", { class: "tag" }, `#${tag.name}`))) : null,
  );
}

function destinationGrid(destinations, emptyText) {
  return h(
    "div",
    { class: "grid" },
    destinations.map(destinationCard),
    destinations.length === 0 ? h("div", { class: "empty" }, emptyText) : null,
  );
}

function destinationForm(destination, tags) {
  const selected = new Set(destination?.tags.map((tag) => tag.id) ?? []);
  const tagList = h("div", { class: "tags" });

  function renderTags() {
    tagList.replaceChildren(
      ...tags.map((tag) =>
        h(
          "label",
          { class: "chip" },
          h("input", {
            type: "checkbox",
            checked: selected.has(tag.id),
            onchange: (event) => (event.target.checked ? selected.add(tag.id) : selected.delete(tag.id)),
          }),
          tag.name,
        ),
      ),
    );
  }
  renderTags();

  const newTag = h("input", { type: "text", placeholder: "Neuer Tag", "aria-label": "Neuer Tag", maxlength: "50" });
  const tagError = h("p", { class: "error", hidden: true });
  async function addTag() {
    tagError.hidden = true;
    try {
      const tag = await api("tags", { method: "POST", body: { name: newTag.value } });
      tags.push(tag);
      tags.sort((a, b) => a.name.localeCompare(b.name, "de"));
      selected.add(tag.id);
      newTag.value = "";
      renderTags();
    } catch (error) {
      tagError.textContent = error.message;
      tagError.hidden = false;
    }
  }
  newTag.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  });

  const form = h(
    "form",
    { class: "card" },
    field("Name", h("input", { type: "text", name: "name", value: destination?.name ?? "", required: true, maxlength: "200" })),
    field("Adresse", h("input", { type: "text", name: "address", value: destination?.address ?? "" })),
    field(
      "Link",
      h("input", { type: "url", name: "googleMapsLink", value: destination?.googleMapsLink ?? "", placeholder: "https://…" }),
      "Wo man mehr erfährt oder den Weg findet – z. B. Google Maps, OpenStreetMap, Komoot oder die Webseite des Ausflugsziels.",
    ),
    field("Beschreibung", h("textarea", { name: "description", value: destination?.description ?? "" })),
    field("Bewertung (1-5)", h("input", { type: "number", name: "rating", min: "1", max: "5", value: destination?.rating ?? "" })),
    h(
      "div",
      { class: "checks" },
      h("label", null, h("input", { type: "checkbox", name: "favorite", checked: destination?.favorite ?? false }), "Favorit"),
      h("label", null, h("input", { type: "checkbox", name: "visited", checked: destination?.visited ?? false }), "Besucht"),
    ),
    field("Notizen", h("textarea", { name: "privateNotes", value: destination?.privateNotes ?? "" })),
    h("div", { class: "field" }, "Tags", tagList, h("div", { class: "row" }, newTag, h("button", { type: "button", class: "btn secondary small", onclick: addTag }, "Tag anlegen")), tagError),
    h("button", { type: "submit", class: "btn" }, "Speichern"),
  );

  bindForm(form, async (data) => {
    const payload = {
      name: data.get("name"),
      address: data.get("address"),
      googleMapsLink: data.get("googleMapsLink"),
      description: data.get("description"),
      rating: data.get("rating") ? Number(data.get("rating")) : null,
      favorite: data.has("favorite"),
      visited: data.has("visited"),
      privateNotes: data.get("privateNotes"),
      tagIds: [...selected],
    };
    const saved = destination
      ? await api(`destinations/${destination.id}`, { method: "PUT", body: payload })
      : await api("destinations", { method: "POST", body: payload });
    go(`/destinations/${saved.id}`);
  });

  return form;
}

// ---------------------------------------------------------------- Seiten

async function dashboardPage() {
  const destinations = await api("destinations");
  return [
    pageHeader("Dashboard", "Deine Ausflugsziele", h("a", { href: "#/new", class: "btn" }, "Neu hinzufügen")),
    destinationGrid(destinations, "Noch keine Ziele gespeichert. Lege dein erstes Ziel an."),
  ];
}

async function newPage() {
  const tags = await api("tags");
  return [pageHeader("Neu hinzufügen", "Neues Ausflugsziel"), destinationForm(null, tags)];
}

async function editPage(id) {
  const [destination, tags] = await Promise.all([api(`destinations/${id}`), api("tags")]);
  return [pageHeader("Bearbeiten", "Ausflugsziel anpassen"), destinationForm(destination, tags)];
}

async function detailPage(id) {
  const destination = await api(`destinations/${id}`);
  const images = h("div", { class: "images" });
  const imageError = h("p", { class: "error", hidden: true, role: "alert" });

  function showError(message) {
    imageError.textContent = message;
    imageError.hidden = false;
  }

  function renderImages() {
    images.replaceChildren(
      ...destination.images.map((image) =>
        h(
          "div",
          { class: "image" },
          h("a", { href: image.url, target: "_blank", rel: "noopener" }, h("img", { src: image.url, alt: "", loading: "lazy" })),
          h(
            "button",
            {
              type: "button",
              class: "btn danger small",
              "aria-label": "Bild löschen",
              onclick: async () => {
                if (!confirm("Bild wirklich löschen?")) return;
                try {
                  await api(`images/${image.id}`, { method: "DELETE" });
                  destination.images = destination.images.filter((entry) => entry.id !== image.id);
                  renderImages();
                } catch (error) {
                  showError(error.message);
                }
              },
            },
            "✕",
          ),
        ),
      ),
    );
  }
  renderImages();

  const upload = h("input", {
    type: "file",
    accept: "image/jpeg,image/png,image/gif,image/webp",
    multiple: true,
    onchange: async () => {
      imageError.hidden = true;
      for (const file of upload.files) {
        const body = new FormData();
        body.append("destinationId", destination.id);
        body.append("file", file);
        try {
          destination.images.push(await api("images", { method: "POST", body }));
          renderImages();
        } catch (error) {
          showError(`${file.name}: ${error.message}`);
        }
      }
      upload.value = "";
    },
  });

  async function remove() {
    if (!confirm(`„${destination.name}“ wirklich löschen?`)) return;
    try {
      await api(`destinations/${destination.id}`, { method: "DELETE" });
      go("/");
    } catch (error) {
      alert(error.message);
    }
  }

  return h(
    "div",
    { class: "card" },
    h("h1", null, destination.name),
    destination.address ? h("p", { class: "meta" }, icon("pin", "sm"), destination.address) : null,
    h(
      "p",
      { class: "meta" },
      icon("star", "sm star"),
      `${destination.rating ?? "–"} / 5`,
      destination.favorite ? [" · ", icon("heart", "sm fav"), "Favorit"] : null,
      destination.visited ? [" · ", icon("check", "sm visited"), "Besucht"] : null,
    ),
    destination.description ? h("p", { class: "pre" }, destination.description) : null,
    destination.tags.length ? h("div", { class: "tags" }, destination.tags.map((tag) => h("span", { class: "tag" }, `#${tag.name}`))) : null,
    destination.privateNotes ? h("div", null, h("p", { class: "eyebrow" }, "Notizen"), h("p", { class: "pre" }, destination.privateNotes)) : null,
    h("div", null, h("p", { class: "eyebrow" }, "Bilder"), images, imageError),
    h("label", { class: "field" }, "Bilder hinzufügen", upload),
    h(
      "div",
      { class: "row" },
      isSafeUrl(destination.googleMapsLink)
        ? h("a", { href: destination.googleMapsLink, target: "_blank", rel: "noreferrer", class: "btn", title: destination.googleMapsLink }, "Link öffnen", h("span", { class: "link-host" }, linkHost(destination.googleMapsLink)))
        : null,
      h("a", { href: `#/destinations/${encodeURIComponent(destination.id)}/edit`, class: "btn secondary" }, "Bearbeiten"),
      h("button", { type: "button", class: "btn danger", onclick: remove }, "Löschen"),
    ),
  );
}

const searchState = { search: "", favorite: "", visited: "", minRating: "", tags: new Set() };

async function searchPage() {
  const tags = await api("tags");
  // Inzwischen gelöschte oder umbenannte Tags aus der gemerkten Auswahl entfernen.
  for (const name of searchState.tags) {
    if (!tags.some((tag) => tag.name === name)) searchState.tags.delete(name);
  }
  const results = h("div");
  let requestId = 0;
  let timer;

  async function update() {
    const current = ++requestId;
    const { search, favorite, visited, minRating } = searchState;
    const query = Object.fromEntries(Object.entries({ search, favorite, visited, minRating }).filter(([, value]) => value !== ""));
    if (searchState.tags.size) query.tag = [...searchState.tags];
    try {
      const destinations = await api("destinations", { query });
      if (current === requestId) results.replaceChildren(destinationGrid(destinations, "Keine passenden Ziele gefunden."));
    } catch (error) {
      if (current === requestId) results.replaceChildren(h("p", { class: "error" }, error.message));
    }
  }

  function select(name, label, options = [["", "Alle"], ["true", "Ja"], ["false", "Nein"]]) {
    return field(
      label,
      h(
        "select",
        { onchange: (event) => { searchState[name] = event.target.value; update(); } },
        options.map(([value, text]) => h("option", { value, selected: searchState[name] === value }, text)),
      ),
    );
  }

  const ratingOptions = [["", "Alle"], ...[1, 2, 3, 4].map((stars) => [String(stars), `ab ${stars} ★`]), ["5", "5 ★"]];

  const tagButtons = h("div", { class: "tags" });
  const clearTags = h("button", {
    type: "button",
    class: "btn secondary small",
    onclick: () => {
      searchState.tags.clear();
      renderTagButtons();
      update();
    },
  }, "Auswahl aufheben");
  function renderTagButtons() {
    tagButtons.replaceChildren(
      ...tags.map((tag) => {
        const active = searchState.tags.has(tag.name);
        return h(
          "button",
          {
            type: "button",
            class: `tag${active ? " active" : ""}`,
            "aria-pressed": String(active),
            onclick: () => {
              if (active) searchState.tags.delete(tag.name);
              else searchState.tags.add(tag.name);
              renderTagButtons();
              update();
            },
          },
          `#${tag.name}`,
        );
      }),
    );
    clearTags.hidden = searchState.tags.size === 0;
  }
  renderTagButtons();

  update();
  return [
    h(
      "div",
      { class: "card" },
      h("h1", null, "Suche und Filter"),
      h("input", {
        type: "search",
        placeholder: "Name, Adresse oder Beschreibung",
        "aria-label": "Suchbegriff",
        value: searchState.search,
        oninput: (event) => {
          searchState.search = event.target.value;
          clearTimeout(timer);
          timer = setTimeout(update, 250);
        },
      }),
      h("div", { class: "grid filters" }, select("favorite", "Favorit"), select("visited", "Besucht"), select("minRating", "Bewertung", ratingOptions)),
      tags.length
        ? h(
            "div",
            { class: "field" },
            h("div", { class: "header" }, h("span", null, "Tags ", h("span", { class: "muted small" }, "(Ziel muss alle ausgewählten haben)")), clearTags),
            tagButtons,
          )
        : null,
    ),
    results,
  ];
}

async function profilePage() {
  const user = session.user;
  const isAdmin = user.role === "ADMIN";
  const tags = await api("tags");
  const users = isAdmin ? await api("users") : [];

  const passwordForm = h(
    "form",
    null,
    field("Aktuelles Passwort", h("input", { type: "password", name: "currentPassword", autocomplete: "current-password", required: true })),
    field("Neues Passwort", h("input", { type: "password", name: "newPassword", autocomplete: "new-password", minlength: "6", required: true })),
    h("button", { type: "submit", class: "btn" }, "Passwort ändern"),
  );
  const passwordStatus = bindForm(passwordForm, async (data) => {
    await api("change-password", { method: "POST", body: Object.fromEntries(data) });
    passwordForm.reset();
    passwordStatus.success("Passwort wurde geändert.");
  });

  const tagError = h("p", { class: "error", hidden: true, role: "alert" });
  async function tagAction(action) {
    tagError.hidden = true;
    try {
      await action();
      render();
    } catch (error) {
      tagError.textContent = error.message;
      tagError.hidden = false;
    }
  }

  const tagSection = h(
    "div",
    { class: "card" },
    h("h2", null, "Tags"),
    tags.length === 0 ? h("p", { class: "muted" }, "Noch keine Tags vorhanden.") : null,
    h(
      "ul",
      { class: "list" },
      tags.map((tag) =>
        h(
          "li",
          null,
          h("span", { class: "tag" }, `#${tag.name}`),
          isAdmin
            ? h(
                "span",
                { class: "row" },
                h("button", {
                  type: "button",
                  class: "btn secondary small",
                  onclick: () => {
                    const name = prompt("Neuer Name für den Tag", tag.name);
                    if (name && name !== tag.name) tagAction(() => api(`tags/${tag.id}`, { method: "PUT", body: { name } }));
                  },
                }, "Umbenennen"),
                h("button", {
                  type: "button",
                  class: "btn danger small",
                  onclick: () => {
                    if (confirm(`Tag „${tag.name}“ löschen? Er wird bei allen Zielen entfernt.`)) {
                      tagAction(() => api(`tags/${tag.id}`, { method: "DELETE" }));
                    }
                  },
                }, "Löschen"),
              )
            : null,
        ),
      ),
    ),
    tagError,
    isAdmin ? null : h("p", { class: "muted small" }, "Neue Tags kannst du beim Bearbeiten eines Ziels anlegen."),
  );

  let userSection = null;
  if (isAdmin) {
    const userForm = h(
      "form",
      null,
      field("Benutzername", h("input", { type: "text", name: "username", autocomplete: "off", minlength: "3", required: true })),
      field("Passwort", h("input", { type: "password", name: "password", autocomplete: "new-password", minlength: "6", required: true })),
      h("label", { class: "chip" }, h("input", { type: "checkbox", name: "admin" }), "Administrator"),
      h("button", { type: "submit", class: "btn" }, "Benutzer anlegen"),
    );
    bindForm(userForm, async (data) => {
      await api("users", {
        method: "POST",
        body: { username: data.get("username"), password: data.get("password"), role: data.has("admin") ? "ADMIN" : "USER" },
      });
      render();
    });
    userSection = h(
      "div",
      { class: "card" },
      h("h2", null, "Benutzer"),
      h("ul", { class: "list" }, users.map((entry) => h("li", null, entry.username, h("span", { class: "muted small" }, entry.role)))),
      userForm,
    );
  }

  return [
    h(
      "div",
      { class: "card" },
      h("p", { class: "eyebrow" }, "Profil"),
      h("h1", null, user.username),
      h("p", { class: "muted" }, `Rolle: ${user.role}`),
      h("div", null, h("button", { type: "button", class: "btn secondary", onclick: logout }, "Abmelden")),
    ),
    h("div", { class: "card" }, h("h2", null, "Passwort ändern"), passwordForm),
    tagSection,
    userSection,
    session.version ? h("p", { class: "muted small" }, `Ausflugsziele ${session.version}`) : null,
  ];
}

async function logout() {
  await api("logout", { method: "POST" }).catch(() => undefined);
  session.user = null;
  go("/login");
}

function credentialsPage({ eyebrow, title, intro, button, route }) {
  const form = h(
    "form",
    { class: "card narrow" },
    h("div", null, h("p", { class: "eyebrow" }, eyebrow), h("h1", null, title)),
    intro ? h("p", { class: "muted small" }, intro) : null,
    field("Benutzername", h("input", { type: "text", name: "username", autocomplete: "username", required: true })),
    field("Passwort", h("input", { type: "password", name: "password", autocomplete: route === "setup" ? "new-password" : "current-password", required: true })),
    h("button", { type: "submit", class: "btn" }, button),
  );
  bindForm(form, async (data) => {
    const result = await api(route, { method: "POST", body: Object.fromEntries(data) });
    session.user = result.user;
    session.needsSetup = false;
    go("/");
  });
  return form;
}

function loginPage() {
  return credentialsPage({ eyebrow: "Anmeldung", title: "Willkommen zurück", button: "Anmelden", route: "login" });
}

function setupPage() {
  return credentialsPage({
    eyebrow: "Einrichtung",
    title: "Admin-Zugang anlegen",
    intro: "Es gibt noch keine Benutzer. Lege jetzt den ersten Zugang an – er erhält Administratorrechte.",
    button: "Einrichten",
    route: "setup",
  });
}

// ---------------------------------------------------------------- Router

const session = { user: null, needsSetup: false, version: null, loaded: false };

const routes = [
  [/^\/$/, "dashboard", dashboardPage],
  [/^\/new$/, "new", newPage],
  [/^\/search$/, "search", searchPage],
  [/^\/profile$/, "profile", profilePage],
  [/^\/destinations\/([^/]+)$/, "dashboard", detailPage],
  [/^\/destinations\/([^/]+)\/edit$/, "dashboard", editPage],
];

let renderId = 0;

async function render() {
  const current = ++renderId;
  const app = document.getElementById("app");
  const nav = document.getElementById("nav");
  const path = location.hash.replace(/^#/, "") || "/";

  if (!session.loaded) {
    try {
      Object.assign(session, await api("me"), { loaded: true });
    } catch (error) {
      app.replaceChildren(h("p", { class: "error" }, `Die App konnte nicht geladen werden: ${error.message}`));
      return;
    }
  }

  let view;
  let active = null;
  if (session.needsSetup) {
    view = setupPage;
  } else if (!session.user) {
    view = loginPage;
  } else if (path === "/login") {
    go("/");
    return;
  } else {
    const match = routes.find(([pattern]) => pattern.test(path));
    if (match) {
      const [pattern, name, page] = match;
      const args = path.match(pattern).slice(1).map(decodeURIComponent);
      view = () => page(...args);
      active = name;
    } else {
      view = () => h("div", { class: "card" }, h("h1", null, "Seite nicht gefunden"), h("a", { href: "#/", class: "btn secondary" }, "Zum Dashboard"));
    }
  }

  nav.hidden = !session.user;
  for (const link of nav.querySelectorAll("a")) {
    link.classList.toggle("active", link.dataset.route === active);
    if (link.dataset.route === active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  app.classList.toggle("centered", !session.user);

  try {
    const content = await view();
    if (current !== renderId) return;
    app.replaceChildren(...[content].flat().filter(Boolean));
    window.scrollTo(0, 0);
  } catch (error) {
    if (current !== renderId) return;
    if (error.status === 401) return; // api() zeigt bereits die Anmeldung
    app.replaceChildren(
      h("div", { class: "card" }, h("h1", null, error.status === 404 ? "Nicht gefunden" : "Fehler"), h("p", { class: "muted" }, error.message), h("a", { href: "#/", class: "btn secondary" }, "Zum Dashboard")),
    );
  }
}

for (const placeholder of document.querySelectorAll("[data-icon]")) {
  placeholder.replaceWith(icon(placeholder.dataset.icon));
}
window.addEventListener("hashchange", render);
render();
