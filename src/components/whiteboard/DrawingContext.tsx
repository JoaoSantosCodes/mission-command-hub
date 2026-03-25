import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToolType =
  | 'selection'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'draw'
  | 'text'
  | 'eraser'
  | 'hand';

export interface DrawingElement {
  id: string;
  type: 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'draw' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  points?: Array<[number, number]>;
}

export interface DrawingContextType {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  elements: DrawingElement[];
  addElement: (element: DrawingElement) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  deleteElement: (id: string) => void;
  clearCanvas: () => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  setStrokeStyle: (style: 'solid' | 'dashed' | 'dotted') => void;
  roughness: number;
  setRoughness: (roughness: number) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const STORAGE_KEY = 'wb-elements-v1';

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

function loadElements(): DrawingElement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DrawingElement[];
  } catch {
    /* ignore */
  }
  return [];
}

export function DrawingProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveTool] = useState<ToolType>('selection');
  const [elements, setElements] = useState<DrawingElement[]>(() => loadElements());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [strokeColor, setStrokeColor] = useState('#1a1a1a');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [roughness, setRoughness] = useState(0);
  const [opacity, setOpacity] = useState(100);

  const [history, setHistory] = useState<DrawingElement[][]>(() => [loadElements()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch {
      /* ignore quota */
    }
  }, [elements]);

  const pushToHistory = useCallback((newElements: DrawingElement[]) => {
    const idx = historyIndexRef.current;
    setHistory((prev) => [...prev.slice(0, idx + 1), newElements]);
    setHistoryIndex(idx + 1);
  }, []);

  const addElement = useCallback(
    (element: DrawingElement) => {
      setElements((prev) => {
        const next = [...prev, element];
        pushToHistory(next);
        return next;
      });
    },
    [pushToHistory]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<DrawingElement>) => {
      setElements((prev) => {
        const next = prev.map((el) => (el.id === id ? { ...el, ...updates } : el));
        pushToHistory(next);
        return next;
      });
    },
    [pushToHistory]
  );

  const deleteElement = useCallback(
    (id: string) => {
      setElements((prev) => {
        const next = prev.filter((el) => el.id !== id);
        pushToHistory(next);
        return next;
      });
    },
    [pushToHistory]
  );

  const clearCanvas = useCallback(() => {
    setElements([]);
    const idx = historyIndexRef.current;
    setHistory((prev) => [...prev.slice(0, idx + 1), []]);
    setHistoryIndex(idx + 1);
  }, []);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    setHistoryIndex(idx - 1);
    setElements((_, ...args) => {
      void args;
      // Access history via closure in the effect below
      return [];
    });
    // Use a separate effect-like pattern; simpler: read history synchronously
    setElements(history[idx - 1] ?? []);
  }, [history]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= history.length - 1) return;
    setHistoryIndex(idx + 1);
    setElements(history[idx + 1] ?? []);
  }, [history]);

  const value: DrawingContextType = {
    activeTool,
    setActiveTool,
    elements,
    addElement,
    updateElement,
    deleteElement,
    clearCanvas,
    selectedIds,
    setSelectedIds,
    strokeColor,
    setStrokeColor,
    backgroundColor,
    setBackgroundColor,
    strokeWidth,
    setStrokeWidth,
    strokeStyle,
    setStrokeStyle,
    roughness,
    setRoughness,
    opacity,
    setOpacity,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) throw new Error('useDrawing must be used within DrawingProvider');
  return ctx;
}
