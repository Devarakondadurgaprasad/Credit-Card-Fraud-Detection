const transactions = [
  makeTransaction("TXN-1001", 1250, 14, "Grocery", true, false, "old", 0),
  makeTransaction("TXN-1002", 76500, 2, "International Purchase", false, true, "new", 3),
  makeTransaction("TXN-1003", 18999, 21, "Electronics", true, true, "old", 1),
  makeTransaction("TXN-1004", 220000, 3, "Jewellery", false, true, "new", 4),
  makeTransaction("TXN-1005", 700, 9, "Fuel", true, false, "old", 0)
];

const els = {
  form: document.querySelector("#fraudForm"),
  amount: document.querySelector("#amount"),
  hour: document.querySelector("#hour"),
  attempts: document.querySelector("#attempts"),
  category: document.querySelector("#category"),
  locationMatch: document.querySelector("#locationMatch"),
  cardAge: document.querySelector("#cardAge"),
  online: document.querySelector("#online"),
  sampleBtn: document.querySelector("#sampleBtn"),
  filter: document.querySelector("#filter"),
  rows: document.querySelector("#transactionRows"),
  totalTransactions: document.querySelector("#totalTransactions"),
  flaggedCount: document.querySelector("#flaggedCount"),
  averageRisk: document.querySelector("#averageRisk"),
  highRiskAmount: document.querySelector("#highRiskAmount"),
  liveRisk: document.querySelector("#liveRisk"),
  riskScore: document.querySelector("#riskScore"),
  riskLabel: document.querySelector("#riskLabel"),
  reasonList: document.querySelector("#reasonList"),
  chart: document.querySelector("#riskChart"),
  moduleCards: document.querySelectorAll(".module-card")
};

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const transaction = readForm();
  transactions.unshift(transaction);
  updateResult(transaction);
  render();
});

els.sampleBtn.addEventListener("click", () => {
  els.amount.value = 98500;
  els.hour.value = 1;
  els.attempts.value = 3;
  els.category.value = "International Purchase";
  els.locationMatch.value = "no";
  els.cardAge.value = "new";
  els.online.checked = true;
});

els.filter.addEventListener("change", render);

updateResult(transactions[0]);
render();

function readForm() {
  return makeTransaction(
    `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
    Number(els.amount.value),
    Number(els.hour.value),
    els.category.value,
    els.locationMatch.value === "yes",
    els.online.checked,
    els.cardAge.value,
    Number(els.attempts.value)
  );
}

function makeTransaction(id, amount, hour, category, locationMatch, online, cardAge, attempts) {
  const result = scoreTransaction({ amount, hour, category, locationMatch, online, cardAge, attempts });
  return {
    id,
    amount,
    hour,
    category,
    locationMatch,
    online,
    cardAge,
    attempts,
    risk: result.risk,
    reasons: result.reasons
  };
}

function scoreTransaction(transaction) {
  let score = 8;
  const reasons = [];

  if (transaction.amount > 50000) {
    score += 22;
    reasons.push("High transaction amount");
  }

  if (transaction.amount > 150000) {
    score += 16;
    reasons.push("Amount is unusually large");
  }

  if (transaction.hour < 5 || transaction.hour > 23) {
    score += 15;
    reasons.push("Transaction happened at an unusual hour");
  }

  if (!transaction.locationMatch) {
    score += 18;
    reasons.push("Transaction location does not match cardholder city");
  }

  if (transaction.online) {
    score += 9;
    reasons.push("Online transaction has higher fraud exposure");
  }

  if (transaction.cardAge === "new") {
    score += 10;
    reasons.push("New card usage pattern has limited history");
  }

  if (transaction.attempts >= 2) {
    score += transaction.attempts * 7;
    reasons.push("Multiple failed attempts detected");
  }

  if (["Jewellery", "Online Gaming", "International Purchase"].includes(transaction.category)) {
    score += 13;
    reasons.push(`${transaction.category} is treated as a high-risk category`);
  }

  const risk = Math.min(score, 99);
  if (!reasons.length) reasons.push("Normal transaction pattern");
  return { risk, reasons };
}

function updateResult(transaction) {
  const label = transaction.risk >= 70 ? "High fraud risk" : transaction.risk >= 40 ? "Review required" : "Likely safe";
  els.liveRisk.textContent = `${transaction.risk}%`;
  els.riskScore.textContent = `${transaction.risk}%`;
  els.riskLabel.textContent = label;
  els.riskLabel.style.color = transaction.risk >= 70 ? "var(--red)" : transaction.risk >= 40 ? "var(--amber)" : "var(--green)";
  els.reasonList.innerHTML = transaction.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
  updateModules(transaction);
  drawRisk(transaction.risk);
}

function updateModules(transaction) {
  const moduleScores = {
    behavior: Math.min(100, Math.round((transaction.amount / 180000) * 58) + (transaction.cardAge === "new" ? 22 : 8)),
    location: transaction.locationMatch ? 18 : 88,
    velocity: Math.min(100, 18 + transaction.attempts * 22 + (transaction.hour < 5 ? 18 : 0)),
    merchant: ["Jewellery", "Online Gaming", "International Purchase"].includes(transaction.category) ? 86 : transaction.online ? 48 : 24,
    confidence: transaction.risk
  };

  els.moduleCards.forEach((card) => {
    const score = moduleScores[card.dataset.module] || 0;
    card.querySelector("strong").textContent = `${score}%`;
    card.querySelector(".module-bar span").style.width = `${score}%`;
  });
}

function render() {
  const visible = transactions.filter((transaction) => {
    if (els.filter.value === "high") return transaction.risk >= 70;
    if (els.filter.value === "safe") return transaction.risk < 70;
    return true;
  });

  const flagged = transactions.filter((transaction) => transaction.risk >= 70);
  const average = transactions.reduce((sum, transaction) => sum + transaction.risk, 0) / transactions.length;
  const highAmount = flagged.reduce((sum, transaction) => sum + transaction.amount, 0);

  els.totalTransactions.textContent = transactions.length;
  els.flaggedCount.textContent = flagged.length;
  els.averageRisk.textContent = `${Math.round(average)}%`;
  els.highRiskAmount.textContent = money(highAmount);
  els.rows.innerHTML = visible.map(rowHtml).join("");
}

function rowHtml(transaction) {
  const status = transaction.risk >= 70 ? "Fraud alert" : "Safe";
  const statusClass = transaction.risk >= 70 ? "high" : "safe";
  return `
    <tr>
      <td>${transaction.id}</td>
      <td>${escapeHtml(transaction.category)}</td>
      <td>${money(transaction.amount)}</td>
      <td>
        <div class="risk-bar" aria-label="${transaction.risk}% risk">
          <span style="width:${transaction.risk}%"></span>
        </div>
        ${transaction.risk}%
      </td>
      <td><span class="pill ${statusClass}">${status}</span></td>
    </tr>
  `;
}

function drawRisk(risk) {
  const ctx = els.chart.getContext("2d");
  const width = els.chart.width;
  const centerX = width / 2;
  const centerY = 170;
  const radius = 118;
  const start = Math.PI;
  const end = Math.PI * 2;
  const current = start + (risk / 100) * Math.PI;

  ctx.clearRect(0, 0, width, els.chart.height);
  ctx.lineWidth = 22;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, end);
  ctx.strokeStyle = "rgba(237, 245, 255, 0.14)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, current);
  ctx.strokeStyle = risk >= 70 ? "#c83c4d" : risk >= 40 ? "#d88817" : "#0d8f72";
  ctx.stroke();
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
