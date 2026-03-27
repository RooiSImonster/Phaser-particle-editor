import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export class MainScene extends Scene {
    emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    debugGraphics!: Phaser.GameObjects.Graphics;
    currentParams: any = null;
    lastEx: number = 0;
    lastEy: number = 0;

    constructor() {
        super('MainScene');
    }

    create() {
        if (!this.sys || !this.sys.game || !this.sys.game.renderer) return;

        // Generate basic textures for particles
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // Circle
        if (!this.textures.exists('circle')) {
            g.fillStyle(0xffffff, 1);
            g.fillCircle(16, 16, 16);
            g.generateTexture('circle', 32, 32);
            g.clear();
        }

        // Square
        if (!this.textures.exists('square')) {
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 32, 32);
            g.generateTexture('square', 32, 32);
            g.clear();
        }

        // Star
        if (!this.textures.exists('star')) {
            g.fillStyle(0xffffff, 1);
            const points = [];
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? 16 : 8;
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                points.push({ x: 16 + Math.cos(angle) * radius, y: 16 + Math.sin(angle) * radius });
            }
            g.fillPoints(points, true);
            g.generateTexture('star', 32, 32);
            g.clear();
        }

        // Custom (default placeholder)
        if (!this.textures.exists('custom')) {
            g.fillStyle(0xffffff, 1);
            g.fillCircle(16, 16, 16);
            g.generateTexture('custom', 32, 32);
            g.clear();
        }

        // Create the particle emitter
        this.emitter = this.add.particles(0, 0, 'circle', {
            x: this.cameras.main.centerX,
            y: this.cameras.main.centerY,
            speed: 100,
            lifespan: 2000,
            blendMode: 'ADD'
        });

        this.lastEx = this.cameras.main.centerX;
        this.lastEy = this.cameras.main.centerY;

        // Create debug graphics
        this.debugGraphics = this.add.graphics();

        // Keep emitter centered on window resize
        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            this.emitter.particleX = gameSize.width / 2;
            this.emitter.particleY = gameSize.height / 2;
            // We need to re-trigger the update to redraw the debug graphics
            EventBus.emit('refresh-pane');
        });

        // Listen for updates from Tweakpane
        const onUpdateEmitter = (c: any) => {
            if (!this.sys || !this.cameras || !this.cameras.main) return;
            if (!this.emitter) return;

            this.currentParams = c;

            // Update background color
            this.cameras.main.setBackgroundColor(c.bgColor);

            // Update texture
            this.emitter.setTexture(c.texture);

            // Parse hex color string to number
            const tintVal = parseInt(c.tint.replace('#', '0x'), 16);

            // Determine emit zone
            let emitZone;
            const shape = c.emitZoneShape;
            
            if (shape === 'rectangle' && (c.emitZoneWidth > 0 || c.emitZoneHeight > 0)) {
                const w = Math.max(1, c.emitZoneWidth);
                const h = Math.max(1, c.emitZoneHeight);
                emitZone = {
                    type: 'random',
                    source: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h)
                };
            } else if (shape === 'circle' && c.emitZoneRadius > 0) {
                const r = Math.max(1, c.emitZoneRadius);
                emitZone = {
                    type: 'random',
                    source: new Phaser.Geom.Circle(0, 0, r)
                };
            } else if (shape === 'polygon' && c.emitZoneRadius > 0) {
                const r = Math.max(1, c.emitZoneRadius);
                const sides = Math.max(3, c.emitZoneSides);
                const points = [];
                for (let i = 0; i < sides; i++) {
                    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                    points.push(new Phaser.Math.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
                }
                const polygon = new Phaser.Geom.Polygon(points);
                emitZone = {
                    type: 'random',
                    source: {
                        getRandomPoint: (point: Phaser.Math.Vector2) => {
                            let x, y;
                            // Rejection sampling: pick random points in bounding box until one is inside polygon
                            do {
                                x = (Math.random() * 2 - 1) * r;
                                y = (Math.random() * 2 - 1) * r;
                            } while (!Phaser.Geom.Polygon.Contains(polygon, x, y));
                            point.x = x;
                            point.y = y;
                            return point;
                        }
                    }
                };
            } else {
                this.emitter.clearEmitZones();
            }

            // Update core config
            const config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
                speed: { min: c.speedMin, max: c.speedMax },
                angle: { min: c.angleMin, max: c.angleMax },
                scale: { start: c.scaleStart, end: c.scaleEnd },
                alpha: { start: c.alphaStart, end: c.alphaEnd },
                rotate: { start: c.rotateStart, end: c.rotateEnd },
                lifespan: { min: c.lifespanMin, max: c.lifespanMax },
                gravityX: c.gravity.x,
                gravityY: c.gravity.y,
                blendMode: c.blendMode,
                frequency: c.frequency,
                quantity: c.quantity,
                tint: tintVal,
            };

            this.emitter.setConfig(config);

            // Apply emit zone after setting config
            this.emitter.clearEmitZones();
            if (emitZone) {
                this.emitter.addEmitZone(emitZone);
            }
        };

        EventBus.on('update-emitter', onUpdateEmitter);

        // Listen for explode triggers
        const onExplode = () => {
            if (!this.sys) return;
            if (this.emitter) {
                this.emitter.explode();
            }
        };

        EventBus.on('explode-emitter', onExplode);

        // Listen for custom texture uploads
        const onUploadTexture = (dataUrl: string) => {
            if (!this.sys) return;
            
            const img = new Image();
            img.onload = () => {
                if (!this.sys) return;
                
                if (this.textures.exists('custom')) {
                    this.textures.remove('custom');
                }
                this.textures.addImage('custom', img);
                
                if (this.emitter) {
                    this.emitter.setTexture('custom');
                }
            };
            img.src = dataUrl;
        };
        
        EventBus.on('upload-texture', onUploadTexture);

        // Clean up listeners when scene is destroyed
        this.events.on('destroy', () => {
            EventBus.off('update-emitter', onUpdateEmitter);
            EventBus.off('explode-emitter', onExplode);
            EventBus.off('upload-texture', onUploadTexture);
        });

        // Notify React that the scene is ready to receive the initial config
        EventBus.emit('scene-ready');
    }

    update(time: number, delta: number) {
        if (!this.emitter || !this.currentParams || !this.cameras.main) return;

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        let ex = cx;
        let ey = cy;

        const motion = this.currentParams.emitterMotion;
        if (motion === 'cursor') {
            if (this.input.activePointer.isDown) {
                ex = this.input.activePointer.x;
                ey = this.input.activePointer.y;
            } else {
                // Keep it at the last known position or center if not clicked yet
                ex = this.lastEx;
                ey = this.lastEy;
            }
        } else if (motion === 'sineX') {
            ex = cx + Math.sin(time / 500) * 200;
        } else if (motion === 'sineY') {
            ey = cy + Math.sin(time / 500) * 200;
        } else if (motion === 'figure8') {
            ex = cx + Math.sin(time / 500) * 200;
            ey = cy + Math.sin(time / 250) * 200;
        }

        this.lastEx = ex;
        this.lastEy = ey;

        this.emitter.particleX = ex;
        this.emitter.particleY = ey;

        this.debugGraphics.clear();
        if (this.currentParams.showDebug) {
            this.debugGraphics.lineStyle(2, 0x00ff00, 0.5);
            const shape = this.currentParams.emitZoneShape;
            
            if (shape === 'rectangle') {
                const w = this.currentParams.emitZoneWidth;
                const h = this.currentParams.emitZoneHeight;
                if (w > 0 || h > 0) {
                    const drawW = Math.max(1, w);
                    const drawH = Math.max(1, h);
                    this.debugGraphics.strokeRect(ex - drawW / 2, ey - drawH / 2, drawW, drawH);
                }
            } else if (shape === 'circle') {
                const r = this.currentParams.emitZoneRadius;
                if (r > 0) {
                    this.debugGraphics.strokeCircle(ex, ey, Math.max(1, r));
                }
            } else if (shape === 'polygon') {
                const r = this.currentParams.emitZoneRadius;
                if (r > 0) {
                    const sides = Math.max(3, this.currentParams.emitZoneSides);
                    const points = [];
                    for (let i = 0; i < sides; i++) {
                        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                        points.push(new Phaser.Geom.Point(ex + Math.cos(angle) * r, ey + Math.sin(angle) * r));
                    }
                    this.debugGraphics.strokePoints(points, true, true);
                }
            }
        }
    }
}
