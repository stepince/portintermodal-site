// Contact form delivery. No backend: use an external form service or fall back to the visitor's email client.
// Set formEndpoint (e.g. a Formspree/Basin/Getform URL that accepts JSON) and/or contactEmail before launch.
const SITE_CONFIG = {
  formEndpoint: '',
  contactEmail: '',
};

document.getElementById('year')?.replaceChildren(String(new Date().getFullYear()));

const form = document.getElementById('contactForm');
if (form) {
  const notice = document.getElementById('formNotice');
  const status = document.getElementById('formStatus');
  const button = form.querySelector('button[type="submit"]');
  const configured = SITE_CONFIG.formEndpoint || SITE_CONFIG.contactEmail;
  if (!configured) { notice.hidden = false; button.disabled = true; }
  const say = (text, cls) => { status.textContent = text; status.className = `status-msg ${cls || ''}`; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return; // honeypot
    if (!SITE_CONFIG.formEndpoint) {
      const body = `${data.message}\n\n${data.name}${data.company ? `, ${data.company}` : ''}\n${data.email}`;
      location.href = `mailto:${SITE_CONFIG.contactEmail}?subject=${encodeURIComponent(`${data.topic} — PortIntermodal`)}&body=${encodeURIComponent(body)}`;
      return;
    }
    button.disabled = true; say('Sending…');
    try {
      const res = await fetch(SITE_CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      form.reset(); say('Thanks. Your message has been sent and we will follow up.', 'ok');
    } catch { say('Something went wrong sending your message. Please try again.', 'err'); }
    button.disabled = false;
  });
}
