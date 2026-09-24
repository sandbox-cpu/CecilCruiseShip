// The admin table: remove a sign-up (for example, when someone asks to be taken off the list).

const total = document.getElementById("total");

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-delete]");
  if (!btn) return;
  const row = btn.closest("tr");
  const email = row?.children[1]?.textContent ?? "this sign-up";
  if (!confirm(`Remove ${email} from the waitlist? This can't be undone.`)) return;
  btn.disabled = true;
  const res = await fetch(`/admin/signups/${encodeURIComponent(btn.dataset.delete)}`, {
    method: "DELETE",
    headers: { "X-Cecil-Admin": "1" },
  });
  if (res.ok) {
    row.remove();
    if (total) total.textContent = String(Math.max(0, Number(total.textContent) - 1));
  } else {
    btn.disabled = false;
    alert("That sign-up could not be removed. Refresh the page and try again.");
  }
});
