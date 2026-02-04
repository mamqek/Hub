import { Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CalculatorSettings, CalculatorSettingsService } from '../../../../services/calculator-settings.service';
import { SessionStoreService } from '../../../../services/session-store.service';
import { CalculatorHistoryService, RecipeHistoryEntry } from '../../../../services/calculator-history.service';

export type SettingsDialogCategory = 'colors' | 'history' | 'importExport';
export interface SettingsDialogData {
    initialCategory?: SettingsDialogCategory;
    historyEntries?: RecipeHistoryEntry[];
    currentBoardEntry?: RecipeHistoryEntry | null;
}
export interface SettingsDialogCloseResult {
    loadHistoryId?: string;
}

const SETTINGS_DRAFT_STORE_KEY = 'calculator.settings.draft';

@Component({
    selector: 'settings-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule],
    templateUrl: './settings-dialog.component.html',
    styleUrl: './settings-dialog.component.scss',
})
export class SettingsDialogComponent implements OnDestroy {
    activeCategory: SettingsDialogCategory = 'colors';
    settings: CalculatorSettings;
    private finalized = false;
    historyEntries: RecipeHistoryEntry[] = [];
    settingsCategoryKeys: string[] = [];
    exportSelection: Record<string, boolean> = {};
    importError = '';
    readonly historyExportKey = 'history';

    @ViewChild('importFileInput') importFileInput?: ElementRef<HTMLInputElement>;

    readonly resourceColorKeys = [
        'iron', 'copper', 'caterium', 'coal', 'limestone', 'quartz', 'sulfur', 'bauxite', 'uranium', 'sam', 'water', 'nitrogen', 'oil', 'default'
    ];

    constructor(
        private dialogRef: MatDialogRef<SettingsDialogComponent>,
        private settingsService: CalculatorSettingsService,
        private historyService: CalculatorHistoryService,
        private sessionStore: SessionStoreService,
        @Inject(MAT_DIALOG_DATA) public data: SettingsDialogData | null
    ) {
        const defaults = this.settingsService.getSettings();
        const draft = this.sessionStore.get<CalculatorSettings>(SETTINGS_DRAFT_STORE_KEY, defaults);
        this.settings = this.mergeWithDefaults(defaults, draft);
        this.activeCategory = data?.initialCategory || 'colors';
        this.historyEntries = Array.isArray(data?.historyEntries) ? data.historyEntries : [];
        this.settingsCategoryKeys = Object.keys(this.settings || {});
        for (const key of this.settingsCategoryKeys) {
            this.exportSelection[this.toSettingsExportKey(key)] = true;
        }
        this.exportSelection[this.historyExportKey] = true;
    }

    apply(): void {
        this.settingsService.setSettings(this.settings);
        this.sessionStore.remove(SETTINGS_DRAFT_STORE_KEY);
        this.finalized = true;
        this.dialogRef.close();
    }

    cancel(): void {
        this.sessionStore.remove(SETTINGS_DRAFT_STORE_KEY);
        this.finalized = true;
        this.dialogRef.close();
    }

    loadFromHistory(historyId: string): void {
        this.dialogRef.close({ loadHistoryId: historyId } as SettingsDialogCloseResult);
    }

    onImportClick(): void {
        this.importFileInput?.nativeElement.click();
    }

    onImportFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            this.importError = '';
            try {
                const parsed = JSON.parse(String(reader.result || '{}'));
                this.applyImportedPayload(parsed);
            } catch {
                this.importError = 'Failed to import file. Invalid JSON.';
            } finally {
                input.value = '';
            }
        };
        reader.onerror = () => {
            this.importError = 'Failed to read import file.';
            input.value = '';
        };
        reader.readAsText(file);
    }

    exportSelected(): void {
        const payload = this.buildExportPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        anchor.href = url;
        anchor.download = `satisfactory-calculator-export-${stamp}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    canExport(): boolean {
        return Object.values(this.exportSelection).some(Boolean);
    }

    ngOnDestroy(): void {
        if (this.finalized) {
            return;
        }
        this.sessionStore.set(SETTINGS_DRAFT_STORE_KEY, this.settings);
    }

    private toSettingsExportKey(category: string): string {
        return `settings:${category}`;
    }

    private buildExportPayload(): Record<string, unknown> {
        const payload: Record<string, unknown> = {
            exportedAt: new Date().toISOString(),
            version: 1,
        };

        const settingsPayload: Record<string, unknown> = {};
        const settingsData = this.settings as unknown as Record<string, unknown>;
        for (const key of this.settingsCategoryKeys) {
            if (!this.exportSelection[this.toSettingsExportKey(key)]) {
                continue;
            }
            settingsPayload[key] = this.clone(settingsData[key]);
        }
        if (Object.keys(settingsPayload).length > 0) {
            payload['settings'] = settingsPayload;
        }

        if (this.exportSelection[this.historyExportKey]) {
            const mergedHistory = this.mergeCurrentBoardWithHistory();
            payload['history'] = mergedHistory;
        }

        return payload;
    }

    private mergeCurrentBoardWithHistory(): RecipeHistoryEntry[] {
        const history = this.clone(this.historyEntries);
        const currentBoard = this.data?.currentBoardEntry ? this.clone(this.data.currentBoardEntry) : null;
        if (!currentBoard?.response?.recipeNodeArr?.length) {
            return history;
        }

        if (history.length > 0 && this.requestKey(history[0]) === this.requestKey(currentBoard)) {
            return history;
        }

        return [currentBoard, ...history];
    }

    private requestKey(entry: RecipeHistoryEntry): string {
        return JSON.stringify({ query: entry.query, selectedRecipes: entry.selectedRecipes });
    }

    private applyImportedPayload(payload: any): void {
        if (payload?.settings && typeof payload.settings === 'object') {
            const current = this.clone(this.settings) as unknown as Record<string, unknown>;
            for (const [key, value] of Object.entries(payload.settings as Record<string, unknown>)) {
                current[key] = this.clone(value);
            }
            this.settings = this.mergeWithDefaults(this.settingsService.getSettings(), current as unknown as CalculatorSettings);
            this.settingsCategoryKeys = Object.keys(this.settings || {});
            for (const key of this.settingsCategoryKeys) {
                const exportKey = this.toSettingsExportKey(key);
                if (this.exportSelection[exportKey] === undefined) {
                    this.exportSelection[exportKey] = true;
                }
            }
            this.settingsService.setSettings(this.settings);
        }

        if (Array.isArray(payload?.history)) {
            this.historyEntries = this.historyService.replaceHistory(payload.history);
        }
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    private mergeWithDefaults(defaults: CalculatorSettings, incoming: CalculatorSettings): CalculatorSettings {
        const next = this.clone(defaults);
        const incomingColors = (incoming?.colors || {}) as any;
        const incomingNodes = incomingColors.nodes || {};

        next.colors.board = {
            ...next.colors.board,
            ...(incomingColors.board || {}),
        };
        next.colors.overlay = {
            ...next.colors.overlay,
            ...(incomingColors.overlay || {}),
        };
        next.colors.nodes = {
            ...next.colors.nodes,
            ...incomingNodes,
            resourceColors: {
                ...next.colors.nodes.resourceColors,
                ...(incomingNodes.resourceColors || {}),
            },
            layerColors: Array.isArray(incomingNodes.layerColors) && incomingNodes.layerColors.length
                ? [...incomingNodes.layerColors]
                : [...next.colors.nodes.layerColors],
        };

        return next;
    }
}
