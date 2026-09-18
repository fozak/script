(function () {
  if (document.getElementById("guest-visit-section-slots")) return;

  const cfg = Object.assign(
    {
      mountId:      "guest-visit",
      form_type:    "Guest Visit",
      doctype:      "HtmlForm",
      slotCount:    8,
      slotDayOfWeek: 4,
      slotTime:     "6:30 PM",
      location:     "1 Broadway, 5th Floor, Cambridge MA 02142",
      visitTitle:   "Visit as a guest",
      visitDesc:    "Pick any Thursday. Show up at 6:30 PM. No application, no fee. Come with a one-minute description of what you do and what introduction would help you most.",
      applyTitle:   "Apply for membership",
      applyDesc:    "NESEN is a referral-first community. Before applying, visit as a guest and secure two recommendations from existing members. Members who arrive with recommendations are almost always approved.",
      submitLabel:  "Submit application",
      successHtml:  '<div class="alert alert-success m-3"><i class="ti ti-circle-check me-2"></i><strong>Application submitted!</strong> We will be in touch soon.</div>',
      fields: [
        { name: "first_name",     reqd: 1, label: "First name",        icon: "user",           type: "text",     placeholder: "First name",                                    layout: "half" },
        { name: "last_name",      reqd: 1, label: "Last name",         icon: "user",           type: "text",     placeholder: "Last name",                                     layout: "half" },
        { name: "email",          reqd: 1, label: "Email",             icon: "mail",           type: "email",    placeholder: "you@company.com",                               layout: "half" },
        { name: "phone",                   label: "Phone",             icon: "phone",          type: "tel",      placeholder: "+1 (617) 000-0000",                             layout: "half" },
        { name: "linkedin_url",   reqd: 1, label: "LinkedIn profile",  icon: "brand-linkedin", type: "url",      placeholder: "https://linkedin.com/in/yourname" },
        { name: "recommended_by",          label: "Recommended by",    icon: "user-check",     type: "text",     placeholder: "Name of NESEN member who recommended you",      hint: "Two recommendations significantly improve your application." },
        { name: "interest",       reqd: 1, label: "I am interested in…",                       type: "textarea", placeholder: "Tell us what brought you to NESEN and what you are hoping to build, find, or contribute here.", hint: "Be specific — the more clearly you describe your goals, the easier it is for the community to help you.", rows: 5 },
        { name: "visit_date",     reqd: 1, label: "Visit date",                                type: "hidden",   source: "slots" },
        { name: "terms_accepted", reqd: 1, label: "Terms accepted",                            type: "checkbox", checkLabel: 'I have read and agree to the <a href="/terms.html">Terms of Use</a> and <a href="/privacy.html">Privacy Policy</a>' },
      ],
    },
    window.GuestVisitCfg || {}
  );

  // ── id helpers ───────────────────────────────────────────────
  const id = {
    section: (name) => `${cfg.mountId}-section-${name}`,
    field:   (name) => `${cfg.mountId}-field-${name}`,
    action:  (name) => `${cfg.mountId}-action-${name}`,
    state:   (name) => `${cfg.mountId}-state-${name}`,
    target:  (name) => `${cfg.mountId}-target-${name}`,
  };

  const el = (role, name) => document.getElementById(id[role](name));

  // ── field HTML ───────────────────────────────────────────────
  function fieldHtml(f) {
    const fid = id.field(f.name);
    const req  = f.reqd ? " required" : "";
    if (f.type === "hidden")   return `<input type="hidden" id="${fid}">`;
    if (f.type === "checkbox") return `
      <label class="form-check m-0">
        <input class="form-check-input" type="checkbox" id="${fid}">
        <span class="form-check-label">${f.checkLabel}</span>
      </label>`;
    if (f.type === "textarea") return `
      <div class="mb-3">
        <label class="form-label${req}">${f.label}</label>
        <textarea class="form-control" id="${fid}" rows="${f.rows || 4}" placeholder="${f.placeholder || ""}"></textarea>
        ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ""}
      </div>`;
    const input = f.icon
      ? `<div class="input-icon">
           <span class="input-icon-addon"><i class="ti ti-${f.icon}"></i></span>
           <input type="${f.type}" class="form-control" id="${fid}" placeholder="${f.placeholder || ""}">
         </div>`
      : `<input type="${f.type}" class="form-control" id="${fid}" placeholder="${f.placeholder || ""}">`;
    return `
      <div class="mb-3">
        <label class="form-label${req}">${f.label}</label>
        ${input}
        ${f.hint ? `<small class="form-hint">${f.hint}</small>` : ""}
      </div>`;
  }

  const halfFields   = cfg.fields.filter(f => f.layout === "half");
  const fullFields   = cfg.fields.filter(f => !f.layout && f.type !== "hidden" && f.type !== "checkbox");
  const hiddenFields = cfg.fields.filter(f => f.type === "hidden");
  const checkFields  = cfg.fields.filter(f => f.type === "checkbox");

  // ── mount ────────────────────────────────────────────────────
  document.getElementById(cfg.mountId).innerHTML = `
  <section id="${id.section("slots")}" class="section">
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
            <div class="card-body p-0" id="${id.section("slot-list")}"></div>
            <div class="card-footer text-secondary small">
              After selecting a date, fill in your details below.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="${id.section("apply")}" class="section section-light">
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
            <div class="card-body" id="${id.target("form")}">
              <div id="${id.state("banner")}" class="alert alert-info d-none">
                <i class="ti ti-calendar-check me-2"></i><span id="${id.state("banner-label")}"></span>
              </div>
              <div id="${id.state("error")}" class="alert alert-danger d-none"></div>
              ${hiddenFields.map(fieldHtml).join("")}
              <div class="row row-cols-2 g-4 mb-3">
                ${halfFields.map(f => `<div>${fieldHtml(f)}</div>`).join("")}
              </div>
              ${fullFields.map(fieldHtml).join("")}
              <div class="row align-items-center mt-2">
                <div class="col">${checkFields.map(fieldHtml).join("")}</div>
                <div class="col-auto">
                  <button type="button" class="btn btn-primary" id="${id.action("submit")}" disabled>
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
  const slotList = el("section", "slot-list");
  const now  = new Date();
  const diff = (cfg.slotDayOfWeek - now.getDay() + 7) % 7 || 7;
  for (let i = 0; i < cfg.slotCount; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + diff + i * 7);
    const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    slotList.insertAdjacentHTML("beforeend", `
      <div class="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
        <div class="fw-semibold">${label}</div>
        <button class="btn btn-primary btn-sm" data-slot-date="${label}">
          <i class="ti ti-calendar-plus me-1"></i>Register
        </button>
      </div>`);
  }

  slotList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-slot-date]");
    if (!btn) return;
    const label = btn.dataset.slotDate;
    el("field", "visit_date").value = label;
    el("state", "banner-label").innerHTML = `Visiting on <strong>${label} at ${cfg.slotTime}</strong>`;
    el("state", "banner").classList.remove("d-none");
    el("section", "apply").scrollIntoView({ behavior: "smooth" });
  });

  // ── gate: terms → enable submit ──────────────────────────────
  el("field", "terms_accepted").addEventListener("change", function () {
    el("action", "submit").disabled = !this.checked;
  });

  // ── submit ───────────────────────────────────────────────────
  el("action", "submit").addEventListener("click", async () => {
    const errorEl = el("state", "error");
    const btn     = el("action", "submit");
    errorEl.classList.add("d-none");

    const collected = {};
    cfg.fields.forEach(f => {
      const fieldEl = el("field", f.name);
      if (!fieldEl) return;
      collected[f.name] = f.type === "checkbox" ? (fieldEl.checked ? 1 : 0) : fieldEl.value.trim();
    });

    const missing = cfg.fields.filter(f => f.reqd && !collected[f.name]);
    if (missing.length) {
      errorEl.textContent = "Required: " + missing.map(f => f.label).join(", ");
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
            form_type: cfg.form_type,
            formdata:  JSON.stringify(collected),
          },
          options: { render: false },
        });
        if (r.success) {
          el("target", "form").innerHTML = cfg.successHtml;
          return;
        }
        errorEl.textContent = r.error || "Submission failed. Please try again.";
      } else {
        el("target", "form").innerHTML = cfg.successHtml;
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
