/* =====================================================
   ads.js  -  Google AdSense Integration
   ===================================================== */
function initAds() {
  if (typeof ADSENSE_CLIENT === "undefined" || !ADSENSE_CLIENT) return;

  if (!document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      ADSENSE_CLIENT;
    document.head.appendChild(s);
  }

  document.querySelectorAll(".ad-slot").forEach((el) => {
    const slot = el.dataset.slot;
    if (!slot) {
      el.style.display = "none";
      return;
    }
    el.classList.add("has-ad");
    el.style.display = "flex";
    el.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%"
      data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${slot}"
      data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
  });
}
