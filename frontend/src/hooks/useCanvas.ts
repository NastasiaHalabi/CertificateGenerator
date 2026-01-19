import { useCallback, useEffect, useRef } from "react";
import { Canvas, FabricObject, IText, Image as FabricImage } from "fabric";
import type { CertificateTemplate } from "../types/template.types";
import type { TextVariable } from "../types/variable.types";

interface UseCanvasProps {
  template: CertificateTemplate | null;
  variables: TextVariable[];
  selectedVariableId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<TextVariable>) => void;
  scale: number;
  previewTextMap: Record<string, string> | null;
}

function resolveOriginX(textAlign: TextVariable["textAlign"]) {
  if (textAlign === "center") return "center";
  if (textAlign === "right") return "right";
  return "left";
}

/**
 * Sync Fabric canvas objects with React state.
 */
export function useCanvas({
  template,
  variables,
  selectedVariableId,
  onSelect,
  onUpdate,
  scale,
  previewTextMap,
}: UseCanvasProps) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const isApplyingPreviewRef = useRef(false);

  const syncVariableFromObject = useCallback(
    (object: FabricObject) => {
      if (isApplyingPreviewRef.current) return;
      const id = object.data?.id as string | undefined;
      if (!id) return;
      const textObject = object as IText;
      const scaleX = textObject.scaleX ?? 1;
      const scaleY = textObject.scaleY ?? 1;
      if (scaleX !== 1 || scaleY !== 1) {
        const nextFontSize = (textObject.fontSize || 0) * scaleY;
        const nextCharSpacing = (textObject.charSpacing || 0) * scaleX;
        textObject.set({
          scaleX: 1,
          scaleY: 1,
          fontSize: nextFontSize,
          charSpacing: nextCharSpacing,
        });
        textObject.setCoords();
      }
      onUpdate(id, {
        x: textObject.left || 0,
        y: textObject.top || 0,
        rotation: textObject.angle || 0,
        text: textObject.text || "",
        fontSize: textObject.fontSize || 0,
        textAlign: textObject.textAlign || "left",
        letterSpacing: (textObject.charSpacing || 0) / 1000,
        lineHeight: textObject.lineHeight || 0,
      });
    },
    [onUpdate],
  );

  const attachObjectListeners = useCallback(
    (textObject: IText) => {
      textObject.on("modified", () => syncVariableFromObject(textObject));
      textObject.on("changed", () => syncVariableFromObject(textObject));
      textObject.on("editing:exited", () => syncVariableFromObject(textObject));
    },
    [syncVariableFromObject],
  );

  useEffect(() => {
    if (!canvasElementRef.current) return;

    if (!template) {
      canvasRef.current?.dispose();
      canvasRef.current = null;
      return;
    }

    if (!canvasRef.current) {
      const canvas = new Canvas(canvasElementRef.current, {
        selection: true,
      });
      canvasRef.current = canvas;

      canvas.on("selection:created", (event) => {
        const selected = event.selected?.[0];
        onSelect((selected?.data?.id as string | undefined) || null);
      });
      canvas.on("selection:updated", (event) => {
        const selected = event.selected?.[0];
        onSelect((selected?.data?.id as string | undefined) || null);
      });
      canvas.on("selection:cleared", () => onSelect(null));
    }

    const canvas = canvasRef.current;
    canvas.setDimensions({ width: template.width, height: template.height });
    canvas.setDimensions(
      { width: template.width * scale, height: template.height * scale },
      { cssOnly: true },
    );
    // Fabric.js: load template image and set as background.
    FabricImage.fromURL(template.previewUrl).then((image) => {
      image.set({ left: 0, top: 0, originX: "left", originY: "top" });
      image.scaleToWidth(template.width);
      image.scaleToHeight(template.height);
      canvas.set({ backgroundImage: image });
      canvas.renderAll();
    });
  }, [template, onSelect, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    const existingObjects = canvas.getObjects();
    const ids = new Set(variables.map((variable) => variable.id));

    existingObjects.forEach((object) => {
      const id = object.data?.id as string | undefined;
      if (id && !ids.has(id)) {
        canvas.remove(object);
      }
    });

    isApplyingPreviewRef.current = Boolean(previewTextMap);
    variables.forEach((variable) => {
      const previewText = previewTextMap?.[variable.name];
      const textToRender = previewText ?? variable.text;
      let textObject = canvas
        .getObjects()
        .find((object) => object.data?.id === variable.id) as IText | undefined;

      if (!textObject) {
        textObject = new IText(textToRender, {
          left: variable.x,
          top: variable.y,
          originX: resolveOriginX(variable.textAlign),
          originY: "top",
          fontSize: variable.fontSize,
          fontFamily: variable.fontFamily,
          fontWeight: variable.fontWeight,
          fontStyle: variable.fontStyle,
          fill: variable.color,
          angle: variable.rotation,
          textAlign: variable.textAlign,
          charSpacing: variable.letterSpacing * 1000,
          lineHeight: variable.lineHeight || 1.2,
          hasControls: !variable.locked,
          hasBorders: true,
          selectable: true,
          scaleX: 1,
          scaleY: 1,
          lockMovementX: variable.locked,
          lockMovementY: variable.locked,
          lockScalingX: variable.locked,
          lockScalingY: variable.locked,
          lockRotation: variable.locked,
        });
        textObject.data = { id: variable.id };
        attachObjectListeners(textObject);
        canvas.add(textObject);
      } else {
        textObject.set({
          left: variable.x,
          top: variable.y,
          originX: resolveOriginX(variable.textAlign),
          originY: "top",
          fontSize: variable.fontSize,
          fontFamily: variable.fontFamily,
          fontWeight: variable.fontWeight,
          fontStyle: variable.fontStyle,
          fill: variable.color,
          angle: variable.rotation,
          textAlign: variable.textAlign,
          charSpacing: variable.letterSpacing * 1000,
          lineHeight: variable.lineHeight || 1.2,
          selectable: true,
          hasControls: !variable.locked,
          scaleX: 1,
          scaleY: 1,
          lockMovementX: variable.locked,
          lockMovementY: variable.locked,
          lockScalingX: variable.locked,
          lockScalingY: variable.locked,
          lockRotation: variable.locked,
        });
        if (textObject.text !== textToRender) {
          textObject.text = textToRender;
        }
      }
    });

    if (selectedVariableId) {
      const activeObject = canvas
        .getObjects()
        .find((object) => object.data?.id === selectedVariableId);
      if (activeObject) {
        canvas.setActiveObject(activeObject);
      }
    }

    requestAnimationFrame(() => {
      canvas.renderAll();
      isApplyingPreviewRef.current = false;
    });
  }, [variables, selectedVariableId, template, attachObjectListeners, previewTextMap]);

  return { canvasElementRef };
}
