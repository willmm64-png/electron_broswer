import type { VaultEntry } from '@/shared/types';

export class AutoFill {
  private enabled = true;

  detectLoginForm(_pageUrl: string): { formId: string; usernameField: string; passwordField: string; url: string } | null {
    return { formId: 'form', usernameField: 'input[type="email"],input[type="text"]', passwordField: 'input[type="password"]', url: _pageUrl };
  }

  async fillForm(scriptTarget: { executeJavaScript: (code: string) => Promise<unknown> }, entry: VaultEntry): Promise<void> {
    const username = entry.username.replace(/'/g, "\\'");
    const password = entry.password.replace(/'/g, "\\'");
    await scriptTarget.executeJavaScript(`
      const user = document.querySelector('input[type="email"],input[type="text"]');
      const pass = document.querySelector('input[type="password"]');
      if (user) user.value = '${username}';
      if (pass) pass.value = '${password}';
    `);
  }

  setAutoFillEnabled(enabled: boolean): void { this.enabled = enabled; }
  isAutoFillEnabled(): boolean { return this.enabled; }
}
