// Contact form delivery: JSON POST to the email-api Fly app (see email-api/), which emails contact@portintermodal.com.
const SITE_CONFIG = {
  formEndpoint: 'https://portintermodal-email.fly.dev/api/contact',
  contactEmail: 'contact@portintermodal.com', // fallback shown if sending fails
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
      if (!res.ok) { const err = new Error(String(res.status)); err.body = await res.json().catch(() => ({})); throw err; }
      form.reset(); say('Thanks. Your message has been sent and we will follow up.', 'ok');
    } catch (e) {
      const detail = e.body?.errors ? Object.values(e.body.errors).join(' ') : e.body?.error;
      say(`${detail || 'Something went wrong sending your message.'} You can also email ${SITE_CONFIG.contactEmail}.`, 'err');
    }
    button.disabled = false;
  });
}
