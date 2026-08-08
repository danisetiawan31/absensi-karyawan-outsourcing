import { CONFIRM_MODAL_VARIANT_CONFIG, ConfirmModal } from "../ConfirmModal";

describe("ConfirmModal Component Suite", () => {
  it("1. harus merender null jika visible === false", () => {
    const modal = ConfirmModal({
      visible: false,
      title: "Judul Modal",
      description: "Deskripsi modal.",
      confirmText: "Ya",
      cancelText: "Tidak",
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    });

    expect(modal).toBeNull();
  });

  it("2. harus merender modal saat visible === true dan memanggil handler saat tombol ditekan", () => {
    const handleConfirm = jest.fn();
    const handleCancel = jest.fn();

    const modal = ConfirmModal({
      visible: true,
      variant: "danger",
      title: "Batalkan Pengajuan Izin?",
      description: "Pengajuan yang dibatalkan tidak dapat dikembalikan.",
      confirmText: "Ya, Batalkan",
      cancelText: "Tidak, Simpan",
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    });

    expect(modal).not.toBeNull();
    const cardView = modal!.props.children.props.children;
    const buttonRow = cardView.props.children[1];

    const cancelBtn = buttonRow.props.children[0];
    expect(cancelBtn.props.testID).toBe("button-cancel-modal");
    cancelBtn.props.onPress();
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const confirmBtn = buttonRow.props.children[1];
    expect(confirmBtn.props.testID).toBe("button-confirm-modal");
    confirmBtn.props.onPress();
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("3. harus menerapkan variant styling (danger, warning, info) yang benar", () => {
    const dangerModal = ConfirmModal({
      visible: true,
      variant: "danger",
      title: "Aksi Bahaya",
      description: "Hapus data.",
      confirmText: "Hapus",
      cancelText: "Batal",
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    });
    const dangerCard = dangerModal?.props.children.props.children;
    const dangerHeader = dangerCard.props.children[0];
    const dangerIconCircle = dangerHeader.props.children[0];
    expect(dangerIconCircle.props.className).toContain(
      CONFIRM_MODAL_VARIANT_CONFIG.danger.iconBgClass,
    );

    const warningModal = ConfirmModal({
      visible: true,
      variant: "warning",
      title: "Peringatan",
      description: "Periksa kembali.",
      confirmText: "Lanjut",
      cancelText: "Batal",
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    });
    const warningCard = warningModal?.props.children.props.children;
    const warningHeader = warningCard.props.children[0];
    const warningIconCircle = warningHeader.props.children[0];
    expect(warningIconCircle.props.className).toContain(
      CONFIRM_MODAL_VARIANT_CONFIG.warning.iconBgClass,
    );
  });
});
