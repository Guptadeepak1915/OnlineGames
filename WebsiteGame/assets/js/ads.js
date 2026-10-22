/* =====================================================
   ads.js  -  Google AdSense
   Works only after you set ADSENSE_CLIENT in config.js
   and data-slot="..." in index.html (two places).
   Until then the dashed "Ad space" boxes stay visible.
   ===================================================== */

function initAds() {
  if (!ADSENSE_CLIENT) return;

  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
    ADSENSE_CLIENT;
  document.head.appendChild(s);

  document.querySelectorAll(".ad-slot").forEach((el) => {
    const slot = el.dataset.slot;
    if (!slot) return;
    el.classList.add("has-ad");
    el.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%"
      data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${slot}"
      data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
}
