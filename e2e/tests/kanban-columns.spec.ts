import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Kanban Board Columns", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load the board columns and verify default ones", async ({ page }) => {
    // Navigate to workspaces page
    await page.goto("/workspaces");
    
    // Click on the workspace card (Acme Support)
    const workspaceCard = page.getByRole("heading", { name: "Acme Support" });
    await expect(workspaceCard).toBeVisible();
    await workspaceCard.click();

    // Verify workspace detail page loaded and show Board link
    await expect(page).toHaveURL(/\/workspaces\/[a-f0-9-]+/);
    const boardLink = page.getByRole("link", { name: "Engineering Tasks" });
    await expect(boardLink).toBeVisible();
    await boardLink.click();

    // Verify board page loaded
    await expect(page).toHaveURL(/\/boards\/[a-f0-9-]+/);
    await expect(page.getByRole("heading", { name: "Engineering Tasks" })).toBeVisible();

    // Verify the three default columns are visible
    await expect(page.getByText("Backlog", { exact: true })).toBeVisible();
    await expect(page.getByText("In Progress", { exact: true })).toBeVisible();
    await expect(page.getByText("Done", { exact: true })).toBeVisible();
  });

  test("should allow creating a new custom column", async ({ page }) => {
    // Navigate to workspaces page
    await page.goto("/workspaces");
    await page.getByRole("heading", { name: "Acme Support" }).click();
    await page.getByRole("link", { name: "Engineering Tasks" }).click();

    // Click on Add Column button
    const addColumnBtn = page.getByRole("button", { name: "Add Column" });
    await expect(addColumnBtn).toBeVisible();
    await addColumnBtn.click();

    // Fill in input and submit
    const input = page.getByPlaceholder("Column name...");
    await expect(input).toBeVisible();
    await input.fill("QA Review");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Verify the new column is visible
    await expect(page.getByText("QA Review", { exact: true })).toBeVisible();
  });

  test("should show safeguard warning when deleting a non-empty column and allow transferring tasks", async ({ page }) => {
    // Navigate to board
    await page.goto("/workspaces");
    await page.getByRole("heading", { name: "Acme Support" }).click();
    await page.getByRole("link", { name: "Engineering Tasks" }).click();

    // Verify 'In Progress' column has tasks (should be visible)
    const inProgressColumn = page.locator('div[data-column-name="In Progress"]');
    const inProgressHeader = inProgressColumn;
    
    // Find the actions menu (three dots) inside the column header
    const actionsBtn = inProgressHeader.getByTitle("Column actions");
    await expect(actionsBtn).toBeVisible();
    await actionsBtn.click();

    // Click on Delete Column action
    const deleteOption = page.getByRole("button", { name: "Delete Column", exact: true });
    await expect(deleteOption).toBeVisible();
    await deleteOption.click();

    // Verify the delete dialog is visible
    const dialogTitle = page.getByRole("heading", { name: /Delete Column: In Progress/i });
    await expect(dialogTitle).toBeVisible();

    // Verify safeguard alert is visible
    await expect(page.getByText("This column contains 1 task(s).")).toBeVisible();

    // Choose 'Move tasks to another column'
    const moveRadio = page.locator("input[type='radio']").first();
    await expect(moveRadio).toBeChecked(); // move is checked by default

    // Open target column dropdown and select 'Backlog'
    const selectTrigger = page.getByRole("combobox");
    await selectTrigger.click();
    
    // Click Backlog item in dropdown list
    const backlogOption = page.getByRole("option", { name: "Backlog" });
    await backlogOption.click();

    // Confirm deletion
    const confirmDeleteBtn = page.getByRole("button", { name: "Delete Column", exact: true });
    await confirmDeleteBtn.click();

    // Verify dialog closes and In Progress column is gone
    await expect(dialogTitle).not.toBeVisible();
    await expect(page.getByText("In Progress", { exact: true })).not.toBeVisible();

    // Verify that the task that was in "In Progress" (e.g. "Implement CSV Export feature" or similar) is preserved on the board
    // In seed-db.ts, Task 1 is high priority (Backlog), Task 2 is standalone (In Progress)
    // Task 2 title is: "Fix Stripe webhook signature mismatch"
    await expect(page.getByText("Fix Stripe webhook signature mismatch")).toBeVisible();
  });
});
