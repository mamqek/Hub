import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SessionStoreService } from './session-store.service';

export interface ColorSettings {
    board: {
        canvasColor: string;
        arrowsColor: string;
    };
    overlay: {
        backgroundColor: string;
        textColor: string;
    };
    nodes: {
        disableResourceColors: boolean;
        resourceColors: Record<string, string>;
        disableLayerColors: boolean;
        unifiedLayerColor: string;
        layerColors: string[];
    };
}

export interface FactorySettings {
    minerLevel: number;
    beltLevel: number;
}

export interface CalculatorSettings {
    colors: ColorSettings;
    factory: FactorySettings;
}

const DEFAULT_SETTINGS: CalculatorSettings = {
    colors: {
        board: {
            canvasColor: '#163428',
            arrowsColor: '#f2f200',
        },
        overlay: {
            backgroundColor: 'rgba(19, 24, 29, 0.75)',
            textColor: '#eff3f5',
        },
        nodes: {
            disableResourceColors: false,
            resourceColors: {
                iron: '#b84034',
                copper: '#c86e2e',
                caterium: '#caa313',
                coal: '#333333',
                limestone: '#8f8b83',
                quartz: '#73a4cb',
                sulfur: '#baa81b',
                bauxite: '#8a4e2d',
                uranium: '#4a9d2f',
                sam: '#6f4fd1',
                water: '#2f7fd9',
                nitrogen: '#4ca9d8',
                oil: '#5a465f',
                default: '#6b7a8f',
            },
            disableLayerColors: false,
            unifiedLayerColor: '#4e85d6',
            layerColors: [
                '#6b7a8f',
                '#c056b7',
                '#3c9f6f',
                '#4e85d6',
                '#c57a2d',
                '#7c63cf',
                '#3a9ea6',
                '#b84b82',
                '#4f9b48',
            ],
        },
    },
    factory: {
        minerLevel: 1,
        beltLevel: 1,
    },
};

const SETTINGS_STORE_KEY = 'calculator.settings';

@Injectable({ providedIn: 'root' })
export class CalculatorSettingsService {
    private settingsSubject: BehaviorSubject<CalculatorSettings>;
    readonly settings$: Observable<CalculatorSettings>;

    constructor(private sessionStore: SessionStoreService) {
        const stored = this.sessionStore.get<CalculatorSettings>(SETTINGS_STORE_KEY, this.clone(DEFAULT_SETTINGS));
        this.settingsSubject = new BehaviorSubject<CalculatorSettings>(this.normalizeSettings(stored));
        this.settings$ = this.settingsSubject.asObservable();
    }

    getSettings(): CalculatorSettings {
        return this.normalizeSettings(this.settingsSubject.getValue());
    }

    setSettings(next: CalculatorSettings): void {
        const normalized = this.normalizeSettings(next);
        this.settingsSubject.next(normalized);
        this.sessionStore.set(SETTINGS_STORE_KEY, normalized);
    }

    private normalizeSettings(value: CalculatorSettings | null | undefined): CalculatorSettings {
        const incoming = (value || {}) as Partial<CalculatorSettings>;
        const incomingColors = (incoming.colors || {}) as Partial<ColorSettings>;
        const incomingNodes = (incomingColors.nodes || {}) as Partial<ColorSettings['nodes']>;
        const incomingFactory = (incoming.factory || {}) as Partial<FactorySettings>;
        const incomingOverlay = (incomingColors.overlay || {}) as Partial<ColorSettings['overlay']>;
        const legacyOverlayBackground = '#11251b';
        const legacyOverlayText = '#ffffff';
        const resolvedOverlayBackground = this.normalizeOverlayColor(
            incomingOverlay.backgroundColor,
            legacyOverlayBackground,
            DEFAULT_SETTINGS.colors.overlay.backgroundColor
        );
        const resolvedOverlayText = this.normalizeOverlayColor(
            incomingOverlay.textColor,
            legacyOverlayText,
            DEFAULT_SETTINGS.colors.overlay.textColor
        );

        return {
            colors: {
                board: {
                    ...DEFAULT_SETTINGS.colors.board,
                    ...(incomingColors.board || {}),
                },
                overlay: {
                    ...DEFAULT_SETTINGS.colors.overlay,
                    ...(incomingColors.overlay || {}),
                    backgroundColor: resolvedOverlayBackground,
                    textColor: resolvedOverlayText,
                },
                nodes: {
                    ...DEFAULT_SETTINGS.colors.nodes,
                    ...incomingNodes,
                    resourceColors: {
                        ...DEFAULT_SETTINGS.colors.nodes.resourceColors,
                        ...(incomingNodes.resourceColors || {}),
                    },
                    layerColors: Array.isArray(incomingNodes.layerColors) && incomingNodes.layerColors.length
                        ? [...incomingNodes.layerColors]
                        : [...DEFAULT_SETTINGS.colors.nodes.layerColors],
                },
            },
            factory: {
                minerLevel: this.normalizeMinerLevel(incomingFactory.minerLevel),
                beltLevel: this.normalizeBeltLevel(incomingFactory.beltLevel),
            },
        };
    }

    private normalizeMinerLevel(value: number | undefined): number {
        const candidate = Number(value);
        if (candidate === 2 || candidate === 3) {
            return candidate;
        }
        return DEFAULT_SETTINGS.factory.minerLevel;
    }

    private normalizeBeltLevel(value: number | undefined): number {
        const candidate = Number(value);
        if (candidate >= 1 && candidate <= 6) {
            return Math.floor(candidate);
        }
        return DEFAULT_SETTINGS.factory.beltLevel;
    }

    private normalizeOverlayColor(value: string | undefined, legacyDefault: string, nextDefault: string): string {
        if (!value) {
            return nextDefault;
        }
        const normalized = value.trim().toLowerCase();
        if (normalized === legacyDefault.toLowerCase()) {
            return nextDefault;
        }
        return value;
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }
}
