/**
 * Target Hit - Social Share & Clipboard Brag System
 */
"use strict";

class ShareManager {
  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.shareModal = document.getElementById("shareModal");
    this.closeShareBtn = document.getElementById("closeShareBtn");
    this.shareWhatsAppBtn = document.getElementById("shareWhatsAppBtn");
    this.shareTwitterBtn = document.getElementById("shareTwitterBtn");
    this.shareCopyBtn = document.getElementById("shareCopyBtn");
    this.shareQuotePreview = document.getElementById("shareQuotePreview");
    this.toast = document.getElementById("toast");
  }

  bindEvents() {
    if (this.closeShareBtn) {
      this.closeShareBtn.addEventListener("click", () => this.hide());
    }

    if (this.shareCopyBtn) {
      this.shareCopyBtn.addEventListener("click", () => {
        this.copyTextToClipboard(this.lastQuote);
      });
    }
  }

  getBragMessage(score, stage, apples) {
    const siteUrl = window.location.href.split("#")[0];
    const isBossStage = stage >= 5;
    const emoji = isBossStage ? "👑🎯" : "🎯✨";
    return `${emoji} I conquered Stage ${stage} with a score of ${score} in Target Hit! Sliced ${apples} apples along the way. Can you beat my precision? 🗡️\nPlay free here: ${siteUrl}`;
  }

  open(score, stage, apples) {
    this.lastQuote = this.getBragMessage(score, stage, apples);

    if (this.shareQuotePreview) {
      this.shareQuotePreview.textContent = `"${this.lastQuote}"`;
    }

    const encoded = encodeURIComponent(this.lastQuote);

    if (this.shareWhatsAppBtn) {
      this.shareWhatsAppBtn.href = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    if (this.shareTwitterBtn) {
      this.shareTwitterBtn.href = `https://twitter.com/intent/tweet?text=${encoded}`;
    }

    if (this.shareModal) {
      this.shareModal.classList.remove("hidden");
    }
  }

  hide() {
    if (this.shareModal) {
      this.shareModal.classList.add("hidden");
    }
  }

  showToast(msg = "Copied to clipboard!") {
    if (!this.toast) return;
    this.toast.textContent = msg;
    this.toast.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.classList.add("hidden");
    }, 2400);
  }

  async copyTextToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.showToast("Score copied to clipboard! 📋");
        return;
      }
    } catch (e) {}

    // Fallback
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      this.showToast("Score copied to clipboard! 📋");
    } catch (err) {
      this.showToast("Unable to copy score.");
    }
  }
}

window.ShareManager = ShareManager;
