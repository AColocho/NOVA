import axios, { AxiosError } from "axios";

import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  redirectToLogin,
  storeAuthSession,
} from "@/lib/auth";
import type {
  AuthSession,
  AuthUser,
  Ingredient,
  LoginCredentials,
  RegisterHomePayload,
  Receipt,
  ReceiptDiscount,
  ReceiptDraft,
  ReceiptItem,
  ReceiptSummary,
  Recipe,
  RecipeDraft,
  RecipeStep,
  RecipeSummary,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken();

  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

type RequestOptions = {
  signal?: AbortSignal;
};

type PaginationOptions = RequestOptions & {
  offset?: number;
  limit?: number;
};

type RetriableRequestConfig = {
  _retry?: boolean;
};

const AUTH_API_PREFIX = "/api/v1/auth";
const RECIPE_API_PREFIX = "/api/v1/recipe";
const RECEIPT_API_PREFIX = "/api/v1/receipt";
let refreshRequest: Promise<string> | null = null;

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function normalizeIngredient(value: unknown): Ingredient {
  if (typeof value === "string") {
    return { name: value };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      name: toText(record.name ?? record.item, "Unnamed ingredient"),
      amount:
        typeof record.amount === "number"
          ? String(record.amount)
          : toText(record.amount),
      unit: toText(record.unit),
      note: toText(record.note),
    };
  }

  return { name: "Unnamed ingredient" };
}

function normalizeStep(value: unknown, index: number): RecipeStep {
  if (typeof value === "string") {
    return { instruction: value };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      title: toText(record.title),
      instruction: toText(
        record.instruction ?? record.step ?? record.description,
        `Step ${index + 1}`,
      ),
    };
  }

  return { instruction: `Step ${index + 1}` };
}

function normalizeRecipeSummary(value: unknown): RecipeSummary {
  const record = (value ?? {}) as Record<string, unknown>;
  const ingredients = Array.isArray(record.ingredients) ? record.ingredients : [];

  return {
    id: String(record.id ?? record.recipe_id ?? ""),
    title: toText(record.title ?? record.name, "Untitled recipe"),
    description: toText(
      record.description ?? record.summary,
      "No description added yet.",
    ),
    ingredientsCount: toNumber(
      record.ingredients_count ?? record.ingredient_count ?? ingredients.length,
    ),
    prepTime: toOptionalNumber(record.prep_time),
    cookTime: toOptionalNumber(record.cook_time),
    servings: toOptionalNumber(record.servings),
  };
}

function normalizeRecipe(value: unknown): Recipe {
  const record = (value ?? {}) as Record<string, unknown>;
  const summary = normalizeRecipeSummary(record);
  const ingredients = Array.isArray(record.ingredients)
    ? record.ingredients.map(normalizeIngredient)
    : [];
  const steps = Array.isArray(record.steps)
    ? record.steps.map(normalizeStep)
    : Array.isArray(record.instructions)
      ? record.instructions.map(normalizeStep)
      : [];

  return {
    ...summary,
    ingredients,
    steps,
  };
}

function normalizeReceiptDiscount(value: unknown): ReceiptDiscount {
  const record = (value ?? {}) as Record<string, unknown>;

  return {
    discountId: toText(record.discount_id),
    label: toText(record.label, "Discount"),
    amount: toText(record.amount, "0.00"),
  };
}

function normalizeReceiptItem(value: unknown): ReceiptItem {
  const record = (value ?? {}) as Record<string, unknown>;
  const discounts = Array.isArray(record.discounts)
    ? record.discounts.map(normalizeReceiptDiscount)
    : [];

  return {
    itemId: toText(record.item_id),
    lineNumber: toOptionalNumber(record.line_number),
    itemName: toText(record.item_name, "Unnamed item"),
    quantity: toText(record.quantity, "1"),
    unitPriceAmount: toText(record.unit_price_amount),
    grossAmount: toText(record.gross_amount, "0.00"),
    discountAmount: toText(record.discount_amount, "0.00"),
    totalAmount: toText(record.total_amount, "0.00"),
    discounts,
  };
}

function normalizeReceiptSummary(value: unknown): ReceiptSummary {
  const record = (value ?? {}) as Record<string, unknown>;

  return {
    id: toText(record.receipt_id ?? record.id),
    storeName: toText(record.store_name, "Unknown store"),
    invoiceNumber: toText(record.invoice_number),
    receiptDate: toText(record.receipt_date),
    city: toText(record.city),
    state: toText(record.state),
    scanLocation: toText(record.scan_location),
    currencyCode: toText(record.currency_code, "USD"),
    totalAmount: toText(record.total_amount, "0.00"),
    updatedAt: toText(record.updated_at),
  };
}

function normalizeReceipt(value: unknown): Receipt {
  const record = (value ?? {}) as Record<string, unknown>;
  const summary = normalizeReceiptSummary(record);
  const receiptDiscounts = Array.isArray(record.receipt_discounts)
    ? record.receipt_discounts.map(normalizeReceiptDiscount)
    : [];
  const items = Array.isArray(record.items)
    ? record.items.map(normalizeReceiptItem)
    : [];

  return {
    ...summary,
    subtotalAmount: toText(record.subtotal_amount, "0.00"),
    receiptDiscountTotal: toText(record.receipt_discount_total, "0.00"),
    taxAmount: toText(record.tax_amount, "0.00"),
    totalAmount: toText(record.total_amount, summary.totalAmount),
    createdAt: toText(record.created_at),
    receiptDiscounts,
    items,
  };
}

function normalizeAuthUser(value: unknown): AuthUser {
  const record = (value ?? {}) as Record<string, unknown>;

  return {
    userId: toText(record.user_id),
    homeId: toText(record.home_id),
    email: toText(record.email),
    displayName: toText(record.display_name) || undefined,
    isHomeAdmin: Boolean(record.is_home_admin),
    isActive:
      typeof record.is_active === "boolean" ? record.is_active : undefined,
  };
}

function normalizeAuthSession(value: unknown): AuthSession {
  const record = (value ?? {}) as Record<string, unknown>;

  return {
    tokenType: toText(record.token_type, "bearer"),
    accessToken: toText(record.access_token),
    refreshToken: toText(record.refresh_token),
    accessTokenExpiresIn: toNumber(record.access_token_expires_in),
    refreshTokenExpiresIn: toNumber(record.refresh_token_expires_in),
    user: normalizeAuthUser(record.user),
  };
}

function buildReceiptRequestPayload(payload: ReceiptDraft) {
  return {
    store_name: payload.storeName,
    invoice_number: payload.invoiceNumber || null,
    receipt_date: payload.receiptDate,
    city: payload.city || null,
    state: payload.state || null,
    scan_location: payload.scanLocation || null,
    currency_code: payload.currencyCode,
    subtotal_amount: payload.subtotalAmount,
    receipt_discount_total: payload.receiptDiscountTotal,
    tax_amount: payload.taxAmount,
    total_amount: payload.totalAmount,
    receipt_discounts: payload.receiptDiscounts.map((discount) => ({
      label: discount.label,
      amount: discount.amount,
    })),
    items: payload.items.map((item) => ({
      item_name: item.itemName,
      quantity: item.quantity,
      unit_price_amount: item.unitPriceAmount || null,
      gross_amount: item.grossAmount,
      discount_amount: item.discountAmount,
      total_amount: item.totalAmount,
      discounts: item.discounts.map((discount) => ({
        label: discount.label,
        amount: discount.amount,
      })),
    })),
  };
}

async function refreshAuthSession() {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    throw new Error("Your session has expired. Please log in again.");
  }

  refreshRequest = axios
    .post(
      `${API_BASE_URL}${AUTH_API_PREFIX}/refresh`,
      { refresh_token: refreshToken },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((response) => {
      const session = normalizeAuthSession(response.data);

      if (!session.accessToken || !session.refreshToken) {
        throw new Error("Your session has expired. Please log in again.");
      }

      storeAuthSession(session);
      return session.accessToken;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const responseStatus = error.response?.status;
    const originalRequest = error.config as typeof error.config &
      RetriableRequestConfig;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthRequest = requestUrl.startsWith(AUTH_API_PREFIX);

    if (
      responseStatus !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    if (!getStoredRefreshToken()) {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const accessToken = await refreshAuthSession();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
    return (
      axiosError.response?.data?.detail ??
      axiosError.response?.data?.message ??
      axiosError.message ??
      "Something went wrong. Please try again."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const { data } = await api.post(`${AUTH_API_PREFIX}/login`, {
    email: credentials.email,
    password: credentials.password,
  });
  const session = normalizeAuthSession(data);
  storeAuthSession(session);
  return session;
}

export async function registerHome(
  payload: RegisterHomePayload,
): Promise<AuthSession> {
  const { data } = await api.post(`${AUTH_API_PREFIX}/create_home`, {
    home_name: payload.homeName,
    email: payload.email,
    password: payload.password,
    display_name: payload.displayName?.trim() || null,
  });
  const session = normalizeAuthSession(data);
  storeAuthSession(session);
  return session;
}

export async function getCurrentUser(options?: RequestOptions): Promise<AuthUser> {
  const { data } = await api.get(`${AUTH_API_PREFIX}/me`, {
    signal: options?.signal,
  });
  return normalizeAuthUser(data);
}

export async function getRecipes(
  options?: PaginationOptions,
): Promise<RecipeSummary[]> {
  const { offset = 0, limit = 20, signal } = options ?? {};
  const { data } = await api.get(`${RECIPE_API_PREFIX}/get_metadata`, {
    params: { offset, limit },
    signal,
  });

  if (!Array.isArray(data?.recipes)) {
    return [];
  }

  return (data.recipes as unknown[])
    .map(normalizeRecipeSummary)
    .filter((recipe: RecipeSummary) => recipe.id.trim().length > 0);
}

export async function getRecipe(
  id: string,
  options?: RequestOptions,
): Promise<Recipe> {
  const { data } = await api.get(`${RECIPE_API_PREFIX}/get_recipe`, {
    params: { recipe_id: id },
    signal: options?.signal,
  });
  return normalizeRecipe(data);
}

export async function createRecipe(
  payload: RecipeDraft,
  options?: RequestOptions,
): Promise<Recipe> {
  const requestPayload = {
    name: payload.title,
    description: payload.description || null,
    prep_time: payload.prepTime ?? null,
    cook_time: payload.cookTime ?? null,
    servings: payload.servings ?? null,
    ingredients: payload.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount || null,
      unit: ingredient.unit || null,
    })),
    steps: payload.steps.map((step) => ({
      instruction: step.instruction,
    })),
  };
  const { data } = await api.post(
    `${RECIPE_API_PREFIX}/create_recipe`,
    requestPayload,
    options,
  );

  const recipeId = toText(data?.recipe_id);

  if (!recipeId) {
    throw new Error("Your recipe was saved, but it could not be opened right away.");
  }

  return getRecipe(recipeId, options);
}

export async function updateRecipe(
  id: string,
  payload: RecipeDraft,
  options?: RequestOptions,
): Promise<Recipe> {
  const requestPayload = {
    recipe_id: id,
    name: payload.title,
    description: payload.description || null,
    prep_time: payload.prepTime ?? null,
    cook_time: payload.cookTime ?? null,
    servings: payload.servings ?? null,
    ingredients: payload.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount || null,
      unit: ingredient.unit || null,
    })),
    steps: payload.steps.map((step) => ({
      instruction: step.instruction,
    })),
  };

  await api.put(`${RECIPE_API_PREFIX}/update_recipe`, requestPayload, options);
  return getRecipe(id, options);
}

export async function createRecipeFromUrl(
  url: string,
  options?: RequestOptions,
): Promise<void> {
  await api.post(
    `${RECIPE_API_PREFIX}/create_recipe_from_url`,
    { url },
    options,
  );
}

export async function getReceipts(
  options?: PaginationOptions,
): Promise<ReceiptSummary[]> {
  const { offset = 0, limit = 20, signal } = options ?? {};
  const { data } = await api.get(`${RECEIPT_API_PREFIX}/get_metadata`, {
    params: { offset, limit },
    signal,
  });

  if (!Array.isArray(data?.receipts)) {
    return [];
  }

  return (data.receipts as unknown[])
    .map(normalizeReceiptSummary)
    .filter((receipt: ReceiptSummary) => receipt.id.trim().length > 0);
}

export async function getReceipt(
  id: string,
  options?: RequestOptions,
): Promise<Receipt> {
  const { data } = await api.get(`${RECEIPT_API_PREFIX}/get_receipt`, {
    params: { receipt_id: id },
    signal: options?.signal,
  });

  return normalizeReceipt(data);
}

export async function createReceipt(
  payload: ReceiptDraft,
  options?: RequestOptions,
): Promise<Receipt> {
  const { data } = await api.post(
    `${RECEIPT_API_PREFIX}/create_receipt`,
    buildReceiptRequestPayload(payload),
    options,
  );

  const receiptId = toText(data?.receipt_id);

  if (!receiptId) {
    throw new Error("Your receipt was saved, but it could not be opened right away.");
  }

  return getReceipt(receiptId, options);
}

export async function updateReceipt(
  id: string,
  payload: ReceiptDraft,
  options?: RequestOptions,
): Promise<Receipt> {
  await api.put(`${RECEIPT_API_PREFIX}/update_receipt`, {
    receipt_id: id,
    ...buildReceiptRequestPayload(payload),
  }, options);

  return getReceipt(id, options);
}

export async function deleteReceipt(
  id: string,
  options?: RequestOptions,
): Promise<void> {
  await api.delete(`${RECEIPT_API_PREFIX}/delete_receipt`, {
    data: { receipt_id: id },
    signal: options?.signal,
  });
}

export async function createReceiptFromScan(
  file: File,
  scanLocation?: string,
  options?: RequestOptions,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  if (scanLocation?.trim()) {
    formData.append("scan_location", scanLocation.trim());
  }

  await api.post(`${RECEIPT_API_PREFIX}/create_receipt_from_scan`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 120000,
    signal: options?.signal,
  });
}
