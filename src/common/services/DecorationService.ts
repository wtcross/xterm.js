/**
 * Copyright (c) 2022 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { EventEmitter } from 'common/EventEmitter';
import { Disposable } from 'common/Lifecycle';
import { IDecorationService, IInternalDecoration } from 'common/services/Services';
import { IColorRGB } from 'common/Types';
import { IDecorationOptions, IDecoration, IMarker, IEvent } from 'xterm';

export class DecorationService extends Disposable implements IDecorationService {
  public serviceBrand: any;

  private readonly _decorations: IInternalDecoration[] = [];

  private _onDecorationRegistered = this.register(new EventEmitter<IInternalDecoration>());
  public get onDecorationRegistered(): IEvent<IInternalDecoration> { return this._onDecorationRegistered.event; }
  private _onDecorationRemoved = this.register(new EventEmitter<IInternalDecoration>());
  public get onDecorationRemoved(): IEvent<IInternalDecoration> { return this._onDecorationRemoved.event; }

  public get decorations(): IterableIterator<IInternalDecoration> { return this._decorations.values(); }

  constructor() {
    super();
  }

  public registerDecoration(options: IDecorationOptions): IDecoration | undefined {
    if (options.marker.isDisposed) {
      return undefined;
    }
    const decoration = new Decoration(options);
    if (decoration) {
      decoration.onDispose(() => {
        if (decoration) {
          const index = this._decorations.indexOf(decoration);
          if (index >= 0) {
            this._decorations.splice(this._decorations.indexOf(decoration), 1);
            this._onDecorationRemoved.fire(decoration);
          }
        }
      });
      this._decorations.push(decoration);
      this._onDecorationRegistered.fire(decoration);
    }
    return decoration;
  }

  public *getDecorationsOnLine(line: number): IterableIterator<IInternalDecoration> {
    // TODO: This could be made much faster if _decorations was sorted by line (and col?)
    for (const d of this.decorations) {
      if (d.marker.line === line) {
        yield d;
      }
    }
  }

  public dispose(): void {
    for (const decoration of this._decorations) {
      this._onDecorationRemoved.fire(decoration);
      decoration.dispose();
    }
    this._decorations.length = 0;
  }
}

class Decoration extends Disposable implements IInternalDecoration {
  public readonly marker: IMarker;
  public element: HTMLElement | undefined;
  public isDisposed: boolean = false;

  public readonly onRenderEmitter = this.register(new EventEmitter<HTMLElement>());
  public readonly onRender = this.onRenderEmitter.event;
  private _onDispose = this.register(new EventEmitter<void>());
  public readonly onDispose = this._onDispose.event;

  // TODO: React to changes on options
  private _cachedBg: IColorRGB | undefined | null = null;
  public get backgroundColorRGB(): IColorRGB | undefined {
    if (this._cachedBg === null) {
      if (this.options.backgroundColor) {
        this._cachedBg = toColorRGB(this.options.backgroundColor);
      } else {
        this._cachedBg = undefined;
      }
    }
    return this._cachedBg;
  }

  // TODO: React to changes on options
  private _cachedFg: IColorRGB | undefined | null = null;
  public get foregroundColorRGB(): IColorRGB | undefined {
    if (this._cachedFg === null) {
      if (this.options.foregroundColor) {
        this._cachedFg = toColorRGB(this.options.foregroundColor);
      } else {
        this._cachedFg = undefined;
      }
    }
    return this._cachedFg;
  }

  constructor(
    public readonly options: IDecorationOptions
  ) {
    super();
    this.marker = options.marker;
    if (this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position) {
      this.options.overviewRulerOptions.position = 'full';
    }
  }

  public override dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._onDispose.fire();
    super.dispose();
  }
}

function toColorRGB(css: string): IColorRGB {
  // #rrggbb
  if (css.length === 7) {
    return [parseInt(css.slice(1, 3), 16), parseInt(css.slice(3, 5), 16), parseInt(css.slice(5, 7), 16)];
  }
  throw new Error('css.toColor: Unsupported css format');
}
