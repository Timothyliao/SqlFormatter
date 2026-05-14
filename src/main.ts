import { Formatter } from './formatter/Formatter';
import { Highlighter } from './highlighter/Highlighter';
import { InputPanel } from './ui/InputPanel';
import { PreviewPanel } from './ui/PreviewPanel';
import { ConfigPanel } from './ui/ConfigPanel';
import { CopyButton } from './ui/CopyButton';
import { AppController } from './controller/AppController';
import { ResizableDivider } from './ui/ResizableDivider';
import { ThemeToggle } from './ui/ThemeToggle';
import { HistoryPanel } from './ui/HistoryPanel';
import { SaveButton } from './ui/SaveButton';
import { EvolutionWidget } from './fun/EvolutionWidget';
import { EasterEgg } from './fun/EasterEgg';
import { EggBook } from './fun/EggBook';

function main(): void {
  const inputContainer = document.getElementById('input-panel');
  const previewContainer = document.getElementById('preview-panel');
  const configContainer = document.getElementById('config-panel');
  const copyContainer = document.getElementById('copy-button');
  const saveContainer = document.getElementById('save-button');
  const dividerEl = document.getElementById('panel-divider');
  const themeContainer = document.getElementById('theme-toggle');
  const historyContainer = document.getElementById('history-panel');
  const leftPanelEl = document.querySelector('.panel-input') as HTMLElement | null;
  const rightPanelEl = document.querySelector('.panel-preview') as HTMLElement | null;
  const layoutEl = document.querySelector('.app-layout') as HTMLElement | null;

  if (!inputContainer || !previewContainer || !configContainer || !copyContainer) {
    console.error('Required DOM elements not found. Check index.html.');
    return;
  }

  // Instantiate core modules
  const formatter = new Formatter();
  const highlighter = new Highlighter();

  // Instantiate UI components
  const inputPanel = new InputPanel(inputContainer);
  const previewPanel = new PreviewPanel(previewContainer);
  const configPanel = new ConfigPanel(configContainer);
  new CopyButton(copyContainer, previewPanel);

  // Theme toggle
  if (themeContainer) {
    const themeToggle = new ThemeToggle(themeContainer);
    themeToggle.onThemeChange((theme) => inputPanel.setTheme(theme));
    inputPanel.setTheme(themeToggle.getTheme());
  }

  // Document panel
  let historyPanel: HistoryPanel | undefined;
  if (historyContainer) {
    historyPanel = new HistoryPanel(historyContainer);
  }

  // Save button
  let saveButton: SaveButton | undefined;
  if (saveContainer) {
    saveButton = new SaveButton(saveContainer);
  }

  // Fun mode: evolution widget + easter eggs
  const evolutionWidget = new EvolutionWidget();
  const easterEgg = new EasterEgg(evolutionWidget);
  new EggBook(easterEgg);

  // Wire everything together
  const controller = new AppController(
    inputPanel,
    previewPanel,
    configPanel,
    formatter,
    highlighter,
    historyPanel,
    saveButton,
    evolutionWidget,
    easterEgg,
  );

  controller.init();

  // Resizable divider (desktop only)
  if (dividerEl && leftPanelEl && rightPanelEl && layoutEl) {
    new ResizableDivider(dividerEl, leftPanelEl, rightPanelEl, layoutEl);
  }
}

main();
