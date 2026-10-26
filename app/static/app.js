// All money is integer cents; convert to dollars only for display.
const state = {
  items: [],      // [{id, name, price_cents}]
  taxCents: 0,
  names: [],
  claims: {},     // item id -> [names]
};

const $ = (id) => document.getElementById(id);

function formatCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

function subtotalCents() {
  return state.items.reduce((sum, item) => sum + item.price_cents, 0);
}

function tipCents() {
  const pct = parseFloat($("tip-pct").value);
  if (!Number.isFinite(pct) || pct < 0) return null;
  return Math.round((subtotalCents() * pct) / 100);
}

// --- Upload ---

$("upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = $("photo").files[0];
  if (!file) return;
  showError($("upload-error"), "");

  const body = new FormData();
  body.append("file", file);
  try {
    const res = await fetch("/parse", { method: "POST", body });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const receipt = await res.json();
    state.items = receipt.items;
    state.taxCents = receipt.tax_cents;
    state.claims = Object.fromEntries(state.items.map((item) => [item.id, []]));
  } catch (err) {
    showError($("upload-error"), `Couldn't parse receipt: ${err.message}`);
    return;
  }

  $("preview").src = URL.createObjectURL(file);
  for (const id of ["receipt-section", "people-section", "claims-section", "tip-section"]) {
    $(id).hidden = false;
  }
  $("results-section").hidden = true;
  renderReceipt();
  renderClaims();
  renderTip();
});

function renderReceipt() {
  const list = $("item-list");
  list.replaceChildren(
    ...state.items.map((item) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = item.name;
      const price = document.createElement("span");
      price.textContent = formatCents(item.price_cents);
      li.append(name, price);
      return li;
    })
  );
  $("subtotal").textContent = formatCents(subtotalCents());
  $("tax").textContent = formatCents(state.taxCents);
}

// --- People ---

$("person-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("person-name");
  const name = input.value.trim();
  if (!name) return;
  if (state.names.includes(name)) {
    showError($("person-error"), `${name} is already added.`);
    return;
  }
  showError($("person-error"), "");
  state.names.push(name);
  input.value = "";
  input.focus();
  renderPeople();
  renderClaims();
});

function removePerson(name) {
  state.names = state.names.filter((n) => n !== name);
  for (const id in state.claims) {
    state.claims[id] = state.claims[id].filter((n) => n !== name);
  }
  renderPeople();
  renderClaims();
}

function renderPeople() {
  $("people-list").replaceChildren(
    ...state.names.map((name) => {
      const li = document.createElement("li");
      li.append(name);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${name}`);
      remove.addEventListener("click", () => removePerson(name));
      li.append(remove);
      return li;
    })
  );
}

// --- Claims ---

function toggleClaim(itemId, name) {
  const claimers = state.claims[itemId];
  state.claims[itemId] = claimers.includes(name)
    ? claimers.filter((n) => n !== name)
    : [...claimers, name];
  renderClaims();
}

function renderClaims() {
  const container = $("claims");
  if (state.names.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Add people above first.";
    container.replaceChildren(p);
  } else {
    container.replaceChildren(
      ...state.items.map((item) => {
        const div = document.createElement("div");
        div.className = "claim-item";
        if (state.claims[item.id].length === 0) div.classList.add("unclaimed");

        const title = document.createElement("div");
        title.className = "claim-title";
        const name = document.createElement("span");
        name.textContent = item.name;
        const price = document.createElement("span");
        price.textContent = formatCents(item.price_cents);
        title.append(name, price);

        const buttons = document.createElement("div");
        buttons.className = "claim-buttons";
        for (const person of state.names) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = person;
          btn.setAttribute("aria-pressed", String(state.claims[item.id].includes(person)));
          btn.addEventListener("click", () => toggleClaim(item.id, person));
          buttons.append(btn);
        }

        div.append(title, buttons);
        return div;
      })
    );
  }
  $("results-section").hidden = true;
}

// --- Tip & calculate ---

function renderTip() {
  const tip = tipCents();
  $("tip-amount").textContent = tip === null ? "—" : formatCents(tip);
  $("grand-total").textContent =
    tip === null ? "—" : formatCents(subtotalCents() + state.taxCents + tip);
}

$("tip-pct").addEventListener("input", () => {
  renderTip();
  $("results-section").hidden = true;
});

$("calculate").addEventListener("click", async () => {
  showError($("split-error"), "");
  const tip = tipCents();
  if (tip === null) {
    showError($("split-error"), "Enter a valid tip percentage.");
    return;
  }
  if (state.names.length === 0) {
    showError($("split-error"), "Add at least one person.");
    return;
  }
  const unclaimed = state.items.filter((item) => state.claims[item.id].length === 0);
  if (unclaimed.length > 0) {
    showError(
      $("split-error"),
      `Assign someone to: ${unclaimed.map((item) => item.name).join(", ")}`
    );
    return;
  }

  const payload = {
    items: Object.fromEntries(state.items.map((item) => [item.id, item.price_cents])),
    names: state.names,
    claims: state.claims,
    tax_cents: state.taxCents,
    tip_cents: tip,
  };

  let result;
  try {
    const res = await fetch("/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    result = await res.json();
    if (!res.ok) throw new Error(result.detail || `Server returned ${res.status}`);
  } catch (err) {
    showError($("split-error"), `Couldn't split: ${err.message}`);
    return;
  }
  renderResults(result);
});

function renderResults(result) {
  $("results").replaceChildren(
    ...state.names.map((name) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = name;
      const amount = document.createElement("strong");
      amount.textContent = formatCents(result.totals[name] ?? 0);
      li.append(label, amount);
      return li;
    })
  );

  const check = $("check");
  const splitTotal = Object.values(result.totals).reduce((a, b) => a + b, 0);
  const diff = splitTotal - result.receipt_total_cents;
  if (result.matches_receipt) {
    check.className = "ok";
    check.textContent = `✓ Totals add up to ${formatCents(result.receipt_total_cents)}`;
  } else {
    check.className = "mismatch";
    check.textContent =
      `✗ Totals add up to ${formatCents(splitTotal)}, ` +
      `but the receipt total is ${formatCents(result.receipt_total_cents)} ` +
      `(${diff > 0 ? "over" : "short"} by ${formatCents(Math.abs(diff))})`;
  }
  $("results-section").hidden = false;
}
