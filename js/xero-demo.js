/**
 * Demo Xero workflow — replace with server-side OAuth2 + Accounting API calls.
 */
(function (global) {
  const DEMO_XERO_CONTACTS = [
    {
      xeroContactId: "demo-xero-001",
      name: "Jane Grower",
      email: "jane@example.com",
      phone: "+44 7700 900123",
    },
    {
      xeroContactId: "demo-xero-002",
      name: "Allotment Society",
      email: "orders@allotment.demo",
      phone: "+44 20 7946 0958",
    },
  ];

  let demoIdCounter = 100;

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function findContactByEmail(email) {
    const e = normalizeEmail(email);
    return DEMO_XERO_CONTACTS.find((c) => normalizeEmail(c.email) === e) || null;
  }

  function createContact({ name, email, phone }) {
    const id = `demo-xero-${++demoIdCounter}`;
    const contact = {
      xeroContactId: id,
      name: name.trim(),
      email: normalizeEmail(email),
      phone: (phone || "").trim(),
    };
    DEMO_XERO_CONTACTS.push(contact);
    return contact;
  }

  function createQuoteInXero({
    contact,
    lineItems,
    totals,
    customerMessage,
  }) {
    const quoteNumber = `WG-DEMO-${Date.now().toString(36).toUpperCase()}`;
    return {
      quoteId: `demo-quote-${quoteNumber}`,
      quoteNumber,
      status: "DRAFT",
      contactId: contact.xeroContactId,
      date: new Date().toISOString().slice(0, 10),
      currencyCode: "GBP",
      lineItems: lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitAmount: li.unitAmountExVat,
        lineAmount: li.lineAmountExVat,
      })),
      subTotal: totals.exVat,
      totalTax: totals.vat,
      total: totals.incVat,
      title: "Greenhouse glass — web enquiry",
      summary: customerMessage,
    };
  }

  function emailQuoteToCustomer({ toEmail, quoteNumber, pdfUrl }) {
    return {
      sent: true,
      to: toEmail,
      quoteNumber,
      pdfUrl: pdfUrl || "(Xero generates PDF on send)",
      loggedAt: new Date().toISOString(),
    };
  }

  function processEnquiryDemo({
    name,
    email,
    phone,
    lineItemsForQuote,
    totals,
    customerMessage,
  }) {
    let contact = findContactByEmail(email);
    let contactAction = "existing";

    if (!contact) {
      contact = createContact({ name, email, phone });
      contactAction = "created";
    }

    const quote = createQuoteInXero({
      contact,
      lineItems: lineItemsForQuote,
      totals,
      customerMessage,
    });

    const emailResult = emailQuoteToCustomer({
      toEmail: contact.email,
      quoteNumber: quote.quoteNumber,
    });

    return {
      contactAction,
      contact,
      quote,
      emailResult,
    };
  }

  global.WealdXeroDemo = {
    DEMO_XERO_CONTACTS,
    findContactByEmail,
    createContact,
    processEnquiryDemo,
  };
})(typeof window !== "undefined" ? window : globalThis);
