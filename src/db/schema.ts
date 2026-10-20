import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const localeEnum = pgEnum("locale", ["en", "fr"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "member"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  locale: localeEnum("locale"),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  // sha256 of the cookie token, never the token itself
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const passwordResets = pgTable(
  "password_resets",
  {
    id: id(),
    // sha256 of the emailed token, never the token itself
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("password_resets_user_idx").on(t.userId)],
);

export const kitchens = pgTable("kitchens", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const kitchenMembers = pgTable(
  "kitchen_members",
  {
    kitchenId: uuid("kitchen_id")
      .notNull()
      .references(() => kitchens.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
  },
  (t) => [primaryKey({ columns: [t.kitchenId, t.userId] })],
);

export const kitchenInvites = pgTable(
  "kitchen_invites",
  {
    id: id(),
    // sha256 of the link token, never the token itself
    tokenHash: text("token_hash").notNull().unique(),
    kitchenId: uuid("kitchen_id")
      .notNull()
      .references(() => kitchens.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("kitchen_invites_kitchen_idx").on(t.kitchenId)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })],
);

export const recipes = pgTable(
  "recipes",
  {
    id: id(),
    kitchenId: uuid("kitchen_id")
      .notNull()
      .references(() => kitchens.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    servings: integer("servings"),
    prepMinutes: integer("prep_minutes"),
    cookMinutes: integer("cook_minutes"),
    shareToken: text("share_token").unique(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recipes_kitchen_idx").on(t.kitchenId)],
);

export const ingredients = pgTable(
  "ingredients",
  {
    id: id(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    quantity: doublePrecision("quantity"),
    unit: text("unit").notNull().default(""),
    name: text("name").notNull(),
  },
  (t) => [index("ingredients_recipe_idx").on(t.recipeId)],
);

export const steps = pgTable(
  "steps",
  {
    id: id(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("steps_recipe_idx").on(t.recipeId)],
);

/** Ingredients a user has ticked off on a recipe. Editing the recipe recreates its ingredients, which clears these. */
export const ingredientChecks = pgTable(
  "ingredient_checks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ingredientId] })],
);

/** One row each time a user cooks a recipe. */
export const recipeCooks = pgTable(
  "recipe_cooks",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    cookedAt: timestamp("cooked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recipe_cooks_user_recipe_idx").on(t.userId, t.recipeId)],
);

export const tags = pgTable(
  "tags",
  {
    id: id(),
    kitchenId: uuid("kitchen_id")
      .notNull()
      .references(() => kitchens.id, { onDelete: "cascade" }),
    /** As written, with accents and spaces ("Plat principal"). */
    name: text("name").notNull(),
    /**
     * `tagSlug(name)` ("plat-principal"): identifies the tag in a kitchen and in URLs.
     * Always set by the app; null only for tags created before slugs, until setup fills them in.
     */
    slug: text("slug"),
  },
  (t) => [uniqueIndex("tags_kitchen_slug_idx").on(t.kitchenId, t.slug)],
);

export const recipeTags = pgTable(
  "recipe_tags",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.tagId] })],
);

export const photos = pgTable(
  "photos",
  {
    id: id(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    fileName: text("file_name").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: createdAt(),
  },
  (t) => [index("photos_recipe_idx").on(t.recipeId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(kitchenMembers),
}));

export const kitchensRelations = relations(kitchens, ({ many }) => ({
  members: many(kitchenMembers),
  recipes: many(recipes),
  tags: many(tags),
}));

export const kitchenMembersRelations = relations(kitchenMembers, ({ one }) => ({
  kitchen: one(kitchens, { fields: [kitchenMembers.kitchenId], references: [kitchens.id] }),
  user: one(users, { fields: [kitchenMembers.userId], references: [users.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  kitchen: one(kitchens, { fields: [recipes.kitchenId], references: [kitchens.id] }),
  ingredients: many(ingredients),
  steps: many(steps),
  photos: many(photos),
  recipeTags: many(recipeTags),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, { fields: [ingredients.recipeId], references: [recipes.id] }),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  recipe: one(recipes, { fields: [steps.recipeId], references: [recipes.id] }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  recipe: one(recipes, { fields: [photos.recipeId], references: [recipes.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  kitchen: one(kitchens, { fields: [tags.kitchenId], references: [kitchens.id] }),
  recipeTags: many(recipeTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeTags.recipeId], references: [recipes.id] }),
  tag: one(tags, { fields: [recipeTags.tagId], references: [tags.id] }),
}));

export type User = typeof users.$inferSelect;
export type Kitchen = typeof kitchens.$inferSelect;
export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type Locale = (typeof localeEnum.enumValues)[number];
