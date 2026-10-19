import { expect, test } from "@playwright/test";

// Needs a running database seeded with the super admin from ADMIN_EMAIL / ADMIN_PASSWORD.
const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.ADMIN_PASSWORD ?? "admin1234";

test.use({ locale: "en-US" });

test("sign in, create a kitchen and a recipe, scale and share it", async ({ page, browser }, info) => {
  const suffix = `${info.project.name}-${Date.now()}`;

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();

  // Super admin creates a kitchen they own.
  await page.goto("/admin");
  await page.getByLabel("Name", { exact: true }).last().fill(`Kitchen ${suffix}`);
  await page.getByLabel("Owner").selectOption({ label: `Admin (${email})` });
  await page.getByRole("button", { name: "Create kitchen" }).click();
  await expect(page.getByRole("link", { name: `Kitchen ${suffix}` })).toBeVisible();
  await page.getByRole("link", { name: `Kitchen ${suffix}` }).click();
  await expect(page).toHaveURL(/\/kitchens\/[0-9a-f-]+$/);
  const kitchenUrl = page.url();

  // New recipe.
  await page.getByRole("link", { name: "New recipe" }).click();
  await page.getByLabel("Title").fill(`Pancakes ${suffix}`);
  await page.getByLabel("Guests").fill("2");
  await page.getByLabel("Prep (min)").fill("10");
  await page.locator("#tag-input").fill("breakfast");
  await page.locator("#tag-input").press("Enter");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("Qty").fill("1");
  await page.getByLabel("Unit").fill("cup");
  await page.getByLabel("Ingredient", { exact: true }).fill("flour");
  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByLabel("Step 1").fill("Mix and cook.");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: `Pancakes ${suffix}` })).toBeVisible();
  await expect(page.getByText("1 cup")).toBeVisible();

  // Guest scaler: 2 → 1 guest halves the flour.
  await page.getByRole("button", { name: "Fewer guests" }).click();
  await expect(page.getByText("½ cup")).toBeVisible();

  // Ticked ingredients are saved for this user until reset.
  const flour = page.getByRole("checkbox", { name: /flour/ });
  const saved = () => page.waitForResponse((r) => r.request().method() === "POST" && r.url() === page.url());
  await Promise.all([saved(), flour.check({ force: true })]);
  await expect(page.getByText("1/1")).toBeVisible();
  await page.reload();
  await expect(flour).toBeChecked();
  await Promise.all([saved(), page.getByRole("button", { name: "Reset" }).click()]);
  await expect(flour).not.toBeChecked();
  await page.reload();
  await expect(flour).not.toBeChecked();

  // "I made it": counted per user, unticks the ingredients, then offers to add a photo.
  await Promise.all([saved(), flour.check({ force: true })]);
  await page.getByRole("button", { name: "I made it!" }).click();
  await expect(page.getByRole("dialog", { name: "Bon appétit!" })).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByText(/^Made once · last on /)).toBeVisible();
  await expect(flour).not.toBeChecked();
  await page.reload();
  await expect(flour).not.toBeChecked();
  await page.getByRole("button", { name: "I made it!" }).click();
  await page.getByRole("button", { name: "Add a photo" }).click();
  await expect(page).toHaveURL(/\/edit#photos$/);
  await page.goBack();
  await expect(page.getByText(/^Made 2 times · last on /)).toBeVisible();

  // Favorite: starred on the recipe, shown on its card in the kitchen.
  await page.getByRole("button", { name: "Favorite" }).click();
  await expect(page.getByRole("button", { name: "Favorite" })).toHaveAttribute("aria-pressed", "true");
  const recipeUrl = page.url();
  await page.goto(kitchenUrl);
  await expect(page.getByRole("button", { name: "Favorite" })).toHaveAttribute("aria-pressed", "true");
  await page.goto(recipeUrl);

  // A tag on the recipe lists the kitchen's recipes with that tag.
  await page.getByRole("link", { name: "breakfast", exact: true }).click();
  await expect(page).toHaveURL(/\/kitchens\/[0-9a-f-]+\?tag=breakfast$/);
  await expect(page.getByText(`Pancakes ${suffix}`)).toBeVisible();
  await page.goto(recipeUrl);

  // Picking a suggested tag while typing adds that tag, not the half-typed text.
  await page.goto(recipeUrl + "/edit");
  await page.getByRole("button", { name: "Remove tag breakfast" }).click();
  await page.locator("#tag-input").fill("brea");
  await page.getByRole("button", { name: "+ breakfast" }).click();
  await expect(page.getByRole("button", { name: "Remove tag breakfast" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove tag brea", exact: true })).toHaveCount(0);
  await expect(page.locator("#tag-input")).toHaveValue("");
  // Tags keep their spelling; the same tag typed differently isn't added twice.
  await page.locator("#tag-input").fill("Petit Déjeuner");
  await page.locator("#tag-input").press("Enter");
  await page.locator("#tag-input").fill("petit-dejeuner");
  await page.locator("#tag-input").press("Enter");
  await expect(page.getByRole("button", { name: /^Remove tag / })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Remove tag Petit Déjeuner" })).toBeVisible();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await page.getByRole("link", { name: "Petit Déjeuner", exact: true }).click();
  await expect(page).toHaveURL(/\?tag=petit-dejeuner$/);
  await expect(page.getByRole("button", { name: /Petit Déjeuner/ })).toHaveAttribute("aria-pressed", "true");
  await page.goto(recipeUrl);

  // Public link works without an account.
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Create a public link" }).click();
  const shareUrl = new URL(await page.getByRole("dialog").getByRole("textbox").inputValue());
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  const res = await guestPage.goto(new URL(shareUrl.pathname, page.url()).toString());
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(guestPage.getByRole("heading", { name: `Pancakes ${suffix}` })).toBeVisible();
  await guest.close();

  // Invite link: a newcomer creates an account and joins; the link then stops working.
  await page.goto(kitchenUrl + "/settings");
  await page.getByRole("button", { name: "Create an invite link" }).click();
  const inviteUrl = new URL(await page.getByRole("textbox", { name: "Invite link" }).inputValue());
  const invitePath = inviteUrl.pathname;
  const newcomer = await browser.newContext();
  const newcomerPage = await newcomer.newPage();
  const inviteRes = await newcomerPage.goto(invitePath);
  expect(inviteRes?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(newcomerPage.getByRole("heading", { name: `Join “Kitchen ${suffix}”` })).toBeVisible();
  await newcomerPage.getByLabel("Your name").fill("Newcomer");
  await newcomerPage.getByLabel("Email").fill(`newcomer-${suffix}@test.local`);
  await newcomerPage.getByLabel("Password").fill("newcomer-pass");
  await newcomerPage.getByRole("button", { name: "Create my account and join" }).click();
  await expect(newcomerPage).toHaveURL(kitchenUrl);
  await expect(newcomerPage.getByText(`Pancakes ${suffix}`)).toBeVisible();
  await newcomer.close();

  const late = await browser.newContext();
  const latePage = await late.newPage();
  await latePage.goto(invitePath);
  await expect(latePage.getByRole("heading", { name: "Link no longer valid" })).toBeVisible();
  await late.close();
});
