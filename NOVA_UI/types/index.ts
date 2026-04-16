export type AppDefinition = {
  name: string;
  description: string;
  href: string;
  badge?: string;
};

export type AuthUser = {
  userId: string;
  homeId: string;
  email: string;
  displayName?: string;
  isHomeAdmin: boolean;
  isActive?: boolean;
};

export type AuthSession = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: AuthUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterHomePayload = LoginCredentials & {
  homeName: string;
  displayName?: string;
};

export type Ingredient = {
  name: string;
  amount?: string;
  unit?: string;
  note?: string;
};

export type RecipeStep = {
  title?: string;
  instruction: string;
};

export type RecipeSummary = {
  id: string;
  title: string;
  description: string;
  ingredientsCount?: number;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
};

export type Recipe = RecipeSummary & {
  ingredients: Ingredient[];
  steps: RecipeStep[];
};

export type RecipeDraft = {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
};

export type ReceiptDiscount = {
  discountId?: string;
  label: string;
  amount: string;
};

export type ReceiptItem = {
  itemId?: string;
  lineNumber?: number;
  itemName: string;
  quantity: string;
  unitPriceAmount?: string;
  grossAmount: string;
  discountAmount: string;
  totalAmount: string;
  discounts: ReceiptDiscount[];
};

export type ReceiptSummary = {
  id: string;
  storeName: string;
  invoiceNumber?: string;
  receiptDate: string;
  city?: string;
  state?: string;
  scanLocation?: string;
  currencyCode: string;
  totalAmount: string;
  updatedAt: string;
};

export type Receipt = ReceiptSummary & {
  subtotalAmount: string;
  receiptDiscountTotal: string;
  taxAmount: string;
  createdAt: string;
  receiptDiscounts: ReceiptDiscount[];
  items: ReceiptItem[];
};

export type ReceiptDraft = {
  storeName: string;
  invoiceNumber?: string;
  receiptDate: string;
  city?: string;
  state?: string;
  scanLocation?: string;
  currencyCode: string;
  subtotalAmount: string;
  receiptDiscountTotal: string;
  taxAmount: string;
  totalAmount: string;
  receiptDiscounts: ReceiptDiscount[];
  items: ReceiptItem[];
};

export type SpendPoint = {
  date: string;
  total: number;
};

export type CategorySpend = {
  category: string;
  total: number;
};

export type Analytics = {
  totalSpendOverTime: SpendPoint[];
  spendByCategory: CategorySpend[];
};
