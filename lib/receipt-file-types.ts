export const acceptedReceiptMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const acceptedReceiptExtensions = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const acceptedReceiptFileInputValue = [
  ...acceptedReceiptMimeTypes,
  ...acceptedReceiptExtensions,
].join(",");
