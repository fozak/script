/**
 * CW Slot Picker
 *
 * Exposes:
 *   window.CWSlotPicker.mount({ run_doc, fieldname, onChange })
 *   window.CWSlotPicker.unmount(run_doc)
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ce = React.createElement

function pad(n) { return String(n).padStart(2, '0') }

function toLocalISO(date) {
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
}

function normalizeOffset(off) {
  if (!off) return '+00:00'
  const sign  = off[0] === '-' ? '-' : '+'
  const abs   = off.replace(/^[+-]/, '')
  const parts = abs.split(':')
  const h     = parts[0].padStart(2, '0')
  const m     = (parts[1] || '00').padStart(2, '0')
  return sign + h + ':' + m
}

function getOffset(timezone, date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone, timeZoneName: 'shortOffset'
  }).formatToParts(date)
  const off = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+00:00'
  return normalizeOffset(off.replace('GMT', '') || '+00:00')
}

function fmtUTC(date) {
  return date.getUTCFullYear()
    + pad(date.getUTCMonth() + 1)
    + pad(date.getUTCDate())
    + 'T' + pad(date.getUTCHours())
    + pad(date.getUTCMinutes())
    + '00z'
}

function buildUTCInterval(dateStr, timeStr, durationMinutes, hostTimezone) {
  const [h, m]   = timeStr.split(':').map(Number)
  const isoLocal = dateStr.slice(0,4) + '-' + dateStr.slice(4,6) + '-' + dateStr.slice(6,8)
                 + 'T' + pad(h) + ':' + pad(m) + ':00'
  const offset   = getOffset(hostTimezone, new Date(isoLocal + 'Z'))
  const utcStart = new Date(isoLocal + offset)
  const utcEnd   = new Date(utcStart.getTime() + durationMinutes * 60000)
  return fmtUTC(utcStart) + '/' + fmtUTC(utcEnd)
}

function parseInterval(interval) {
  if (!interval) return null
  const [s, e] = interval.split('/')
  const parse  = t => new Date(
    t.slice(0,4)+'-'+t.slice(4,6)+'-'+t.slice(6,8)+'T'+
    t.slice(9,11)+':'+t.slice(11,13)+':'+t.slice(13,15)+'Z'
  )
  return { start: parse(s), end: parse(e) }
}

function fmtTime(date, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone
  }).format(date)
}

// ─── Core scheduling function ─────────────────────────────────────────────────

function generateSlots(rule, overrides, takenIntervals, targetYear, targetMonth) {
  const cfg         = globalThis.CW._config.calendar
  const duration    = rule.duration_minutes || cfg.defaultDuration
  const buffer      = rule.buffer_minutes   || cfg.defaultBuffer
  const hostTZ      = rule.timezone         || cfg.hostTimezone
  const guestTZ     = cfg.guestTimezone
  const schedule    = typeof rule.schedule === 'string'
                      ? JSON.parse(rule.schedule) : rule.schedule
  const overrideMap = new Map(overrides.map(o => [o.date, o]))
  const takenSet    = new Set(takenIntervals)
  const today       = new Date(); today.setHours(0,0,0,0)
  const windowEnd   = new Date(today.getTime() + cfg.bookingWindowDays * 86400000)
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

  const availableDates = new Set()
  const slotsByDate    = new Map()

  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(targetYear, targetMonth, d)
    if (date < today || date > windowEnd) continue

    const dateStr  = toLocalISO(date)
    const dow      = String((date.getDay() + 6) % 7 + 1)
    const override = overrideMap.get(dateStr)

    let windows = []
    if (override) {
      if (!override.available) continue
      if (override.start_time && override.end_time)
        windows = [{ start: override.start_time, end: override.end_time }]
    } else {
      const rule_day = schedule[dow]
      if (!rule_day) continue
      windows = Array.isArray(rule_day) ? rule_day : [rule_day]
    }

    const daySlots = []
    for (const win of windows) {
      const [sh, sm] = win.start.split(':').map(Number)
      const [eh, em] = win.end.split(':').map(Number)
      let cursor     = sh * 60 + sm
      const endMin   = eh * 60 + em

      while (cursor + duration <= endMin) {
        const h        = Math.floor(cursor / 60)
        const m        = cursor % 60
        const timeStr  = pad(h) + ':' + pad(m)
        const interval = buildUTCInterval(dateStr, timeStr, duration, hostTZ)
        if (!takenSet.has(interval)) {
          const parsed = parseInterval(interval)
          daySlots.push({ interval, label: fmtTime(parsed.start, guestTZ) })
        }
        cursor += duration + buffer
      }
    }

    if (daySlots.length) {
      slotsByDate.set(dateStr, daySlots)
      availableDates.add(dateStr)
    }
  }

  return { availableDates, slotsByDate }
}

// ─── MonthCalendar component ──────────────────────────────────────────────────

function MonthCalendar({ year, month, availableDates, selectedDate, onDateSelect, onPrevMonth, onNextMonth }) {
  const cfg      = globalThis.CW._config.calendar
  const today    = new Date(); today.setHours(0,0,0,0)
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const pad0     = (firstDay.getDay() + 6) % 7
  const cells    = []

  for (let i = 0; i < pad0; i++)
    cells.push({ date: new Date(year, month, i - pad0 + 1), current: false })
  for (let d = 1; d <= lastDay.getDate(); d++)
    cells.push({ date: new Date(year, month, d), current: true })
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, cells.length - pad0 - lastDay.getDate() + 1), current: false })

  return ce('div', { style: { width: '280px', flexShrink: 0 } },

    ce('div', { style: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' } },
      ce('span', { style: { fontWeight:600, fontSize:'14px' } },
        cfg.monthNames[month] + ' ' + year),
      ce('div', { style: { display:'flex', gap:'4px' } },
        ce('button', { onClick: onPrevMonth, type: 'button',
          style: { border:'none', background:'none', cursor:'pointer', padding:'4px 8px', borderRadius:'4px', color:'var(--tblr-secondary)' }
        }, '‹'),
        ce('button', { onClick: onNextMonth, type: 'button',
          style: { border:'none', background:'none', cursor:'pointer', padding:'4px 8px', borderRadius:'4px', color:'var(--tblr-secondary)' }
        }, '›')
      )
    ),

    ce('div', { style: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'4px' } },
      ...cfg.weekDays.map(d => ce('div', { key: d,
        style: { textAlign:'center', fontSize:'11px', fontWeight:500, color:'var(--tblr-secondary)', padding:'4px 0' }
      }, d))
    ),

    ce('div', { style: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' } },
      ...cells.map(({ date, current }, i) => {
        const ds         = toLocalISO(date)
        const isPast     = current && date < today
        const isAvail    = current && !isPast && availableDates.has(ds)
        const isSelected = selectedDate === ds
        const isToday    = current && date.getTime() === today.getTime()

        let bg = 'transparent', color = 'var(--tblr-secondary)', cursor = 'default', border = 'none', fw = 400

        if (!current || isPast)       color = 'var(--tblr-border-color)'
        if (isAvail && !isSelected) { bg = 'var(--tblr-primary-lt)'; color = 'var(--tblr-primary)'; cursor = 'pointer'; fw = 600 }
        if (isSelected)             { bg = 'var(--tblr-primary)';    color = '#fff';                cursor = 'pointer'; fw = 600 }
        if (isToday && !isSelected)   border = '1px solid var(--tblr-primary)'

        return ce('button', {
          key: i, type: 'button',
          disabled: !isAvail && !isSelected,
          onClick:  () => isAvail && onDateSelect(ds),
          style: {
            aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'13px', borderRadius:'50%', background:bg, color, cursor, border,
            fontWeight:fw, padding:0, outline:'none',
          }
        }, date.getDate())
      })
    )
  )
}

// ─── TimeSlotList component ───────────────────────────────────────────────────

function TimeSlotList({ slots, selectedInterval, dayLabel, onSlotSelect }) {
  if (!slots || !slots.length)
    return ce('div', { style: { color:'var(--tblr-secondary)', fontSize:'13px', padding:'8px 0' } },
      'No slots available')

  return ce('div', {
    style: {
      width:'160px', marginLeft:'16px', paddingLeft:'16px',
      borderLeft:'1px solid var(--tblr-border-color)',
      display:'flex', flexDirection:'column', maxHeight:'320px',
    }
  },
    ce('div', { style: { fontSize:'12px', fontWeight:500, color:'var(--tblr-secondary)', marginBottom:'8px', flexShrink:0 } },
      dayLabel
    ),
    ce('div', { style: { overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'6px', paddingRight:'4px' } },
      ...slots.map(({ interval, label }) => {
        const isPicked = selectedInterval === interval
        return ce('button', {
          key: interval, type: 'button',
          onClick: () => onSlotSelect(interval),
          style: {
            padding:'8px 12px', borderRadius:'6px', fontSize:'13px', fontWeight:600,
            cursor:'pointer',
            border:'2px solid var(--tblr-primary)',
            background: isPicked ? 'var(--tblr-primary)' : 'transparent',
            color:      isPicked ? '#fff'               : 'var(--tblr-primary)',
          }
        }, label)
      })
    )
  )
}

// ─── Main picker component ────────────────────────────────────────────────────

function CWSlotPickerComponent({ run_doc, fieldname, onChange }) {
  const cfg             = globalThis.CW._config.calendar
  const initialInterval = run_doc.target?.data?.[0]?.[fieldname] || null
  const today           = new Date()

  const [viewYear,          setViewYear]          = React.useState(today.getFullYear())
  const [viewMonth,         setViewMonth]          = React.useState(today.getMonth())
  const [selectedDate,      setSelectedDate]       = React.useState(null)
  const [selectedInterval,  setSelectedInterval]   = React.useState(initialInterval)
  const [loading,           setLoading]            = React.useState(true)
  const [error,             setError]              = React.useState(null)
  const [slots,             setSlots]              = React.useState({ availableDates: new Set(), slotsByDate: new Map() })

  // ── prefetch ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    setLoading(true)
    setError(null)

    // rule is the boot run_doc itself — it IS the AvailabilityRule record
    const rule = run_doc.target?.data?.[0]
    if (!rule) { setError('No availability rule found'); setLoading(false); return }

    const hostId = rule.owner

    Promise.all([
      // overrides for host
      run_doc.child({
        operation:      'select',
        target_doctype: 'AvailabilityOverride',
        query:          { where: { owner: hostId } },
        options:        { render: false },
      }),
      // taken slots — confirmed Events for host
      run_doc.child({
        operation:      'select',
        target_doctype: 'Event',
        query:          { where: { owner: hostId, docstatus: 1 }, fields: 'id,name,data' },
        options:        { render: false },
      }),
    ]).then(([overrideRes, eventRes]) => {
      const overrides = overrideRes.target?.data || []
      const taken     = (eventRes.target?.data || []).map(e => e.event_slot).filter(Boolean)
      setSlots(generateSlots(rule, overrides, taken, viewYear, viewMonth))
      setLoading(false)
    }).catch(e => {
      console.error('[CWSlotPicker] prefetch failed', e)
      setError('Failed to load availability')
      setLoading(false)
    })
  }, [viewYear, viewMonth, run_doc.name])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  function handleDateSelect(ds) {
    setSelectedDate(ds)
    setSelectedInterval(null)
  }
  function handleSlotSelect(interval) {
    setSelectedInterval(interval)
    onChange?.(interval)
  }

  if (loading)
    return ce('div', { style: { padding:'16px', color:'var(--tblr-secondary)', fontSize:'13px' } },
      'Loading availability…')

  if (error)
    return ce('div', { style: { padding:'16px', color:'var(--tblr-danger)', fontSize:'13px' } },
      error)

  if (!slots.availableDates.size)
    return ce('div', { style: { padding:'16px', color:'var(--tblr-secondary)', fontSize:'13px' } },
      'No availability found.')

  const dayLabel = selectedDate
    ? new Date(
        parseInt(selectedDate.slice(0,4)),
        parseInt(selectedDate.slice(4,6)) - 1,
        parseInt(selectedDate.slice(6,8))
      ).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : ''

  return ce('div', { style: { display:'flex', gap:'0', fontFamily:'inherit', padding:'8px 0' } },
    ce(MonthCalendar, {
      year:           viewYear,
      month:          viewMonth,
      availableDates: slots.availableDates,
      selectedDate,
      onDateSelect:   handleDateSelect,
      onPrevMonth:    prevMonth,
      onNextMonth:    nextMonth,
    }),
    selectedDate && ce(TimeSlotList, {
      slots:           slots.slotsByDate.get(selectedDate) || [],
      selectedInterval,
      dayLabel,
      onSlotSelect:    handleSlotSelect,
    })
  )
}

// ─── Root registry ────────────────────────────────────────────────────────────

const _roots = new Map()

// ─── Public API ───────────────────────────────────────────────────────────────

function mount({ run_doc, fieldname, onChange }) {
  const containerId = run_doc.name + '_' + fieldname
  const container   = document.getElementById(containerId)
  if (!container) return

  if (_roots.has(containerId)) {
    try { _roots.get(containerId).unmount() } catch(_) {}
    _roots.delete(containerId)
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)
  root.render(ce(CWSlotPickerComponent, { run_doc, fieldname, onChange }))
}

function unmount(run_doc) {
  for (const [key] of _roots) {
    if (key.startsWith(run_doc.name + '_')) {
      try { _roots.get(key).unmount() } catch(_) {}
      _roots.delete(key)
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { mount, unmount }

if (typeof window !== 'undefined') {
  window.CWSlotPicker = { mount, unmount }
}
