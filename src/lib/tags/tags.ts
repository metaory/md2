import {
  AfterContentInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Output,
  ViewEncapsulation,
  NgModule,
  ModuleWithProviders
} from '@angular/core';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  coerceBooleanProperty,
  KeyCodes
} from '../core/core';
import { Md2AutocompleteModule } from '../autocomplete/autocomplete';

var win = typeof window !== 'undefined' && window || <any>{};
export const KeyboardEvent = win['KeyboardEvent'];
export const Event = win['Event'];

const noop = () => { };

let nextId = 0;

class Tag {
  public text: string;
  public value: string;

  constructor(source: any, textKey: string, valueKey: string) {
    if (typeof source === 'string') {
      this.text = this.value = source;
    }
    if (typeof source === 'object') {
      this.text = source[textKey];
      this.value = valueKey ? source[valueKey] : source;
    }
  }
}

export const MD2_TAGS_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => Md2Tags),
  multi: true
};

@Component({
  moduleId: module.id,
  selector: 'md2-tags',
  template: `
    <div class="md2-tags-container">
      <span *ngFor="let t of items; let i = index;" class="md2-tag" [class.active]="selectedTag === i" (click)="_selectTag(i)">
        <span class="md2-tag-text">{{t.text}}</span>
        <svg (click)="_removeTagAndFocusInput(i)" width="24" height="24" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </span>
      <span class="md2-tag-add">
        <input [(ngModel)]="tagBuffer" type="text" tabs="false" autocomplete="off" tabindex="-1" [disabled]="disabled" class="md2-tags-input" [placeholder]="placeholder" (focus)="_onInputFocus()" (blur)="_onInputBlur()" (keydown)="_handleInputKeydown($event)" (change)="$event.stopPropagation()" />
        <ul *ngIf="isMenuVisible" class="md2-tags-menu" (mouseenter)="_listEnter()" (mouseleave)="_listLeave()">
          <li class="md2-option" *ngFor="let l of list; let i = index;" [class.focused]="focusedTag === i" (click)="addTag($event, i)">
            <span class="md2-option-text" [innerHtml]="l.text | highlight:tagBuffer"></span>
          </li>
        </ul>
      </span>
    </div>
  `,
  styleUrls: ['tags.css'],
  host: {
    'role': 'tags',
    '[id]': 'id',
    '[class.focus]': 'inputFocused || selectedTag >= 0',
    '[class.md2-tags-disabled]': 'disabled',
    '[tabindex]': 'disabled ? -1 : tabindex',
    '[attr.aria-disabled]': 'disabled'
  },
  providers: [MD2_TAGS_CONTROL_VALUE_ACCESSOR],
  encapsulation: ViewEncapsulation.None
})

export class Md2Tags implements AfterContentInit, ControlValueAccessor {

  constructor(private element: ElementRef) { }

  ngAfterContentInit() { this._isInitialized = true; }

  @Output() change: EventEmitter<any> = new EventEmitter<any>();

  private _value: any = '';
  private _disabled: boolean = false;
  private _isInitialized: boolean = false;
  private _onTouchedCallback: () => void = noop;
  private _onChangeCallback: (_: any) => void = noop;

  private _tags: Array<any> = [];
  private list: Array<Tag> = [];
  private items: Array<Tag> = [];

  private focusedTag: number = 0;
  private selectedTag: number = -1;
  private tagBuffer: string = '';
  private inputFocused: boolean = false;
  private noBlur: boolean = true;

  @Input() id: string = 'md2-tags-' + (++nextId);
  @Input() tabindex: number = 0;
  @Input() placeholder: string = '';
  @Input('md2-tag-text') textKey: string = 'text';
  @Input('md2-tag-value') valueKey: string = null;

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value) { this._disabled = coerceBooleanProperty(value); }

  @Input('md2-tags')
  set tags(value: Array<any>) { this._tags = value; }

  @Input()
  get value(): any { return this._value; }
  set value(value: any) { this.setValue(value); }

  /**
   * setup value
   * @param value
   */
  private setValue(value: any) {
    if (value !== this._value) {
      this._value = value;
      this.items = [];
      if (value && value.length && typeof value === 'object' && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          let selItm = this._tags.find((t: any) => this.equals(this.valueKey ? t[this.valueKey] : t, value[i]));
          if (selItm) { this.items.push(new Tag(selItm, this.textKey, this.valueKey)); }
        }
      }
      if (this._isInitialized) {
        this._onChangeCallback(value);
        this.change.emit(this._value);
      }
    }
  }

  /**
   * Compare two vars or objects
   * @param o1 compare first object
   * @param o2 compare second object
   * @return boolean comparation result
   */
  private equals(o1: any, o2: any) {
    if (o1 === o2) { return true; }
    if (o1 === null || o2 === null) { return false; }
    if (o1 !== o1 && o2 !== o2) { return true; }
    let t1 = typeof o1, t2 = typeof o2, key: any, keySet: any;
    if (t1 === t2 && t1 === 'object') {
      keySet = Object.create(null);
      for (key in o1) {
        if (!this.equals(o1[key], o2[key])) { return false; }
        keySet[key] = true;
      }
      for (key in o2) {
        if (!(key in keySet) && key.charAt(0) !== '$' && o2[key]) { return false; }
      }
      return true;
    }
    return false;
  }

  get isMenuVisible(): boolean {
    return ((this.inputFocused || this.noBlur) && this.tagBuffer && this.list && this.list.length) ? true : false;
  }

  /**
   * update scroll of tags suggestion menu
   */
  private updateScroll() {
    if (this.focusedTag < 0) { return; }
    let menuContainer = this.element.nativeElement.querySelector('.md2-tags-menu');
    if (!menuContainer) { return; }

    let choices = menuContainer.querySelectorAll('.md2-option');
    if (choices.length < 1) { return; }

    let highlighted: any = choices[this.focusedTag];
    if (!highlighted) { return; }

    let top: number = highlighted.offsetTop + highlighted.clientHeight - menuContainer.scrollTop;
    let height: number = menuContainer.offsetHeight;

    if (top > height) {
      menuContainer.scrollTop += top - height;
    } else if (top < highlighted.clientHeight) {
      menuContainer.scrollTop -= highlighted.clientHeight - top;
    }
  }

  /**
   * input key listener
   * @param event
   */
  private _handleInputKeydown(event: KeyboardEvent) {
    // Backspace
    if (event.keyCode === 8 && !this.tagBuffer) {
      event.preventDefault();
      event.stopPropagation();
      if (this.items.length && this.selectedTag < 0) { this.selectAndFocusTagSafe(this.items.length - 1); }
      if (this.items.length && this.selectedTag > -1) { this.removeAndSelectAdjacentTag(this.selectedTag); }
      return;
    }
    // Del Key
    if (event.keyCode === 46 && !this.tagBuffer) { return; }
    // Left / Right Arrow
    if ((event.keyCode === 37 || event.keyCode === 39) && !this.tagBuffer) { return; }
    // Down Arrow
    if (event.keyCode === 40) {
      if (!this.isMenuVisible) { return; }
      event.stopPropagation();
      event.preventDefault();
      this.focusedTag = (this.focusedTag === this.list.length - 1) ? 0 : Math.min(this.focusedTag + 1, this.list.length - 1);
      this.updateScroll();
      return;
    }
    // Up Arrow
    if (event.keyCode === 38) {
      if (!this.isMenuVisible) { return; }
      event.stopPropagation();
      event.preventDefault();
      this.focusedTag = (this.focusedTag === 0) ? this.list.length - 1 : Math.max(0, this.focusedTag - 1);
      this.updateScroll();
      return;
    }
    // Tab Key
    if (event.keyCode === 9) { return; }
    // Enter / Space
    if (event.keyCode === 13 || event.keyCode === 32) {
      if (!this.tagBuffer || !this.isMenuVisible) { event.preventDefault(); return; }
      event.preventDefault();
      this.addTag(event, this.focusedTag);
      return;
    }
    // Escape Key
    if (event.keyCode === 27) {
      event.stopPropagation();
      event.preventDefault();
      if (this.tagBuffer) { this.tagBuffer = ''; }
      if (this.selectedTag >= 0) { this.onFocus(); }
      return;
    }
    // reset selected tag
    if (this.selectedTag >= 0) { this.resetselectedTag(); }
    // filter
    setTimeout(() => {
      this.filterMatches(new RegExp(this.tagBuffer, 'ig'));
    }, 10);
  }

  @HostListener('keydown', ['$event'])
  private _handleKeydown(event: KeyboardEvent) {
    if (this.disabled || this.tagBuffer) { return; }
    switch (event.keyCode) {
      case KeyCodes.BACKSPACE:
      case KeyCodes.DELETE:
        if (this.selectedTag < 0) { return; }
        event.preventDefault();
        this.removeAndSelectAdjacentTag(this.selectedTag);
        break;

      case KeyCodes.TAB:
      case KeyCodes.ESCAPE:
        if (this.selectedTag < 0) { return; }
        event.preventDefault();
        this.onFocus();
        break;

      case KeyCodes.LEFT_ARROW:
        event.preventDefault();
        if (this.selectedTag < 0) { this.selectedTag = this.items.length; }
        if (this.items.length) { this.selectAndFocusTagSafe(this.selectedTag - 1); }
        break;
      case KeyCodes.RIGHT_ARROW:
        event.preventDefault();
        if (this.selectedTag >= this.items.length) { this.selectedTag = -1; }
        this.selectAndFocusTagSafe(this.selectedTag + 1);
        break;
    }
  }

  private removeAndSelectAdjacentTag(index: number) {
    var selIndex = this.getAdjacentTagIndex(index);
    this.removeTag(index);
    this.selectAndFocusTagSafe(selIndex);
  }

  private resetselectedTag() {
    this.selectedTag = -1;
  }

  private getAdjacentTagIndex(index: number) {
    var len = this.items.length - 1;
    return (len === 0) ? -1 :
      (index === len) ? index - 1 : index;
  }

  /**
   * add tag
   * @param event
   * @param index index of the specific tag
   */
  private addTag(event: Event, index: number) {
    event.preventDefault();
    event.stopPropagation();
    this.items.push(this.list[index]);
    this.tagBuffer = '';
    this.updateValue();
  }

  private _removeTagAndFocusInput(index: number) {
    this.removeTag(index);
    this.onFocus();
  }

  /**
   * remove tag
   * @param index
   */
  private removeTag(index: number) {
    this.items.splice(index, 1);
    this.updateValue();
  }

  /**
   * update value
   */
  private updateValue() {
    this._value = new Array<any>();
    for (let i = 0; i < this.items.length; i++) {
      this._value.push(this.items[i].value);
    }
    this._onChangeCallback(this._value);
    this.change.emit(this._value);
  }

  private selectAndFocusTagSafe = function (index: number) {
    if (!this.items.length) {
      this._selectTag(-1);
      this.onFocus();
      return;
    }
    if (index === this.items.length) { return this.onFocus(); }
    index = Math.max(index, 0);
    index = Math.min(index, this.items.length - 1);
    this._selectTag(index);
  };

  /**
   * select tag
   * @param index of select tag
   */
  private _selectTag(index: number) {
    if (index >= -1 && index <= this.items.length) {
      this.selectedTag = index;
    }
  }

  @HostListener('focus')
  private onFocus() {
    this.element.nativeElement.querySelector('input').focus();
    this.resetselectedTag();
  }

  private _onInputFocus() {
    this.inputFocused = true;
    this.resetselectedTag();
  }

  private _onInputBlur() {
    this.inputFocused = false;
  }

  private _listEnter() { this.noBlur = true; }

  private _listLeave() { this.noBlur = false; }

  /**
   * update suggestion menu with filter
   * @param query
   */
  private filterMatches(query: RegExp) {
    let tempList = this._tags.map((tag: any) => new Tag(tag, this.textKey, this.valueKey));
    this.list = tempList.filter((t: Tag) => (query.test(t.text) && !this.items.find((i: Tag) => t.text === i.text)));
    if (this.list.length > 0) {
      this.focusedTag = 0;
    }
  }

  writeValue(value: any) {
    if (value !== this._value) {
      this._value = value;
      this.items = [];
      if (value && value.length && typeof value === 'object' && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          let selItm = this._tags.find((t: any) => this.equals(this.valueKey ? t[this.valueKey] : t, value[i]));
          if (selItm) { this.items.push(new Tag(selItm, this.textKey, this.valueKey)); }
        }
      }
    }
  }

  registerOnChange(fn: any) { this._onChangeCallback = fn; }

  registerOnTouched(fn: any) { this._onTouchedCallback = fn; }
}

export const MD2_TAGS_DIRECTIVES = [Md2Tags];

@NgModule({
  imports: [CommonModule, FormsModule, Md2AutocompleteModule],
  exports: MD2_TAGS_DIRECTIVES,
  declarations: MD2_TAGS_DIRECTIVES,
})
export class Md2TagsModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: Md2TagsModule,
      providers: []
    };
  }
}
