const RECEIPT_STATIC_SEGMENT = "_static";

function encodeId(id: string) {
  return encodeURIComponent(id);
}

export function getReceiptDetailHref(id: string) {
  return `/receipts/${RECEIPT_STATIC_SEGMENT}?id=${encodeId(id)}`;
}

export function getReceiptEditHref(id: string) {
  return `/receipts/${RECEIPT_STATIC_SEGMENT}/edit?id=${encodeId(id)}`;
}

export function resolveReceiptRouteId(id: string) {
  if (id !== RECEIPT_STATIC_SEGMENT) {
    return id;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
}
