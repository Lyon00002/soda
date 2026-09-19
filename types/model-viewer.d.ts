import type { DetailedHTMLProps, HTMLAttributes, RefAttributes } from 'react';

/**
 * Minimal surface of the <model-viewer> custom element that this project actually
 * touches. Kept deliberately narrow: every member below is read or written
 * somewhere in lib/three or components/3d.
 *
 * @see https://modelviewer.dev/docs/
 */
export interface ModelViewerTexture {
  readonly name: string;
}

export interface ModelViewerTextureInfo {
  setTexture(texture: ModelViewerTexture | null): void;
  readonly texture: ModelViewerTexture | null;
}

export interface ModelViewerPBR {
  readonly baseColorTexture: ModelViewerTextureInfo | null;
  setBaseColorFactor(rgba: [number, number, number, number] | string): void;
  setMetallicFactor(value: number): void;
  setRoughnessFactor(value: number): void;
}

export interface ModelViewerMaterial {
  readonly name: string;
  readonly pbrMetallicRoughness: ModelViewerPBR;
}

export interface ModelViewerModel {
  readonly materials: ModelViewerMaterial[];
}

export interface ModelViewerElement extends HTMLElement {
  src: string | null;
  cameraOrbit: string;
  fieldOfView: string;
  exposure: number;
  readonly model: ModelViewerModel | null;
  readonly loaded: boolean;
  createTexture(uri: string, type?: string): Promise<ModelViewerTexture>;
  dismissPoster(): void;
}

/** Attributes we set declaratively in JSX. */
export interface ModelViewerAttributes
  extends HTMLAttributes<ModelViewerElement> {
  src?: string;
  alt?: string;
  poster?: string;
  exposure?: string | number;
  'shadow-intensity'?: string | number;
  'environment-image'?: string;
  'camera-orbit'?: string;
  'field-of-view'?: string;
  'interaction-prompt'?: string;
  'disable-zoom'?: boolean;
  'camera-controls'?: boolean;
  'disable-pan'?: boolean;
  'disable-tap'?: boolean;
  'touch-action'?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'manual' | 'interaction';
  'ar-status'?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        ModelViewerAttributes,
        ModelViewerElement
      > &
        RefAttributes<ModelViewerElement>;
    }
  }
}
