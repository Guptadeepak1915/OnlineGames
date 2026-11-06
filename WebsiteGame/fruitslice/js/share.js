/**
 * Fruit Slice Master - Social & Score Sharing Suite
 */
"use strict";

class FruitSliceShare {
  static generateShareText(score, maxCombo) {
    const shareUrl = window.location.href;
    return `🍉 I sliced ${score} fruits with a ${maxCombo}x combo in Fruit Slice Master! Can you beat my high score? 🥷⚔️\nPlay free here: ${shareUrl}`;
  }

  static openShareFlow(score, maxCombo, onFallback) {
    const text = `🍉 I sliced ${score} fruits with a ${maxCombo}x combo in Fruit Slice Master! Can you beat my high score? 🥷⚔️`;
    const shareData = {
      title: "Fruit Slice Master",
      text: text,
      url: window.location.href,
    };

    // Native mobile Web Share API if supported
    if (
      navigator.share &&
      /mobile|android|iphone|ipad/i.test(navigator.userAgent)
    ) {
      navigator.share(shareData).catch(() => {
        if (typeof onFallback === "function") onFallback();
      });
    } else {
      if (typeof onFallback === "function") onFallback();
    }
  }

  static populateShareModal({ score, maxCombo, previewEl, waBtn, twBtn }) {
    const text = this.generateShareText(score, maxCombo);
    if (previewEl) previewEl.textContent = `"${text}"`;

    // WhatsApp URL
    if (waBtn) {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      waBtn.setAttribute("href", waUrl);
    }

    // Twitter / X URL
    if (twBtn) {
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      twBtn.setAttribute("href", twUrl);
    }
  }

  static copyScoreText(score, maxCombo, showToast) {
    const text = this.generateShareText(score, maxCombo);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          if (showToast) showToast("📋 Score copied to clipboard!");
        })
        .catch(() => {
          this.fallbackCopyText(text, showToast);
        });
    } else {
      this.fallbackCopyText(text, showToast);
    }
  }

  static fallbackCopyText(text, showToast) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    if (showToast) showToast("📋 Score copied to clipboard!");
  }
}

window.FruitSliceShare = FruitSliceShare;
