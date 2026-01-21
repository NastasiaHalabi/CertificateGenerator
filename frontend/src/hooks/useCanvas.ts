import { useCallback, useEffect, useRef } from "react";
import { Canvas, FabricObject, IText, Image as FabricImage, Textbox } from "fabric";
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

function getObjectId(object: FabricObject): string | undefined {
  return (object as FabricObject & { data?: { id?: string } }).data?.id;
}

function normalizeAlign(
  align?: IText["textAlign"],
): TextVariable["textAlign"] {
  if (align === "center" || align === "right") return align;
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
  const isSyncPausedRef = useRef(false);
  const selectionScale = 1.08;

  const syncVariableFromObject = useCallback(
    (object: FabricObject) => {
      if (isApplyingPreviewRef.current || isSyncPausedRef.current) return;
      const id = getObjectId(object);
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
        textAlign: normalizeAlign(textObject.textAlign),
        letterSpacing: (textObject.charSpacing || 0) / 1000,
        lineHeight: textObject.lineHeight || 0,
        wrapWidth:
          textObject.type === "textbox" && textObject.width ? textObject.width : undefined,
      });
    },
    [onUpdate],
  );

  const attachObjectListeners = useCallback(
    (textObject: IText | Textbox) => {
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
        onSelect(getObjectId(selected as FabricObject) || null);
      });
      canvas.on("selection:updated", (event) => {
        const selected = event.selected?.[0];
        onSelect(getObjectId(selected as FabricObject) || null);
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
      const id = getObjectId(object);
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
        .find((object) => getObjectId(object) === variable.id) as IText | Textbox | undefined;
      const isTextbox = textObject?.type === "textbox";

      if (textObject && variable.wrapText && !isTextbox) {
        canvas.remove(textObject);
        textObject = undefined;
      }
      if (textObject && !variable.wrapText && isTextbox) {
        canvas.remove(textObject);
        textObject = undefined;
      }

      if (!textObject) {
        const textProps = {
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
          hasBorders: false,
          selectable: true,
          scaleX: 1,
          scaleY: 1,
          lockMovementX: variable.locked,
          lockMovementY: variable.locked,
          lockScalingX: variable.locked,
          lockScalingY: variable.locked,
          lockRotation: variable.locked,
        };
        textObject = variable.wrapText
          ? new Textbox(textToRender, {
              ...textProps,
              width: variable.wrapWidth,
              splitByGrapheme: true,
            })
          : new IText(textToRender, textProps);
        (textObject as FabricObject & { data?: { id?: string } }).data = { id: variable.id };
        attachObjectListeners(textObject);
        canvas.add(textObject);
      } else {
        const nextProps = {
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
        };
        if (textObject.type === "textbox") {
          textObject.set({
            ...nextProps,
            width: variable.wrapWidth,
            splitByGrapheme: true,
          });
        } else {
          textObject.set(nextProps);
        }
        if (textObject.text !== textToRender) {
          textObject.text = textToRender;
        }
      }
    });

    const selectableObjects = canvas.getObjects().filter((object) => getObjectId(object));
    const orderedVariables = [...variables].sort((a, b) => {
      if (a.layer === b.layer) return 0;
      return a.layer === "back" ? -1 : 1;
    });
    const orderedObjects = orderedVariables
      .map((variable) => selectableObjects.find((item) => getObjectId(item) === variable.id))
      .filter((object): object is FabricObject => Boolean(object));
    if (orderedObjects.length > 0) {
      selectableObjects.forEach((object) => canvas.remove(object));
      orderedObjects.forEach((object) => canvas.add(object));
    }
    isSyncPausedRef.current = true;
    selectableObjects.forEach((object) => {
      const isSelected = getObjectId(object) === selectedVariableId;
      object.set({
        hasBorders: isSelected,
        borderColor: isSelected ? "#2563eb" : undefined,
        cornerColor: isSelected ? "#2563eb" : undefined,
        backgroundColor: isSelected ? "rgba(37, 99, 235, 0.12)" : "",
        stroke: isSelected ? "#2563eb" : undefined,
        strokeWidth: isSelected ? 1 : 0,
        scaleX: isSelected ? selectionScale : 1,
        scaleY: isSelected ? selectionScale : 1,
      });
      object.setCoords();
    });
    if (selectedVariableId) {
      const activeObject = selectableObjects.find(
        (object) => getObjectId(object) === selectedVariableId,
      );
      if (activeObject) {
        canvas.setActiveObject(activeObject);
      }
    } else {
      canvas.discardActiveObject();
    }
    isSyncPausedRef.current = false;

    requestAnimationFrame(() => {
      canvas.renderAll();
      isApplyingPreviewRef.current = false;
    });
  }, [variables, selectedVariableId, template, attachObjectListeners, previewTextMap]);

  return { canvasElementRef };
}
