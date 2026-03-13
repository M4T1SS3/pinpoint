import * as vscode from 'vscode';

type PickerState = 'idle' | 'starting' | 'active';

export class StatusBarManager {
  private mainStatus: vscode.StatusBarItem;
  private modeStatus: vscode.StatusBarItem;
  private screenshotStatus: vscode.StatusBarItem;

  constructor() {
    this.mainStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.mainStatus.name = 'PinPoint Status';

    this.modeStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.modeStatus.name = 'PinPoint Mode';

    this.screenshotStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      98
    );
    this.screenshotStatus.name = 'PinPoint Screenshot';

    this.initializeDefaults();
  }

  private initializeDefaults() {
    this.mainStatus.text = '$(target) PinPoint';
    this.mainStatus.command = 'pinpoint.startPicker';
    this.mainStatus.tooltip = 'Click to start element picker';
    this.mainStatus.color = '#00ff88'; // Neon green

    this.updateModeIndicator('Quick Fix');
    this.updateScreenshotIndicator(false);
  }

  show() {
    this.mainStatus.show();
    this.modeStatus.show();
    this.screenshotStatus.show();
  }

  hide() {
    this.mainStatus.hide();
    this.modeStatus.hide();
    this.screenshotStatus.hide();
  }

  update(state: PickerState, text: string) {
    this.mainStatus.text = text;
    if (state === 'active') {
      this.mainStatus.command = 'pinpoint.stopPicker';
      this.mainStatus.tooltip = 'Click to stop picker (Esc to cancel)';
      this.mainStatus.color = '#39ff14'; // Bright neon green when active
      this.mainStatus.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.mainStatus.command = 'pinpoint.startPicker';
      this.mainStatus.tooltip = 'Click to start element picker';
      this.mainStatus.color = '#00ff88'; // Softer neon green when idle
      this.mainStatus.backgroundColor = undefined;
    }
  }

  updateModeIndicator(mode: string) {
    const modeLabel = mode.replace('-', ' ');
    this.modeStatus.text = `$(layers) ${modeLabel}`;
    this.modeStatus.command = 'pinpoint.setMode';
    this.modeStatus.tooltip = `Current mode: ${mode}`;
    this.modeStatus.color = '#00ff88'; // Neon green
  }

  updateScreenshotIndicator(enabled: boolean) {
    this.screenshotStatus.text = enabled
      ? '$(image) Screenshot ON'
      : '$(circle-outline) Screenshot OFF';
    this.screenshotStatus.command = 'pinpoint.toggleScreenshot';
    this.screenshotStatus.tooltip = `Screenshots ${enabled ? 'enabled' : 'disabled'}`;
    this.screenshotStatus.color = enabled ? '#39ff14' : '#00ff88'; // Brighter when enabled
  }

  dispose() {
    this.mainStatus.dispose();
    this.modeStatus.dispose();
    this.screenshotStatus.dispose();
  }
}
