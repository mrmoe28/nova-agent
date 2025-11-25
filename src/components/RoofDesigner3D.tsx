'use client';

/**
 * 3D Roof Designer Component
 * Interactive visual panel placement tool using HTML5 Canvas
 * (Lightweight alternative to Three.js for better performance)
 */

import { useRef, useEffect, useState } from 'react';
import { Card } from './ui/card';

interface Panel {
  id: string;
  x: number;
  y: number;
  rotation: number; // 0 = portrait, 90 = landscape
  width: number;
  height: number;
}

interface RoofDimensions {
  width: number; // feet
  height: number; // feet
  azimuth: number; // degrees (0 = north, 180 = south)
  tilt: number; // degrees
}

interface RoofDesigner3DProps {
  roofDimensions: RoofDimensions;
  panelCount: number;
  onLayoutChange?: (panels: Panel[]) => void;
}

export default function RoofDesigner3D({
  roofDimensions,
  panelCount,
  onLayoutChange,
}: RoofDesigner3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Panel dimensions in feet (standard 400W panel)
  const PANEL_WIDTH = 3.35; // feet
  const PANEL_HEIGHT = 5.5; // feet
  const SCALE = 50; // pixels per foot

  useEffect(() => {
    // Auto-generate initial panel layout
    const initialPanels = generateInitialLayout();
    setPanels(initialPanels);
  }, [panelCount, roofDimensions]);

  useEffect(() => {
    drawCanvas();
  }, [panels, selectedPanelId, viewMode]);

  useEffect(() => {
    if (onLayoutChange) {
      onLayoutChange(panels);
    }
  }, [panels]);

  const generateInitialLayout = (): Panel[] => {
    const newPanels: Panel[] = [];
    const margin = 2; // feet from edge
    const spacing = 0.5; // feet between panels

    let x = margin;
    let y = margin;
    let currentRow = 0;
    const panelsPerRow = Math.floor(
      (roofDimensions.width - 2 * margin) / (PANEL_WIDTH + spacing)
    );

    for (let i = 0; i < panelCount; i++) {
      if (i > 0 && i % panelsPerRow === 0) {
        currentRow++;
        x = margin;
        y = margin + currentRow * (PANEL_HEIGHT + spacing);
      }

      // Check if panel fits on roof
      if (
        x + PANEL_WIDTH <= roofDimensions.width - margin &&
        y + PANEL_HEIGHT <= roofDimensions.height - margin
      ) {
        newPanels.push({
          id: `panel-${i}`,
          x,
          y,
          rotation: 0,
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
        });

        x += PANEL_WIDTH + spacing;
      }
    }

    return newPanels;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === '2d') {
      draw2DView(ctx);
    } else {
      draw3DView(ctx);
    }
  };

  const draw2DView = (ctx: CanvasRenderingContext2D) => {
    // Draw roof outline
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      0,
      0,
      roofDimensions.width * SCALE,
      roofDimensions.height * SCALE
    );

    // Draw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 1; i < roofDimensions.width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * SCALE, 0);
      ctx.lineTo(i * SCALE, roofDimensions.height * SCALE);
      ctx.stroke();
    }
    for (let i = 1; i < roofDimensions.height; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * SCALE);
      ctx.lineTo(roofDimensions.width * SCALE, i * SCALE);
      ctx.stroke();
    }

    // Draw compass rose (azimuth indicator)
    const compassX = roofDimensions.width * SCALE - 60;
    const compassY = 60;
    const compassRadius = 40;

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw north indicator rotated by azimuth
    const azimuthRad = ((roofDimensions.azimuth - 90) * Math.PI) / 180;
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.moveTo(
      compassX + Math.cos(azimuthRad) * compassRadius,
      compassY + Math.sin(azimuthRad) * compassRadius
    );
    ctx.lineTo(
      compassX + Math.cos(azimuthRad + 0.3) * (compassRadius * 0.7),
      compassY + Math.sin(azimuthRad + 0.3) * (compassRadius * 0.7)
    );
    ctx.lineTo(
      compassX + Math.cos(azimuthRad - 0.3) * (compassRadius * 0.7),
      compassY + Math.sin(azimuthRad - 0.3) * (compassRadius * 0.7)
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText('N', compassX - 5, compassY - compassRadius - 5);

    // Draw panels
    panels.forEach((panel) => {
      const isSelected = panel.id === selectedPanelId;

      ctx.save();

      // Translate to panel center
      const centerX = panel.x * SCALE + (panel.width * SCALE) / 2;
      const centerY = panel.y * SCALE + (panel.height * SCALE) / 2;
      ctx.translate(centerX, centerY);

      // Rotate if needed
      if (panel.rotation !== 0) {
        ctx.rotate((panel.rotation * Math.PI) / 180);
      }

      // Draw panel
      ctx.fillStyle = isSelected ? '#3b82f6' : '#1e3a8a';
      ctx.strokeStyle = isSelected ? '#2563eb' : '#1e40af';
      ctx.lineWidth = isSelected ? 3 : 2;

      ctx.fillRect(
        (-panel.width * SCALE) / 2,
        (-panel.height * SCALE) / 2,
        panel.width * SCALE,
        panel.height * SCALE
      );
      ctx.strokeRect(
        (-panel.width * SCALE) / 2,
        (-panel.height * SCALE) / 2,
        panel.width * SCALE,
        panel.height * SCALE
      );

      // Draw cell lines to show it's a solar panel
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      const cellWidth = (panel.width * SCALE) / 6;
      const cellHeight = (panel.height * SCALE) / 10;

      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(
          (-panel.width * SCALE) / 2 + i * cellWidth,
          (-panel.height * SCALE) / 2
        );
        ctx.lineTo(
          (-panel.width * SCALE) / 2 + i * cellWidth,
          (panel.height * SCALE) / 2
        );
        ctx.stroke();
      }

      for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(
          (-panel.width * SCALE) / 2,
          (-panel.height * SCALE) / 2 + i * cellHeight
        );
        ctx.lineTo(
          (panel.width * SCALE) / 2,
          (-panel.height * SCALE) / 2 + i * cellHeight
        );
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  const draw3DView = (ctx: CanvasRenderingContext2D) => {
    // Simplified 3D perspective view
    const tiltRad = (roofDimensions.tilt * Math.PI) / 180;
    const scaleY = Math.cos(tiltRad);

    // Draw roof as parallelogram
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(100, 200);
    ctx.lineTo(100 + roofDimensions.width * SCALE * 0.8, 200);
    ctx.lineTo(
      100 + roofDimensions.width * SCALE * 0.8,
      200 - roofDimensions.height * SCALE * scaleY * 0.8
    );
    ctx.lineTo(100, 200 - roofDimensions.height * SCALE * scaleY * 0.8);
    ctx.closePath();
    ctx.fill();

    // Draw panels in 3D perspective
    panels.forEach((panel) => {
      const x = 100 + panel.x * SCALE * 0.8;
      const y = 200 - panel.y * SCALE * scaleY * 0.8;
      const w = panel.width * SCALE * 0.8;
      const h = panel.height * SCALE * scaleY * 0.8;

      ctx.fillStyle = panel.id === selectedPanelId ? '#3b82f6' : '#1e3a8a';
      ctx.fillRect(x, y - h, w, h);

      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y - h, w, h);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked panel
    const clickedPanel = panels.find((panel) => {
      const px = panel.x * SCALE;
      const py = panel.y * SCALE;
      const pw = panel.width * SCALE;
      const ph = panel.height * SCALE;

      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });

    if (clickedPanel) {
      setSelectedPanelId(clickedPanel.id);
      setDragOffset({
        x: x - clickedPanel.x * SCALE,
        y: y - clickedPanel.y * SCALE,
      });
    } else {
      setSelectedPanelId(null);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedPanelId) {
      setIsDragging(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedPanelId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragOffset.x) / SCALE;
    const y = (e.clientY - rect.top - dragOffset.y) / SCALE;

    setPanels(
      panels.map((panel) =>
        panel.id === selectedPanelId ? { ...panel, x, y } : panel
      )
    );
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const rotateSelectedPanel = () => {
    if (!selectedPanelId) return;

    setPanels(
      panels.map((panel) =>
        panel.id === selectedPanelId
          ? {
              ...panel,
              rotation: (panel.rotation + 90) % 360,
              width: panel.height,
              height: panel.width,
            }
          : panel
      )
    );
  };

  const deleteSelectedPanel = () => {
    if (!selectedPanelId) return;

    setPanels(panels.filter((panel) => panel.id !== selectedPanelId));
    setSelectedPanelId(null);
  };

  const addPanel = () => {
    const newPanel: Panel = {
      id: `panel-${Date.now()}`,
      x: 2,
      y: 2,
      rotation: 0,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
    };

    setPanels([...panels, newPanel]);
    setSelectedPanelId(newPanel.id);
  };

  const resetLayout = () => {
    const initialPanels = generateInitialLayout();
    setPanels(initialPanels);
    setSelectedPanelId(null);
  };

  const canvasWidth = roofDimensions.width * SCALE;
  const canvasHeight = roofDimensions.height * SCALE;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Roof Designer
            </h2>
            <p className="text-gray-600">
              Click and drag panels to customize your layout
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-4 py-2 rounded ${
                viewMode === '2d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              2D View
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-4 py-2 rounded ${
                viewMode === '3d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              3D View
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="cursor-pointer"
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={addPanel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            + Add Panel
          </button>
          <button
            onClick={rotateSelectedPanel}
            disabled={!selectedPanelId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rotate Selected
          </button>
          <button
            onClick={deleteSelectedPanel}
            disabled={!selectedPanelId}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Selected
          </button>
          <button
            onClick={resetLayout}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
          >
            Reset Layout
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gray-100 rounded">
          <div>
            <p className="text-sm text-gray-600">Total Panels</p>
            <p className="text-2xl font-bold">{panels.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">System Size</p>
            <p className="text-2xl font-bold">
              {((panels.length * 400) / 1000).toFixed(1)} kW
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Roof Coverage</p>
            <p className="text-2xl font-bold">
              {(
                (panels.length * PANEL_WIDTH * PANEL_HEIGHT) /
                (roofDimensions.width * roofDimensions.height) *
                100
              ).toFixed(0)}
              %
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
