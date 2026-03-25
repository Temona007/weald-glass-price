/**
 * Replace rates with your Apple Numbers / spreadsheet logic.
 * All amounts GBP ex VAT unless noted.
 */
(function (global) {
  const VAT_RATE = 0.2;

  const STANDARD_PRESETS = [
    { id: "s610x610", label: "610 × 610 mm", widthMm: 610, heightMm: 610 },
    { id: "s610x914", label: "610 × 914 mm", widthMm: 610, heightMm: 914 },
    { id: "s610x1220", label: "610 × 1220 mm", widthMm: 610, heightMm: 1220 },
    { id: "s914x1220", label: "914 × 1220 mm", widthMm: 914, heightMm: 1220 },
    { id: "s1220x1220", label: "1220 × 1220 mm", widthMm: 1220, heightMm: 1220 },
  ];

  const GLASS_RULES = {
    float3: {
      label: "3 mm float",
      pricePerM2: 28.5,
      minimumPerPanel: 4.5,
      presetDiscount: 0.98,
      oversizeThresholdMm: 1500,
      oversizeSurchargePerPanel: 6.0,
      largeAreaM2: 1.85,
      largeAreaPremiumPerM2: 4.0,
    },
    tough3: {
      label: "3 mm toughened",
      pricePerM2: 42.0,
      minimumPerPanel: 7.5,
      presetDiscount: 1,
      oversizeThresholdMm: 1500,
      oversizeSurchargePerPanel: 9.0,
      largeAreaM2: 1.85,
      largeAreaPremiumPerM2: 6.5,
    },
    tough4: {
      label: "4 mm toughened",
      pricePerM2: 48.0,
      minimumPerPanel: 9.0,
      presetDiscount: 1,
      oversizeThresholdMm: 1500,
      oversizeSurchargePerPanel: 11.0,
      largeAreaM2: 1.85,
      largeAreaPremiumPerM2: 8.0,
    },
  };

  const SHAPED_HANDLING_FEE = 12.0;

  function areaM2(widthMm, heightMm) {
    return (widthMm * heightMm) / 1_000_000;
  }

  function priceLine({
    glassKey,
    widthMm,
    heightMm,
    quantity,
    isStandardPreset,
    hasShapeFile,
  }) {
    const rules = GLASS_RULES[glassKey];
    if (!rules || !widthMm || !heightMm || quantity < 1) {
      return { exVat: 0, breakdown: ["Incomplete line"] };
    }

    const A = areaM2(widthMm, heightMm);
    const maxEdge = Math.max(widthMm, heightMm);
    const lines = [];

    let baseM2Cost = A * rules.pricePerM2;
    if (isStandardPreset && rules.presetDiscount !== 1) {
      baseM2Cost *= rules.presetDiscount;
      lines.push(
        `Area ${A.toFixed(3)} m² × £${rules.pricePerM2}/m² × ${(rules.presetDiscount * 100).toFixed(0)}% (preset)`
      );
    } else {
      lines.push(`Area ${A.toFixed(3)} m² × £${rules.pricePerM2}/m²`);
    }

    let perPanel = baseM2Cost;
    if (perPanel < rules.minimumPerPanel) {
      lines.push(`Minimum per panel £${rules.minimumPerPanel.toFixed(2)} applied`);
      perPanel = rules.minimumPerPanel;
    }

    if (maxEdge > rules.oversizeThresholdMm) {
      lines.push(
        `Oversize (max edge ${maxEdge} mm > ${rules.oversizeThresholdMm} mm): +£${rules.oversizeSurchargePerPanel.toFixed(2)}/panel`
      );
      perPanel += rules.oversizeSurchargePerPanel;
    }

    if (A > rules.largeAreaM2) {
      const extra = A - rules.largeAreaM2;
      const add = extra * rules.largeAreaPremiumPerM2;
      lines.push(`Large pane (>${rules.largeAreaM2} m²): +£${add.toFixed(2)} (extra area premium)`);
      perPanel += add;
    }

    if (hasShapeFile) {
      lines.push(`Shaped template handling: +£${SHAPED_HANDLING_FEE.toFixed(2)}/line`);
      perPanel += SHAPED_HANDLING_FEE;
    }

    const lineExVat = perPanel * quantity;
    lines.push(`× ${quantity} panel(s) = £${lineExVat.toFixed(2)} ex VAT`);

    return { exVat: roundMoney(lineExVat), breakdown: lines };
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  function withVat(exVat) {
    const vat = roundMoney(exVat * VAT_RATE);
    return {
      exVat: roundMoney(exVat),
      vat,
      incVat: roundMoney(exVat + vat),
    };
  }

  global.WealdPricing = {
    VAT_RATE,
    STANDARD_PRESETS,
    GLASS_RULES,
    SHAPED_HANDLING_FEE,
    priceLine,
    roundMoney,
    withVat,
  };
})(typeof window !== "undefined" ? window : globalThis);
