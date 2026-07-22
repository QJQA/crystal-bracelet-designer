const siteHeader = document.querySelector("#siteHeader");
const menuButton = document.querySelector("#menuButton");
const siteNav = document.querySelector("#siteNav");

menuButton.addEventListener("click", () => {
  const open = siteNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.textContent = open ? "关闭" : "菜单";
});

siteNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  siteNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.textContent = "菜单";
}));

window.addEventListener("scroll", () => siteHeader.classList.toggle("scrolled", window.scrollY > 18), { passive: true });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(element => revealObserver.observe(element));

document.querySelectorAll(".faq-list details").forEach(item => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq-list details").forEach(other => {
      if (other !== item) other.open = false;
    });
  });
});
