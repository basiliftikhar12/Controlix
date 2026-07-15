// ===== Mobile nav toggle (same as home.js) =====
(function () {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle) return;
  toggle.addEventListener("click", () => nav.classList.toggle("mobile-open"));
})();

// ===== Contact form submission (Formspree) =====
// IMPORTANT: replace FORM_ENDPOINT below with your own Formspree endpoint.
// 1. Go to https://formspree.io and sign up (free)
// 2. Create a new form, it gives you a URL like https://formspree.io/f/abcd1234
// 3. Paste that URL below
const FORM_ENDPOINT = "https://formspree.io/f/xdaqkjjb";

(function () {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      });

      if (res.ok) {
        status.textContent = "Message sent — we'll get back to you shortly.";
        status.classList.add("success");
        form.reset();
      } else {
        status.textContent = "Something went wrong. Please try again or email us directly.";
        status.classList.add("error");
      }
    } catch (err) {
      status.textContent = "Network error. Please check your connection and try again.";
      status.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Contact Us";
    }
  });
})();
