// widgets/visit-apply.js on hub
(function() {
  document.getElementById('visit-apply').innerHTML = `
    <!-- full HTML here -->
  <section id="visit" class="section">
    <div class="container">
      <div class="row g-xl-6">
        <div class="col-lg-4">
          <div class="section-header text-start sticky-top" style="top:5rem">
            <div class="section-title">Visit as a guest</div>
            <p class="section-description">Pick any Thursday. Show up at 6:30 PM. No application, no fee. Come with a
              one-minute description of what you do and what introduction would help you most.</p>
            <div class="meeting-ribbon mt-3">
              <i class="ti ti-map-pin"></i> 1 Broadway, 5th Floor, Cambridge MA 02142
            </div>
          </div>
        </div>
        <div class="col-lg">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Choose a Thursday</h3>
            </div>
            <div class="card-body p-0" id="thursday-slots"></div>
            <div class="card-footer text-secondary small">
              After selecting a date, fill in your details below. You will receive a confirmation email with what to
              expect at your first visit.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- APPLY SECTION -->
  <section id="apply" class="section section-light">
    <div class="container">
      <div class="row g-xl-6">
        <div class="col-lg-4">
          <div class="section-header text-start sticky-top" style="top:5rem">
            <div class="section-title">Apply for membership</div>
            <p class="section-description">NESEN is a referral-first community. Before applying, visit as a guest and
              secure two recommendations from existing members. Members who arrive with recommendations are almost
              always approved.</p>
            <a href="/visit.html" class="btn btn-outline-primary mt-2">
              <i class="ti ti-calendar me-1"></i>Visit as a guest first
            </a>
          </div>
        </div>
        <div class="col-lg">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Membership application</h3>
            </div>
            <div class="card-body" id="apply-card-body">

              <div id="selected-visit-date" class="alert alert-info d-none">
                <i class="ti ti-calendar-check me-2"></i>
                <span id="selected-visit-label"></span>
              </div>

              <div id="form-error" class="alert alert-danger d-none"></div>

              <div class="row row-cols-2 g-4 mb-3">
                <div>
                  <label class="form-label required">First name</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><i class="ti ti-user"></i></span>
                    <input type="text" class="form-control" id="f-first_name" placeholder="First name">
                  </div>
                </div>
                <div>
                  <label class="form-label required">Last name</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><i class="ti ti-user"></i></span>
                    <input type="text" class="form-control" id="f-last_name" placeholder="Last name">
                  </div>
                </div>
                <div>
                  <label class="form-label required">Email</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><i class="ti ti-mail"></i></span>
                    <input type="email" class="form-control" id="f-email" placeholder="you@company.com">
                  </div>
                </div>
                <div>
                  <label class="form-label">Phone</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><i class="ti ti-phone"></i></span>
                    <input type="tel" class="form-control" id="f-phone" placeholder="+1 (617) 000-0000">
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label required">LinkedIn profile</label>
                <div class="input-icon">
                  <span class="input-icon-addon"><i class="ti ti-brand-linkedin"></i></span>
                  <input type="url" class="form-control" id="f-linkedin_url"
                    placeholder="https://linkedin.com/in/yourname">
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Recommended by</label>
                <div class="input-icon">
                  <span class="input-icon-addon"><i class="ti ti-user-check"></i></span>
                  <input type="text" class="form-control" id="f-recommended_by"
                    placeholder="Name of NESEN member who recommended you">
                </div>
                <small class="form-hint">Two recommendations significantly improve your application.</small>
              </div>

              <div class="mb-3">
                <label class="form-label required">I am interested in…</label>
                <textarea class="form-control" id="f-interest" rows="5"
                  placeholder="Tell us what brought you to NESEN and what you are hoping to build, find, or contribute here."></textarea>
                <small class="form-hint">Be specific — the more clearly you describe your goals, the easier it is for
                  the community to help you.</small>
              </div>

              <div class="row align-items-center">
                <div class="col">
                  <label class="form-check m-0">
                    <input class="form-check-input" type="checkbox" id="f-terms_accepted">
                    <span class="form-check-label">I have read and agree to the <a href="/terms.html">Terms of Use</a>
                      and <a href="/privacy.html">Privacy Policy</a></span>
                  </label>
                </div>
                <div class="col-auto">
                  <button type="button" class="btn btn-primary" id="submit-btn" disabled>
                    Submit application
                    <i class="ti ti-arrow-right icon-end"></i>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;




      // ── formdata.fields — single source of truth ────────────
      // name     → matches id="f-{name}" in HTML
      // reqd     → validated on submit
      // label    → used in error messages
      // checkbox → collected differently (checked state)
      const formdata = {
        form_type: 'GuestVisit',
        fields: [
          { name: 'first_name', reqd: 1, label: 'First name' },
          { name: 'last_name', reqd: 1, label: 'Last name' },
          { name: 'email', reqd: 1, label: 'Email' },
          { name: 'phone', label: 'Phone' },
          { name: 'linkedin_url', reqd: 1, label: 'LinkedIn profile' },
          { name: 'recommended_by', label: 'Recommended by' },
          { name: 'interest', reqd: 1, label: 'I am interested in…' },
          { name: 'visit_date', reqd: 1, label: 'Visit date' },
          { name: 'terms_accepted', reqd: 1, label: 'Terms accepted', checkbox: 1 },
        ]
      }

      // ── Thursday slots ──────────────────────────────────────
      function initSlots() {
        const el = document.getElementById('thursday-slots')
        const now = new Date()
        const diff = (4 - now.getDay() + 7) % 7 || 7
        const first = new Date(now)
        first.setDate(now.getDate() + diff)
        for (let i = 0; i < 8; i++) {
          const d = new Date(first)
          d.setDate(first.getDate() + i * 7)
          const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
          el.innerHTML += `
        <div class="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
          <div class="fw-semibold">${label}</div>
          <button class="btn btn-primary btn-sm" onclick="window._nesSelectDate('${label}')">
            <i class="ti ti-calendar-plus me-1"></i>Register
          </button>
        </div>`
        }
      }

      window._nesSelectDate = function (label) {
        document.getElementById('selected-visit-label').innerHTML =
          `Visiting on <strong>${label} at 6:30 PM</strong>`
        document.getElementById('selected-visit-date').classList.remove('d-none')
        document.getElementById('apply').scrollIntoView({ behavior: 'smooth' })
        // store in hidden field for collection
        document.getElementById('f-visit_date') && (document.getElementById('f-visit_date').value = label)
        window._visitDate = label
      }

      // ── Terms checkbox → enable submit ──────────────────────
      document.getElementById('f-terms_accepted').addEventListener('change', function () {
        document.getElementById('submit-btn').disabled = !this.checked
      })

      // ── Submit ──────────────────────────────────────────────
      document.getElementById('submit-btn').addEventListener('click', async () => {
        const errorEl = document.getElementById('form-error')
        errorEl.classList.add('d-none')

        // collect all fields from formdata.fields
        const collected = {}
        formdata.fields.forEach(f => {
          if (f.name === 'visit_date') { collected[f.name] = window._visitDate || ''; return }
          const el = document.getElementById('f-' + f.name)
          if (!el) return
          collected[f.name] = f.checkbox ? (el.checked ? 1 : 0) : el.value.trim()
        })

        // validate reqd from formdata.fields
        const missing = formdata.fields.filter(f => f.reqd && !collected[f.name])
        if (missing.length) {
          errorEl.textContent = 'Required: ' + missing.map(f => f.label).join(', ')
          errorEl.classList.remove('d-none')
          return
        }

        const btn = document.getElementById('submit-btn')
        btn.disabled = true
        btn.innerHTML = 'Submitting… <i class="ti ti-loader-2 icon-end"></i>'

        try {
          if (typeof CW !== 'undefined') {
            const r = await CW.run({
              operation: 'create',
              target_doctype: 'HtmlForm',
              input: {
                form_type: formdata.form_type,
                formdata: JSON.stringify(collected),
                domain: window.location.hostname,
              },
              options: { render: false }
            })
            if (r.success) {
              document.getElementById('apply-card-body').innerHTML =
                '<div class="alert alert-success m-3"><i class="ti ti-circle-check me-2"></i><strong>Application submitted!</strong> We will be in touch soon.</div>'
              return
            }
            errorEl.textContent = r.error || 'Submission failed. Please try again.'
          } else {
            document.getElementById('apply-card-body').innerHTML =
              '<div class="alert alert-success m-3"><i class="ti ti-circle-check me-2"></i><strong>Application submitted!</strong> We will be in touch soon.</div>'
            return
          }
        } catch (e) {
          errorEl.textContent = 'Something went wrong. Please try again.'
        }

        errorEl.classList.remove('d-none')
        btn.disabled = false
        btn.innerHTML = 'Submit application <i class="ti ti-arrow-right icon-end"></i>'
      })

      initSlots()
})()
