// saves-modal-manager.js
class SavesModalManager {
  constructor(gameSaveSystem) {
    this.gameSaveSystem = gameSaveSystem;
    this.maxSaveSlots = 5;
    this.autosaveSlot = 0;
    this.confirmModal = null;

    if (!this.gameSaveSystem) {
      window.errorManager.critical(
        "SavesModalManager requires a save system",
        new Error("Invalid save system"),
        "saves-modal",
      );
      return;
    }

    this.init();
  }

  init() {
    this.createModal();
    this.createConfirmModal();
  }

  createModal() {
    this.modal = new BaseModal({
      title: "存档与读档",
      className: "saves-modal",
      maxWidth: "600px",
      onShow: () => this.populateSaveSlots(),
    });
  }
  createConfirmModal() {
    this.confirmModal = new BaseModal({
      title: "确认",
      className: "confirm-modal",
      maxWidth: "400px",
      showFooter: true,
    });
  }

  show() {
    this.modal?.show();
  }

  hide() {
    this.modal?.hide();
  }

  populateSaveSlots() {
    if (!this.modal?.modalElement) return;

    const contentHTML = `
      <div class="saves-section">
        <h3>存档槽</h3>
        <div class="save-slots-container">
          ${this.generateSaveSlotsHTML()}
        </div>
        <div class="import-export-info">
          <strong>提示：</strong>点击"导出"可将存档保存为文件；在空槽点击"在此导入"可载入存档文件。按 Ctrl+S 快速打开此窗口。
        </div>
      </div>
    `;

    this.modal.setContent(contentHTML);

    // Set footer with close button
    const footer = this.modal.getFooter();
    if (footer) {
      footer.innerHTML = "";
      footer.style.textAlign = "right";

      const closeBtn = this.modal.createButton("关闭", {
        variant: "primary",
        onClick: () => this.hide(),
      });

      footer.appendChild(closeBtn);
    }

    this.setupSlotEventListeners();
  }

  generateSaveSlotsHTML() {
    let html = "";

    // Add autosave slot first
    html += this.createSaveSlotHTML(this.autosaveSlot, true);

    // Add regular save slots
    for (let i = 1; i <= this.maxSaveSlots; i++) {
      html += this.createSaveSlotHTML(i, false);
    }

    return html;
  }

  createSaveSlotHTML(slotNumber, isAutosave = false) {
    try {
      const saveData = this.gameSaveSystem.getSaveData(slotNumber);
      const isEmpty = !saveData;

      if (isEmpty) {
        return `<div class="save-slot ${isAutosave ? "autosave-slot" : ""}" data-slot="${slotNumber}">
          ${this.createEmptySlotHTML(slotNumber, isAutosave)}
        </div>`;
      } else {
        return `<div class="save-slot ${isAutosave ? "autosave-slot" : ""}" data-slot="${slotNumber}">
          ${this.createFilledSlotHTML(slotNumber, saveData, isAutosave)}
        </div>`;
      }
    } catch (error) {
      window.errorManager.error(
        "Failed to create save slot HTML",
        error,
        "saves-modal",
      );
      return "";
    }
  }

  createEmptySlotHTML(slotNumber, isAutosave) {
    const slotName = isAutosave ? "自动存档" : `存档槽 ${slotNumber}`;
    const emptyText = isAutosave ? "暂无自动存档" : "空";
    const helpText = isAutosave
      ? "在设置中启用后，每次选择后将自动存档"
      : "";

    return `
      <div class="save-slot-content">
        <div class="save-slot-info">
          <strong class="save-slot-name">${slotName}</strong>
          <div class="save-slot-description">${emptyText}</div>
          ${helpText ? `<div class="save-slot-detail">${helpText}</div>` : ""}
        </div>
        <div class="save-slot-actions">
          ${!isAutosave ? this.createActionButton("在此存档", "save-to-slot", "primary") : ""}
          ${!isAutosave ? this.createActionButton("在此导入", "import-to-slot", "secondary") : ""}
        </div>
      </div>
    `;
  }

  createFilledSlotHTML(slotNumber, saveData, isAutosave) {
    const slotName = isAutosave ? "自动存档" : `存档槽 ${slotNumber}`;
    const timestamp = new Date(saveData.timestamp).toLocaleString();

    return `
      <div class="save-slot-content">
        <div class="save-slot-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <strong class="save-slot-name">${slotName}</strong>
            <span class="save-slot-timestamp">${timestamp}</span>
          </div>
          <div class="save-slot-description">
            ${saveData.saveName || "已存档"}
          </div>
          ${
            saveData.description
              ? `<div class="save-slot-detail">${saveData.description}</div>`
              : ""
          }
        </div>
        <div class="save-slot-actions">
          ${this.createActionButton("读取", "load-from-slot", "secondary")}
          ${this.createActionButton("导出", "export-from-slot", "primary")}
          ${!isAutosave ? this.createActionButton("覆盖", "overwrite-slot", "warning") : ""}
          ${this.createActionButton(isAutosave ? "清除" : "删除", "delete-slot", "danger")}
        </div>
      </div>
    `;
  }

  createActionButton(text, action, variant) {
    return `<button class="${action} save-action-button save-action-${variant}">${text}</button>`;
  }

  setupSlotEventListeners() {
    if (!this.modal?.modalElement) return;

    // Add hover effects to slots
    const slots = this.modal.modalElement.querySelectorAll(".save-slot");
    slots.forEach((slot) => {
      const isAutosave = slot.classList.contains("autosave-slot");

      slot.addEventListener("mouseenter", () => {
        slot.style.background = isAutosave
          ? "var(--color-background)"
          : "var(--color-hover-bg)";
        if (isAutosave) slot.style.color = "white";
      });

      slot.addEventListener("mouseleave", () => {
        slot.style.background = isAutosave
          ? "var(--color-hover-bg)"
          : "transparent";
        slot.style.color = "";
      });
    });

    // Setup action buttons
    const actionHandlers = {
      "save-to-slot": (slotNumber) =>
        this.gameSaveSystem.saveToSlot(slotNumber),
      "load-from-slot": (slotNumber) =>
        this.gameSaveSystem.loadFromSlot(slotNumber),
      "export-from-slot": (slotNumber) =>
        this.gameSaveSystem.exportFromSlot(slotNumber),
      "import-to-slot": (slotNumber) =>
        this.gameSaveSystem.importToSlot(slotNumber),
      "overwrite-slot": (slotNumber) =>
        this.gameSaveSystem.saveToSlot(slotNumber),
      "delete-slot": (slotNumber) => {
        const slot = this.modal.modalElement.querySelector(
          `[data-slot="${slotNumber}"]`,
        );
        const isAutosave = slot?.classList.contains("autosave-slot");
        this.gameSaveSystem.deleteSlot(slotNumber, isAutosave);
      },
    };

    Object.entries(actionHandlers).forEach(([className, handler]) => {
      this.modal.addBodyEventListener(`.${className}`, "click", (e) => {
        try {
          const slot = e.target.closest("[data-slot]");
          const slotNumber = parseInt(slot?.dataset.slot);
          if (!isNaN(slotNumber)) {
            handler(slotNumber);
            // Refresh slots after action
            setTimeout(() => this.populateSaveSlots(), 100);
          }
        } catch (error) {
          window.errorManager.error(
            "Save slot action failed",
            error,
            "saves-modal",
          );
        }
      });
    });
  }

  showNotification(message, isError = false, duration = 4000) {
    this.modal?.showNotification(message, isError, duration);
  }

  isReady() {
    return !!(this.modal?.isReady() && this.gameSaveSystem);
  }

  getStats() {
    return {
      hasModal: !!this.modal,
      hasGameSaveSystem: !!this.gameSaveSystem,
      maxSaveSlots: this.maxSaveSlots,
      autosaveSlot: this.autosaveSlot,
      modalVisible: this.modal?.isVisible || false,
    };
  }
}
