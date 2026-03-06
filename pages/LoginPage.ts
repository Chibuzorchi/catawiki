import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  private readonly signInButton: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly profileMenu: Locator;
  private readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Homepage "Sign in" button (there are multiple — target the header one)
    this.signInButton = page.getByRole('button', { name: 'Sign in' }).first();

    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.locator('button[type="submit"]').filter({ hasText: 'Sign in' });

    this.profileMenu = page.getByTestId('display-username');
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
  }

  async clickSignIn(): Promise<void> {
    await this.signInButton.click();
    await this.emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.clickSignIn();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();

    // Profile menu only appears post-login
    await this.profileMenu.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async signOut(): Promise<void> {
    await this.profileMenu.click();
    await this.signOutButton.waitFor({ state: 'visible', timeout: 5_000 });
    await this.signOutButton.click();

    // Sign in button only appears post-logout
    await this.signInButton.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.profileMenu.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
}
