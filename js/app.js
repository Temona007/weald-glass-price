(function () {
  const P = window.WealdPricing;
  const X = window.WealdXeroDemo;

  const lineItemsEl = document.getElementById("line-items");
  const addLineBtn = document.getElementById("add-line");
  const form = document.getElementById("quote-form");
  const template = document.getElementById("line-item-template");
  const toastRegion = document.getElementById("toast-region");

  const totalSubEl = document.getElementById("total-sub");
  const totalVatEl = document.getElementById("total-vat");
  const totalIncEl = document.getElementById("total-inc");

  let lineCounter = 0;

  function uid() {
    return `line-${++lineCounter}`;
  }

  function formatMoney(n) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(n);
  }

  function fillPresetSelect(select) {
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a size…";
    select.appendChild(placeholder);
    P.STANDARD_PRESETS.forEach((preset) => {
      const opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = preset.label;
      opt.dataset.width = String(preset.widthMm);
      opt.dataset.height = String(preset.heightMm);
      select.appendChild(opt);
    });
  }

  function getLineDimensions(card) {
    const mode = card.querySelector(".input-size-mode:checked")?.value || "standard";
    if (mode === "standard") {
      const sel = card.querySelector(".input-standard-preset");
      const opt = sel?.selectedOptions?.[0];
      if (!opt || !opt.value) return null;
      return {
        widthMm: Number(opt.dataset.width),
        heightMm: Number(opt.dataset.height),
        isStandardPreset: true,
      };
    }
    const w = Number(card.querySelector(".input-width")?.value);
    const h = Number(card.querySelector(".input-height")?.value);
    if (!w || !h) return null;
    return { widthMm: w, heightMm: h, isStandardPreset: false };
  }

  function updateLinePricing(card) {
    const glass = card.querySelector(".input-glass-type")?.value;
    const qty = Number(card.querySelector(".input-qty")?.value) || 0;
    const fileInput = card.querySelector(".input-shape-file");
    const hasShapeFile = fileInput?.files?.length > 0;

    const dims = getLineDimensions(card);
    const priceEl = card.querySelector(".line-price__value");
    const breakdownEl = card.querySelector(".line-breakdown");

    if (!glass || !dims || qty < 1) {
      if (priceEl) priceEl.textContent = formatMoney(0);
      if (breakdownEl) breakdownEl.textContent = "";
      return { exVat: 0 };
    }

    const { exVat, breakdown } = P.priceLine({
      glassKey: glass,
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      quantity: qty,
      isStandardPreset: dims.isStandardPreset,
      hasShapeFile,
    });

    if (priceEl) priceEl.textContent = formatMoney(exVat);
    if (breakdownEl) breakdownEl.innerHTML = breakdown.join("<br />");

    return { exVat };
  }

  function wireLineCard(card) {
    const id = uid();
    card.dataset.lineId = id;

    const radios = card.querySelectorAll(".input-size-mode");
    const nameBase = `size-mode-${id}`;
    radios.forEach((r) => {
      r.name = nameBase;
    });

    const presetSelect = card.querySelector(".input-standard-preset");
    fillPresetSelect(presetSelect);

    const standardBlock = card.querySelector(".size-block--standard");
    const customBlock = card.querySelector(".size-block--custom");

    function syncSizeMode() {
      const mode = card.querySelector(".input-size-mode:checked")?.value;
      if (mode === "custom") {
        standardBlock.classList.add("is-hidden");
        customBlock.classList.remove("is-hidden");
        card.querySelector(".input-width")?.setAttribute("required", "");
        card.querySelector(".input-height")?.setAttribute("required", "");
        presetSelect.removeAttribute("required");
      } else {
        standardBlock.classList.remove("is-hidden");
        customBlock.classList.add("is-hidden");
        card.querySelector(".input-width")?.removeAttribute("required");
        card.querySelector(".input-height")?.removeAttribute("required");
        presetSelect.setAttribute("required", "");
      }
      updateLinePricing(card);
      updateTotals();
    }

    radios.forEach((r) => r.addEventListener("change", syncSizeMode));
    presetSelect.addEventListener("change", () => {
      updateLinePricing(card);
      updateTotals();
    });

    [".input-glass-type", ".input-width", ".input-height", ".input-qty"].forEach(
      (sel) => {
        card.querySelector(sel)?.addEventListener("input", () => {
          updateLinePricing(card);
          updateTotals();
        });
      }
    );

    card.querySelector(".input-shape-file")?.addEventListener("change", () => {
      updateLinePricing(card);
      updateTotals();
    });

    card.querySelector(".btn--remove")?.addEventListener("click", () => {
      if (lineItemsEl.querySelectorAll(".line-card").length <= 1) {
        showToast("Keep at least one panel line.", "info");
        return;
      }
      card.classList.add("line-card--exit");
      setTimeout(() => {
        card.remove();
        renumberLines();
        updateTotals();
      }, 180);
    });

    syncSizeMode();
    card.classList.add("line-card--enter");
  }

  function renumberLines() {
    lineItemsEl.querySelectorAll(".line-card").forEach((lineCard, i) => {
      const idx = lineCard.querySelector(".line-card__index");
      if (idx) idx.textContent = String(i + 1);
    });
  }

  function addLine() {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".line-card");
    lineItemsEl.appendChild(card);
    wireLineCard(card);
    renumberLines();
  }

  function collectLines() {
    const cards = [...lineItemsEl.querySelectorAll(".line-card")];
    const lines = [];
    let exVatTotal = 0;

    cards.forEach((card, index) => {
      const glass = card.querySelector(".input-glass-type")?.value;
      const qty = Number(card.querySelector(".input-qty")?.value) || 0;
      const dims = getLineDimensions(card);
      const hasShapeFile = card.querySelector(".input-shape-file")?.files?.length > 0;

      if (!glass || !dims || qty < 1) return;

      const { exVat, breakdown } = P.priceLine({
        glassKey: glass,
        widthMm: dims.widthMm,
        heightMm: dims.heightMm,
        quantity: qty,
        isStandardPreset: dims.isStandardPreset,
        hasShapeFile,
      });

      exVatTotal += exVat;

      const label = P.GLASS_RULES[glass]?.label || glass;
      const sizeLabel = dims.isStandardPreset
        ? `${dims.widthMm}×${dims.heightMm} mm (preset)`
        : `${dims.widthMm}×${dims.heightMm} mm`;

      lines.push({
        index: index + 1,
        glass,
        label,
        sizeLabel,
        quantity: qty,
        exVat,
        breakdown,
        hasShapeFile,
      });
    });

    return { lines, exVatTotal: P.roundMoney(exVatTotal) };
  }

  function updateTotals() {
    const { exVatTotal } = collectLines();
    const t = P.withVat(exVatTotal);
    totalSubEl.textContent = formatMoney(t.exVat);
    totalVatEl.textContent = formatMoney(t.vat);
    totalIncEl.textContent = formatMoney(t.incVat);
  }

  function showToast(message, type) {
    const t = type || "success";
    const el = document.createElement("div");
    el.className = `toast toast--${t}`;
    el.textContent = message;
    toastRegion.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "opacity 0.25s, transform 0.25s";
      setTimeout(() => el.remove(), 280);
    }, 5200);
  }

  function showResultModal(payload) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "demo-modal-title");

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML =
      '<h2 id="demo-modal-title">Enquiry received (demo)</h2>' +
      '<p style="margin:0 0 0.75rem;color:var(--text-muted);font-size:0.95rem;">' +
      "In production, your server would call Xero with OAuth2. This MVP simulates contact lookup, quote creation, and email." +
      "</p>" +
      "<pre>" +
      escapeHtml(JSON.stringify(payload, null, 2)) +
      "</pre>" +
      '<button type="button" class="btn btn--primary" id="modal-close">Close</button>';
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function close() {
      backdrop.remove();
    }
    modal.querySelector("#modal-close").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildQuoteLineItems(lines) {
    return lines.map((li) => ({
      description:
        li.label +
        " — " +
        li.sizeLabel +
        (li.hasShapeFile ? " (+ shaped template)" : ""),
      quantity: li.quantity,
      unitAmountExVat: P.roundMoney(li.exVat / li.quantity),
      lineAmountExVat: li.exVat,
    }));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("customerName").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();

    if (!name || !email || !phone) {
      showToast("Please enter your name, email, and phone.", "info");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      showToast("Please enter a valid email address.", "info");
      return;
    }

    const { lines, exVatTotal } = collectLines();
    if (lines.length === 0) {
      showToast("Add at least one complete glass line (type, size, quantity).", "info");
      return;
    }

    const totals = P.withVat(exVatTotal);
    const customerMessage = [
      `Web quote enquiry — ${lines.length} line(s).`,
      ...lines.map(
        (l) =>
          `#${l.index} ${l.label} ${l.sizeLabel} ×${l.quantity} → £${l.exVat.toFixed(2)} ex VAT`
      ),
    ].join("\n");

    const quoteLines = buildQuoteLineItems(lines);

    const result = X.processEnquiryDemo({
      name,
      email,
      phone,
      lineItemsForQuote: quoteLines,
      totals,
      customerMessage,
    });

    showToast(
      `Demo: ${
        result.contactAction === "created"
          ? "New Xero contact created"
          : "Matched existing Xero contact"
      }. Quote ${result.quote.quoteNumber} — email logged.`
    );
    showResultModal({
      customer: { name, email, phone },
      xero: result,
      pricing: totals,
      lines,
    });

    form.reset();
    lineItemsEl.innerHTML = "";
    addLine();
    updateTotals();
  });

  addLineBtn.addEventListener("click", () => addLine());

  addLine();
})();
