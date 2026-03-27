/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import { EventBus } from './game/EventBus';
import { StartGame } from './game/main';

const PARAMS = {
  bgColor: '#111111',
  texture: 'circle',
  blendMode: 'ADD',
  frequency: 20,
  quantity: 1,
  tint: '#4a90e2',
  speedMin: 50,
  speedMax: 200,
  angleMin: 0,
  angleMax: 360,
  scaleStart: 1,
  scaleEnd: 0,
  alphaStart: 1,
  alphaEnd: 0,
  rotateStart: 0,
  rotateEnd: 360,
  lifespanMin: 1000,
  lifespanMax: 2000,
  gravity: { x: 0, y: 0 },
  emitZoneShape: 'point',
  emitZoneWidth: 0,
  emitZoneHeight: 0,
  emitZoneRadius: 50,
  emitZoneSides: 5,
  showDebug: true,
  emitterMotion: 'none',
};

export default function App() {
  const paneRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      EventBus.emit('upload-texture', dataUrl);
      PARAMS.texture = 'custom';
      // The pane will be refreshed via the change event or manually if needed, 
      // but we need to emit the update to the scene.
      EventBus.emit('update-emitter', PARAMS);
      
      // We need to refresh the pane to show the updated texture selection
      // We'll do this by emitting an event that the useEffect can catch
      EventBus.emit('refresh-pane');
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  useEffect(() => {
    if (!gameRef.current || !paneRef.current) return;

    // Initialize Phaser game
    if (!gameInstance.current) {
      gameInstance.current = StartGame(gameRef.current);
    }

    // Initialize Tweakpane
    const pane = new Pane({ container: paneRef.current });

    const tab = pane.addTab({
      pages: [
        { title: 'Particle system' },
        { title: 'Scene settings' }
      ]
    });

    const pSystem = tab.pages[0];
    const pScene = tab.pages[1];

    // Scene settings tab
    pScene.addBinding(PARAMS, 'bgColor', { label: 'Background' });

    // Particle system tab
    const fZone = pSystem.addFolder({ title: 'Emit Zone' });
    const bShape = fZone.addBinding(PARAMS, 'emitZoneShape', {
      label: 'Shape',
      options: { point: 'point', rectangle: 'rectangle', circle: 'circle', polygon: 'polygon' },
    });
    const bWidth = fZone.addBinding(PARAMS, 'emitZoneWidth', { min: 0, max: 800, step: 10 });
    const bHeight = fZone.addBinding(PARAMS, 'emitZoneHeight', { min: 0, max: 800, step: 10 });
    const bRadius = fZone.addBinding(PARAMS, 'emitZoneRadius', { min: 0, max: 400, step: 10 });
    const bSides = fZone.addBinding(PARAMS, 'emitZoneSides', { min: 3, max: 12, step: 1 });

    const updateZoneVisibility = () => {
      const shape = PARAMS.emitZoneShape;
      bWidth.hidden = shape !== 'rectangle';
      bHeight.hidden = shape !== 'rectangle';
      bRadius.hidden = shape !== 'circle' && shape !== 'polygon';
      bSides.hidden = shape !== 'polygon';
    };

    bShape.on('change', updateZoneVisibility);
    updateZoneVisibility();

    const fCore = pSystem.addFolder({ title: 'Particle settings' });
    fCore.addBinding(PARAMS, 'texture', {
      options: { circle: 'circle', square: 'square', star: 'star', custom: 'custom' },
    });
    fCore.addButton({ title: 'Upload Custom Texture' }).on('click', () => {
      fileInputRef.current?.click();
    });
    fCore.addBinding(PARAMS, 'blendMode', {
      options: { NORMAL: 'NORMAL', ADD: 'ADD', MULTIPLY: 'MULTIPLY', SCREEN: 'SCREEN' },
    });
    fCore.addBinding(PARAMS, 'tint', { label: 'Color Tint' });
    
    fCore.addBlade({ view: 'separator' });
    
    fCore.addBinding(PARAMS, 'scaleStart', { min: 0, max: 10 });
    fCore.addBinding(PARAMS, 'scaleEnd', { min: 0, max: 10 });
    fCore.addBinding(PARAMS, 'alphaStart', { min: 0, max: 1 });
    fCore.addBinding(PARAMS, 'alphaEnd', { min: 0, max: 1 });
    fCore.addBinding(PARAMS, 'rotateStart', { min: -360, max: 360 });
    fCore.addBinding(PARAMS, 'rotateEnd', { min: -360, max: 360 });

    const fEmission = pSystem.addFolder({ title: 'Emission' });
    fEmission.addBinding(PARAMS, 'emitterMotion', {
      label: 'Motion',
      options: { none: 'none', cursor: 'cursor', sineX: 'sineX', sineY: 'sineY', figure8: 'figure8' },
    });
    fEmission.addBinding(PARAMS, 'frequency', { min: -1, max: 500, step: 1 });
    fEmission.addBinding(PARAMS, 'quantity', { min: 1, max: 100, step: 1 });
    fEmission.addBinding(PARAMS, 'lifespanMin', { min: 1, step: 1 });
    fEmission.addBinding(PARAMS, 'lifespanMax', { min: 1, step: 1 });

    const fMotion = pSystem.addFolder({ title: 'Motion' });
    fMotion.addBinding(PARAMS, 'speedMin', { min: 0, max: 1000 });
    fMotion.addBinding(PARAMS, 'speedMax', { min: 0, max: 1000 });
    fMotion.addBinding(PARAMS, 'angleMin', { min: 0, max: 360 });
    fMotion.addBinding(PARAMS, 'angleMax', { min: 0, max: 360 });
    fMotion.addBinding(PARAMS, 'gravity', {
      x: { min: -1000, max: 1000 },
      y: { min: -1000, max: 1000 },
    });

    pSystem.addButton({ title: 'Explode (Burst)' }).on('click', () => {
      EventBus.emit('explode-emitter');
    });

    pSystem.addButton({ title: 'Export Config' }).on('click', () => {
      const exportObj: any = {
        texture: PARAMS.texture,
        speed: { min: PARAMS.speedMin, max: PARAMS.speedMax },
        angle: { min: PARAMS.angleMin, max: PARAMS.angleMax },
        scale: { start: PARAMS.scaleStart, end: PARAMS.scaleEnd },
        alpha: { start: PARAMS.alphaStart, end: PARAMS.alphaEnd },
        rotate: { start: PARAMS.rotateStart, end: PARAMS.rotateEnd },
        lifespan: { min: PARAMS.lifespanMin, max: PARAMS.lifespanMax },
        gravityX: PARAMS.gravity.x,
        gravityY: PARAMS.gravity.y,
        blendMode: PARAMS.blendMode,
        frequency: PARAMS.frequency,
        quantity: PARAMS.quantity,
        tint: parseInt(PARAMS.tint.replace('#', '0x'), 16),
        emitterMotion: PARAMS.emitterMotion,
      };

      const shape = PARAMS.emitZoneShape;
      if (shape === 'rectangle' && (PARAMS.emitZoneWidth > 0 || PARAMS.emitZoneHeight > 0)) {
        exportObj.emitZone = {
          type: 'random',
          source: `new Phaser.Geom.Rectangle(-${PARAMS.emitZoneWidth / 2}, -${PARAMS.emitZoneHeight / 2}, ${PARAMS.emitZoneWidth}, ${PARAMS.emitZoneHeight})`
        };
      } else if (shape === 'circle' && PARAMS.emitZoneRadius > 0) {
        exportObj.emitZone = {
          type: 'random',
          source: `new Phaser.Geom.Circle(0, 0, ${PARAMS.emitZoneRadius})`
        };
      } else if (shape === 'polygon' && PARAMS.emitZoneRadius > 0) {
        exportObj.emitZone = {
          type: 'random',
          source: `{ getRandomPoint: (point) => { /* custom logic to return random point inside polygon */ return point; } }`
        };
      }

      navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
      alert('Phaser config copied to clipboard!');
    });

    pane.on('change', () => {
      EventBus.emit('update-emitter', PARAMS);
    });

    const devPane = new Pane({ container: paneRef.current, title: 'Dev Settings' });
    devPane.addBinding(PARAMS, 'showDebug', { label: 'Show Debug' });
    devPane.on('change', () => {
      EventBus.emit('update-emitter', PARAMS);
    });

    // Handle initial update once the scene is ready
    const onSceneReady = () => {
      EventBus.emit('update-emitter', PARAMS);
    };
    EventBus.on('scene-ready', onSceneReady);

    const onRefreshPane = () => {
      pane.refresh();
      devPane.refresh();
    };
    EventBus.on('refresh-pane', onRefreshPane);

    return () => {
      pane.dispose();
      devPane.dispose();
      EventBus.off('scene-ready', onSceneReady);
      EventBus.off('refresh-pane', onRefreshPane);
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      <div className="flex-1 relative min-w-[100px] min-h-[100px]" ref={gameRef} />
      <div className="w-[320px] h-full overflow-y-auto relative z-10 shadow-2xl bg-[#1a1a1a] border-l border-gray-800" ref={paneRef} />
    </div>
  );
}
