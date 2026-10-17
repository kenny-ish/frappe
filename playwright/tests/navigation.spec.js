import { test, expect } from "../support";

const pathname = (page) => new URL(page.url()).pathname;

test.describe("Navigation", () => {
	test("Navigate to route with hash in document name", async ({ page, desk, api }) => {
		await page.goto("/desk/website");
		await desk.ready();
		await api.insert_doc(
			"Client Script",
			{
				__newname: "ABC#123",
				dt: "User",
				script: "console.log('ran')",
				enabled: 0,
			},
			true
		);
		await page.goto(`/desk/client-script/${encodeURIComponent("ABC#123")}`);
		await expect(page).toHaveTitle("ABC#123");
		await page.goBack();
		await expect(page).toHaveTitle("Website");
	});

	test("Navigate to previous page after login", async ({ page, desk }) => {
		await page.goto("/desk/todo");
		await expect(
			page.locator(".page-head").getByTitle("To Do", { exact: true })
		).toBeVisible();
		await desk.clear_filters();
		await desk.logout();
		await page.reload();
		await page.getByRole("button", { name: "Continue", exact: true }).click();
		await expect.poll(() => pathname(page)).toBe("/login");
		await desk.login();
		await page.goto("/desk/todo");
		await expect.poll(() => pathname(page)).toMatch(/\/todo$/);
	});

	test("does not treat logout as session expiry", async ({ page }) => {
		await page.goto("/desk/todo");
		await expect(
			page.locator(".page-head").getByTitle("To Do", { exact: true })
		).toBeVisible();

		const result = await page.evaluate(() => {
			const original_confirm = frappe.confirm;
			const original_call = frappe.call;
			const original_redirect = frappe.app.redirect_to_login;

			frappe.confirm = (_message, confirm_action) => confirm_action();
			frappe.call = ({ callback }) => callback({});
			frappe.app.redirect_to_login = () => undefined;
			frappe.app.logout();
			document.cookie = "user_id=Guest; path=/";

			const during_logout = frappe.request.is_session_expired();
			frappe.app.logging_out = false;
			const after_logout = frappe.request.is_session_expired();

			frappe.confirm = original_confirm;
			frappe.call = original_call;
			frappe.app.redirect_to_login = original_redirect;
			return { during_logout, after_logout };
		});

		expect(result).toEqual({ during_logout: false, after_logout: true });
	});
});
