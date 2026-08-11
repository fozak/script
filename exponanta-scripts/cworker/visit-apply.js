// widgets/visit-apply.js on hub
// widgets/visit-apply.js on hub
(function () {
  if (document.getElementById("_va-slots")) return; // guard against double load

  const cfg = Object.assign(
    {
      mountId: "visit-apply",
      slotCount: 8,
      slotTime: "6:30 PM",
      location: "1 Broadway, 5th Floor, Cambridge MA 02142",
      doctype: "HtmlForm",
      formType: "GuestVisit",
      visitTitle: "Visit as a guest",
      visitDesc:
        "Pick any Thursday. Show up at 6:30 PM. No application, no fee. Come with a one-minute description of what you do and what introduction would help you most.",
      applyTitle: "Apply for membership",
      applyDesc:
        "NESEN is a referral-first community. Before applying, visit as a guest and secure two recommendations from existing members. Members who arrive with recommendations are almost always approved.",
      submitLabel: "Submit application",
      successHtml:
        '<div class="alert alert-success m-3"><i class="ti ti-circle-check me-2"></i><strong>Application submitted!</strong> We will be in touch soon.</div>',
      fields: [
        {
          name: "first_name",
          reqd: 1,
          label: "First name",
          icon: "user",
          type: "text",
          placeholder: "First name",
          col2: 1,
        },
        {
          name: "last_name",
          reqd: 1,
          label: "Last name",
          icon: "user",
          type: "text",
          placeholder: "Last name",
          col2: 1,
        },
        {
          name: "email",
          reqd: 1,
          label: "Email",
          icon: "mail",
          type: "email",
          placeholder: "you@company.com",
          col2: 1,
        },
        {
          name: "phone",
          label: "Phone",
          icon: "phone",
          type: "tel",
          placeholder: "+1 (617) 000-0000",
          col2: 1,
        },
        {
          name: "linkedin_url",
          reqd: 1,
          label: "LinkedIn profile",
          icon: "brand-linkedin",
          type: "url",
          placeholder: "https://linkedin.com/in/yourname",
        },
        {
          name: "recommended_by",
          label: "Recommended by",
          icon: "user-check",
          type: "text",
          placeholder: "Name of NESEN member who recommended you",
          hint: "Two recommendations significantly improve your application.",
        },
        {
          name: "interest",
          reqd: 1,
          label: "I am interested in…",
          type: "textarea",
          rows: 5,
          placeholder:
            "Tell us what brought you to NESEN and what you are hoping to build, find, or contribute here.",
          hint: "Be specific — the more clearly you describe your goals, the easier it is for the community to help you.",
        },
        { name: "visit_date", reqd: 1, label: "Visit date", type: "hidden" },
        {
          name: "terms_accepted",
          reqd: 1,
          label: "Terms accepted",
          type: "checkbox",
          checkLabel:
            'I have read and agree to the <a href="/terms.html">Terms of Use</a> and <a href="/privacy.html">Privacy Policy</a>',
        },
      ],
    },
    window.VisitApplyCfg || {},
  );

  // ── field HTML ───────────────────────────────────────────────
  function fieldHtml(f) {
    const id = "f-" + f.name;
    const req = f.reqd ? " required" : "";
    if (f.type === "hidden") return `<input type="hidden" id="${id}">`;
    if (f.type === "checkbox")
      return `<label class="form-check m-0">
        <input class="form-check-input" type="checkbox" id="${id}">
        <span class="form-check-label">${f.checkLabel}</span>
      </label>`;
    if (f.type === "textarea")
      return `<div class="mb-3">
        <label class="form-label${req}">${f.label}</label>
        <textarea class="form-control" id="${id}" rows="${f.rows || 4}" placeholder="${f.placeholder || ""}"></textarea>
        ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ""}
      </div>`;
    const input = f.icon
      ? `<div class="input-icon">
           <span class="input-icon-addon"><i class="ti ti-${f.icon}"></i></span>
           <input type="${f.type}" class="form-control" id="${id}" placeholder="${f.placeholder || ""}">
         </div>`
      : `<input type="${f.type}" class="form-control" id="${id}" placeholder="${f.placeholder || ""}">`;
    return `<div class="mb-3">
      <label class="form-label${req}">${f.label}</label>
      ${input}
      ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ""}
    </div>`;
  }

  const col2 = cfg.fields.filter((f) => f.col2);
  const full = cfg.fields.filter(
    (f) => !f.col2 && f.type !== "hidden" && f.type !== "checkbox",
  );
  const hidden = cfg.fields.filter((f) => f.type === "hidden");
  const checks = cfg.fields.filter((f) => f.type === "checkbox");

  // ── mount ────────────────────────────────────────────────────
  document.getElementById(cfg.mountId).innerHTML = `
  <section id="visit" class="section">
    <div class="container">
      <div class="row g-xl-6">
        <div class="col-lg-4">
          <div class="section-header text-start sticky-top" style="top:5rem">
            <div class="section-title">${cfg.visitTitle}</div>
            <p class="section-description">${cfg.visitDesc}</p>
            <div class="meeting-ribbon mt-3"><i class="ti ti-map-pin"></i> ${cfg.location}</div>
          </div>
        </div>
        <div class="col-lg">
          <div class="card">
            <div class="card-header"><h3 class="card-title">Choose a Thursday</h3></div>
            <div class="card-body p-0" id="_va-slots"></div>
            <div class="card-footer text-secondary small">
              After selecting a date, fill in your details below.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="apply" class="section section-light">
    <div class="container">
      <div class="row g-xl-6">
        <div class="col-lg-4">
          <div class="section-header text-start sticky-top" style="top:5rem">
            <div class="section-title">${cfg.applyTitle}</div>
            <p class="section-description">${cfg.applyDesc}</p>
            <a href="/visit.html" class="btn btn-outline-primary mt-2">
              <i class="ti ti-calendar me-1"></i>Visit as a guest first
            </a>
          </div>
        </div>
        <div class="col-lg">
          <div class="card">
            <div class="card-header"><h3 class="card-title">Membership application</h3></div>
            <div class="card-body" id="_va-form-body">
              <div id="_va-visit-banner" class="alert alert-info d-none">
                <i class="ti ti-calendar-check me-2"></i><span id="_va-visit-label"></span>
              </div>
              <div id="_va-error" class="alert alert-danger d-none"></div>
              ${hidden.map(fieldHtml).join("")}
              <div class="row row-cols-2 g-4 mb-3">
                ${col2.map((f) => `<div>${fieldHtml(f)}</div>`).join("")}
              </div>
              ${full.map(fieldHtml).join("")}
              <div class="row align-items-center mt-2">
                <div class="col">${checks.map(fieldHtml).join("")}</div>
                <div class="col-auto">
                  <button type="button" class="btn btn-primary" id="_va-submit" disabled>
                    ${cfg.submitLabel} <i class="ti ti-arrow-right icon-end"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  // ── slots ────────────────────────────────────────────────────
  const slotsEl = document.getElementById("_va-slots");
  const now = new Date();
  const diff = (4 - now.getDay() + 7) % 7 || 7;
  for (let i = 0; i < cfg.slotCount; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + diff + i * 7);
    const label = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    slotsEl.insertAdjacentHTML(
      "beforeend",
      `
      <div class="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
        <div class="fw-semibold">${label}</div>
        <button class="btn btn-primary btn-sm" data-va-date="${label}">
          <i class="ti ti-calendar-plus me-1"></i>Register
        </button>
      </div>`,
    );
  }

  slotsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-va-date]");
    if (!btn) return;
    const label = btn.dataset.vaDate;
    document.getElementById("f-visit_date").value = label;
    document.getElementById("_va-visit-label").innerHTML =
      `Visiting on <strong>${label} at ${cfg.slotTime}</strong>`;
    document.getElementById("_va-visit-banner").classList.remove("d-none");
    document.getElementById("apply").scrollIntoView({ behavior: "smooth" });
  });

  // ── terms → enable submit ────────────────────────────────────
  document
    .getElementById("f-terms_accepted")
    .addEventListener("change", function () {
      document.getElementById("_va-submit").disabled = !this.checked;
    });

  // ── submit ───────────────────────────────────────────────────
  document.getElementById("_va-submit").addEventListener("click", async () => {
    const errorEl = document.getElementById("_va-error");
    const btn = document.getElementById("_va-submit");
    errorEl.classList.add("d-none");

    const collected = {};
    cfg.fields.forEach((f) => {
      const el = document.getElementById("f-" + f.name);
      if (!el) return;
      collected[f.name] =
        f.type === "checkbox" ? (el.checked ? 1 : 0) : el.value.trim();
    });

    const missing = cfg.fields.filter((f) => f.reqd && !collected[f.name]);
    if (missing.length) {
      errorEl.textContent =
        "Required: " + missing.map((f) => f.label).join(", ");
      errorEl.classList.remove("d-none");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Submitting… <i class="ti ti-loader-2 icon-end"></i>';

    try {
      if (typeof CW !== "undefined") {
        const r = await CW.run({
          operation: "create",
          target_doctype: cfg.doctype,
          input: {
            form_type: cfg.formType,
            formdata: JSON.stringify(collected),
          },
          options: { render: false },
        });
        if (r.success) {
          document.getElementById("_va-form-body").innerHTML = cfg.successHtml;
          return;
        }
        errorEl.textContent = r.error || "Submission failed. Please try again.";
      } else {
        document.getElementById("_va-form-body").innerHTML = cfg.successHtml;
        return;
      }
    } catch (e) {
      errorEl.textContent = "Something went wrong. Please try again.";
    }

    errorEl.classList.remove("d-none");
    btn.disabled = false;
    btn.innerHTML = `${cfg.submitLabel} <i class="ti ti-arrow-right icon-end"></i>`;
  });
})();
