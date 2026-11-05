(function () {
  'use strict';

  // Live Waxhaw clock
  var clocks = document.querySelectorAll('.clock');
  function tick() {
    var t = '';
    try { t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }); } catch (e) {}
    for (var i = 0; i < clocks.length; i++) clocks[i].textContent = t;
  }
  tick();
  setInterval(tick, 30000);

  // Portfolio show all / fewer
  var more = document.getElementById('portfolio-more');
  var toggle = document.getElementById('portfolio-toggle');
  if (more && toggle) {
    toggle.addEventListener('click', function () {
      var open = more.hidden;
      more.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Show fewer rooms' : 'See all 25 rooms';
      if (!open) document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Inquiry form
  var form = document.getElementById('inquiry-form');
  if (!form) return;
  var EMAIL = 'hello@brittanypassavanti.com';
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var btn = document.getElementById('form-submit');
  var statusEl = document.getElementById('form-status');
  var summary = document.getElementById('form-errors');
  var list = document.getElementById('form-errors-list');
  var success = document.getElementById('form-success');
  var FIELDS = ['name', 'email', 'phone', 'location', 'service', 'details'];
  var attempted = false, sending = false;

  function val(n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; }

  function validate() {
    var e = {};
    if (!val('name')) e.name = 'Please enter your name.';
    var em = val('email');
    if (!em) e.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = 'Please enter an email address like name@example.com.';
    var ph = val('phone');
    if (ph) { var d = ph.replace(/\D/g, ''); if (d.length < 7 || d.length > 15) e.phone = 'Please check the phone number, or leave it blank.'; }
    if (!val('location')) e.location = 'Please tell me the town or neighborhood.';
    if (!val('service')) e.service = 'Please choose the kind of help you’re looking for.';
    var det = val('details');
    if (!det) e.details = 'Please share a few details about your project.';
    else if (det.length < 10) e.details = 'A little more detail will help me prepare.';
    return e;
  }

  function showField(n, msg) {
    var input = document.getElementById('f-' + n), p = document.getElementById('f-' + n + '-err');
    if (!input || !p) return;
    if (msg) { input.setAttribute('aria-invalid', 'true'); p.textContent = msg; p.hidden = false; }
    else { input.removeAttribute('aria-invalid'); p.textContent = ''; p.hidden = true; }
  }

  function setStatus(kind, html) {
    statusEl.className = 'status' + (kind ? ' is-' + kind : '');
    statusEl.innerHTML = html;
    statusEl.hidden = !html;
  }

  FIELDS.forEach(function (n) {
    var input = document.getElementById('f-' + n);
    if (input) input.addEventListener('blur', function () { if (attempted) showField(n, validate()[n]); });
  });

  function serviceLabel() {
    var s = form.elements.service;
    return s && s.selectedIndex > 0 ? s.options[s.selectedIndex].text : '';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) return;
    attempted = true;
    setStatus('', '');
    var errs = validate();
    FIELDS.forEach(function (n) { showField(n, errs[n]); });
    var keys = FIELDS.filter(function (k) { return errs[k]; });
    list.textContent = '';
    if (keys.length) {
      keys.forEach(function (k) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#f-' + k; a.textContent = errs[k];
        a.addEventListener('click', function (e) { e.preventDefault(); document.getElementById('f-' + k).focus(); });
        li.appendChild(a); list.appendChild(li);
      });
      summary.hidden = false; summary.focus();
      return;
    }
    summary.hidden = true;
    if (val('company')) { form.hidden = true; success.hidden = false; return; }

    if (!endpoint) {
      // No backend yet: hand off to the visitor's email app.
      var lines = [
        'Name: ' + val('name'), 'Email: ' + val('email'), 'Phone: ' + (val('phone') || '-'),
        'Location: ' + val('location'), 'Service: ' + serviceLabel(),
        'Timing: ' + (val('timing') || '-'), 'Budget: ' + (val('budget') || '-'), '', val('details')
      ];
      var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Design inquiry from ' + val('name')) + '&body=' + encodeURIComponent(lines.join('\n'));
      setStatus('', '<p>Your email app should open with your note ready to send. If it doesn’t, email me at <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.</p>');
      window.location.href = href;
      return;
    }

    sending = true; btn.disabled = true; btn.classList.add('btn-busy'); btn.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    var data = {};
    ['name', 'email', 'phone', 'location', 'service', 'details', 'timing', 'budget', 'company'].forEach(function (k) { data[k] = val(k); });
    data.serviceLabel = serviceLabel();
    data.page = location.href;
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); form.hidden = true; success.hidden = false; success.focus(); })
      .catch(function () { setStatus('error', '<p><strong>Sorry, that didn’t go through.</strong> Please try again, or email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.</p>'); })
      .then(function () { sending = false; btn.disabled = false; btn.classList.remove('btn-busy'); btn.textContent = 'Send inquiry'; form.setAttribute('aria-busy', 'false'); });
  });
})();
