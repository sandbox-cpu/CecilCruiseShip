// Pieces shared by the Node server and the static build: security headers and small plain pages.

export const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function shell(title, bodyClass, inner) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(title)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">
${inner}
</body>
</html>`;
}

export function noticePage({ status, message, heading }) {
  const title = heading ?? { added: "You're on the passenger list", exists: "You're already on the passenger list", missing: "Not found" }[status] ?? "One moment";
  return shell(
    `${title} · Cecil`,
    "notice-page",
    `<main class="notice">
    <span class="monogram" aria-hidden="true">C</span>
    <p class="eyebrow">SS Halcyon</p>
    <h1>${esc(title)}</h1>
    <p>${esc(message)}</p>
    <a class="btn primary" href="/">Return to the ship</a>
  </main>`,
  );
}
