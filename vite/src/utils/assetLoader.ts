// src/utils/assetLoader.ts
interface AssetManifest {
    [key: string]: string[];
}

export class AssetLoader {
    private static manifest: AssetManifest = {};

    static async loadAssets(scene: Phaser.Scene): Promise<void> {
        try {
            // Импортируем все SVG файлы из папки assets
            const assetsContext = import.meta.glob('../assets/images/*.svg', { eager: true });
            
            for (const [path, module] of Object.entries(assetsContext)) {
                const fileName = path.split('/').pop()?.replace('.svg', '');
                if (fileName) {
                    const assetUrl = (module as any).default;
                    
                    // Группируем по типам (rock, tree, bush и т.д.)
                    const assetType = this.getAssetType(fileName);
                    
                    if (!this.manifest[assetType]) {
                        this.manifest[assetType] = [];
                    }
                    
                    this.manifest[assetType].push(fileName);
                    scene.load.image(fileName, assetUrl);
                }
            }
            
        } catch (error) {
            console.warn('Auto asset loading failed, using fallback:', error);
            this.loadFallbackAssets();
        }
    }

    static getAssetType(fileName: string): string {
        // Определяем тип по имени файла
        if (fileName.startsWith('rock')) return 'rock';
        if (fileName.startsWith('tree')) return 'tree';
        if (fileName.startsWith('bush')) return 'bush';
        if (fileName.startsWith('mountain')) return 'mountain';
        if (fileName.startsWith('stone')) return 'stone';
        if (fileName.startsWith('wood')) return 'wood';
        if (fileName.startsWith('gold_vein')) return 'gold_vein';
        if (fileName.startsWith('mushroom')) return 'mushroom';
        if (fileName.startsWith('mushroom_poison')) return 'mushroom_poison';
        if (fileName.startsWith('star')) return 'star';

        return 'other';
    }

    static getRandomAsset(assetType: string): string | null {
        const assets = this.manifest[assetType];
        if (!assets || assets.length === 0) {
            console.warn(`No assets found for type: ${assetType}`);
            return this.getFallbackAsset(assetType);
        }
        
        const randomIndex = Math.floor(Math.random() * assets.length);
        return assets[randomIndex];
    }

    static getAllAssets(assetType: string): string[] {
        return this.manifest[assetType] || [];
    }

    private static loadFallbackAssets(): void {
        // Резервные assets если автоматическая загрузка не сработала
        const fallbackAssets = {
            rock: ['rock', 'rock-2', 'rock-3'],
            tree: ['tree', 'tree-2'],
            bush: ['bush', 'bush-2'],
            mountain: ['mountain']
        };

        for (const [type, assets] of Object.entries(fallbackAssets)) {
            if (!this.manifest[type]) {
                this.manifest[type] = [];
            }
            
            assets.forEach(assetName => {
                this.manifest[type].push(assetName);
                // Здесь можно добавить базовые Data URLs или сгенерировать текстуры
            });
        }
    }

    private static getFallbackAsset(assetType: string): string | null {
        const fallbacks: { [key: string]: string } = {
            rock: 'rock',
            tree: 'tree',
            bush: 'bush',
            mountain: 'mountain'
        };
        
        return fallbacks[assetType] || null;
    }
}