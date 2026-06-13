export type AppDefinition = {
  name: string;
  description: string;
  href: string;
  badge?: string;
};

export type AuthUser = {
  userId: string;
  homeId: string;
  homeName: string;
  loginName: string;
  displayName?: string;
  password?: string;
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
  homeName: string;
  loginName: string;
  password?: string;
};

export type RegisterHomePayload = LoginCredentials & {
  displayName?: string;
};

export type UserDraft = {
  loginName: string;
  displayName?: string;
  password?: string;
  isActive: boolean;
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

export type BowelStatus =
  | "constipated"
  | "normal"
  | "loose"
  | "urgent"
  | "incomplete"
  | "other";

export type BowelMovementDraft = {
  occurredOn: string;
  bristolType: number;
  status: BowelStatus;
  color?: string;
  painLevel: number;
  bloodPresent: boolean;
  notes?: string;
};

export type BowelMovement = BowelMovementDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type BowelAnalysisStats = {
  entryCount: number;
  daysLogged: number;
  constipationPatternCount: number;
  looseStoolPatternCount: number;
  bloodPresentCount: number;
  highPainCount: number;
  urgentAttentionRecommended: boolean;
};

export type BowelAnalysis = {
  stats: BowelAnalysisStats;
  headline: string;
  overview: string;
  patterns: string[];
  suggestions: string[];
  seekCare: string[];
  disclaimer: string;
};

export type MovieRating = {
  userId: string;
  userName: string;
  rating: number;
  updatedAt: string;
};

export type MovieSummary = {
  id: string;
  title: string;
  year?: number;
  releaseDate?: string;
  posterUrl?: string;
  posterPath?: string;
  overview?: string;
  averageRating?: number;
  currentUserRating?: number;
  ratingCount: number;
};

export type Movie = MovieSummary & {
  tmdbId?: number;
  source: "tmdb" | "manual";
  originalTitle?: string;
  runtimeMinutes?: number;
  backdropUrl?: string;
  backdropPath?: string;
  tmdbVoteAverage?: number;
  tmdbVoteCount?: number;
  genres: string[];
  creator?: {
    userId?: string;
    name?: string;
  };
  ratings: MovieRating[];
  createdAt?: string;
  updatedAt?: string;
};

export type TMDBMovieSearchResult = {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  releaseDate?: string;
  year?: number;
  posterUrl?: string;
  backdropUrl?: string;
  tmdbVoteAverage?: number;
  tmdbVoteCount?: number;
};

export type ManualMovieDraft = {
  title: string;
  year?: number;
  overview?: string;
  runtimeMinutes?: number;
  genres?: string[];
  posterPath?: string;
  initialRating?: number;
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
