import {
  AfterContentInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ViewEncapsulation,
  NgModule,
  ModuleWithProviders
} from '@angular/core';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  FormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Md2DateUtil } from './dateUtil';

import {
  coerceBooleanProperty,
  KeyCodes
} from '../core/core';

export interface IDay {
  year: number;
  month: string;
  date: string;
  day: string;
  hour: string;
  minute: string;
}

export interface IDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface IWeek {
  dateObj: IDate;
  date: Date;
  calMonth: number;
  today: boolean;
  disabled: boolean;
}

const noop = () => { };

// import { global } from '@angular/core/src/facade/lang';
// const MouseEvent = (global as any).MouseEvent as MouseEvent;

var win = typeof window !== 'undefined' && window || <any>{};
export const MouseEvent = win['MouseEvent'];
export const KeyboardEvent = win['KeyboardEvent'];
export const Event = win['Event']

// export const Event = win['Event'];
// export const EventTarget = win['EventTarget'];
// export const History = win['History'];
// export const Location = win['Location'];
// export const EventListener = win['EventListener'];



let nextId = 0;

export const MD2_DATEPICKER_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => Md2Datepicker),
  multi: true
};

@Component({
  moduleId: module.id,
  selector: 'md2-datepicker',
  templateUrl: 'datepicker.html',
  styleUrls: ['datepicker.css'],
  providers: [MD2_DATEPICKER_CONTROL_VALUE_ACCESSOR],
  host: {
    'role': 'datepicker',
    '[id]': 'id',
    '[class]': 'class',
    '[class.md2-datepicker-disabled]': 'disabled',
    '[tabindex]': 'disabled ? -1 : tabindex',
    '[attr.aria-disabled]': 'disabled'
  },
  encapsulation: ViewEncapsulation.None
})
export class Md2Datepicker implements AfterContentInit, ControlValueAccessor {

  constructor(private dateUtil: Md2DateUtil, private element: ElementRef) {
    this.getYears();
    this.generateClock();
    // this.mouseMoveListener = (event: MouseEvent) => { this.onMouseMoveClock(event); };
    // this.mouseUpListener = (event: MouseEvent) => { this.onMouseUpClock(event); };
  }

  ngAfterContentInit() {
    this._isInitialized = true;
    this.isCalendarVisible = this.type !== 'time' ? true : false;
  }

  // private mouseMoveListener: any;
  // private mouseUpListener: any;

  private _value: Date = null;
  private _readonly: boolean;
  private _required: boolean;
  private _disabled: boolean = false;
  private _isInitialized: boolean = false;
  private _onTouchedCallback: () => void = noop;
  private _onChangeCallback: (_: any) => void = noop;

  public isDatepickerVisible: boolean;
  public isYearsVisible: boolean;
  public isCalendarVisible: boolean;
  public isHoursVisible: boolean = true;

  private months: Array<string> = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  public days: Array<string> = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  public hours: Array<Object> = [];
  public minutes: Array<Object> = [];

  private prevMonth: number = 1;
  private currMonth: number = 2;
  private nextMonth: number = 3;

  public years: Array<number> = [];
  public dates: Array<Object> = [];
  private today: Date = new Date();
  private _displayDate: Date = null;
  private selectedDate: Date = null;
  public displayDay: IDay = { year: 0, month: '', date: '', day: '', hour: '', minute: '' };
  public displayInputDate: string = '';

  public clock: any = {
    dialRadius: 120,
    outerRadius: 99,
    innerRadius: 66,
    tickRadius: 17,
    hand: { x: 0, y: 0 },
    x: 0, y: 0,
    dx: 0, dy: 0,
    moved: false
  };

  private _minDate: Date = null;
  private _maxDate: Date = null;

  @Output() change: EventEmitter<any> = new EventEmitter<any>();

  @Input() type: 'date' | 'time' | 'datetime' = 'date';
  @Input() name: string = '';
  @Input() id: string = 'md2-datepicker-' + (++nextId);
  @Input() class: string;
  @Input() placeholder: string;
  @Input() format: string = this.type === 'date' ? 'DD/MM/YYYY' : this.type === 'time' ? 'HH:mm' : this.type === 'datetime' ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';
  @Input() tabindex: number = 0;

  @Input()
  get readonly(): boolean { return this._readonly; }
  set readonly(value) { this._readonly = coerceBooleanProperty(value); }

  @Input()
  get required(): boolean { return this._required; }
  set required(value) { this._required = coerceBooleanProperty(value); }

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value) { this._disabled = coerceBooleanProperty(value); }

  @Input() set min(value: string) {
    this._minDate = new Date(value);
    this._minDate.setHours(0, 0, 0, 0);
    this.getYears();
  }
  @Input() set max(value: string) {
    this._maxDate = new Date(value);
    this._maxDate.setHours(0, 0, 0, 0);
    this.getYears();
  }

  @Input()
  get value(): any { return this._value; }
  set value(value: any) {
    if (value && value !== this._value) {
      if (this.dateUtil.isValidDate(value)) {
        this._value = value;
      } else {
        if (this.type === 'time') {
          this._value = new Date('1-1-1 ' + value);
        } else {
          this._value = new Date(value);
        }
      }
      this.displayInputDate = this._formatDate(this._value);
      let date = '';
      if (this.type !== 'time') {
        date += this._value.getFullYear() + '-' + (this._value.getMonth() + 1) + '-' + this._value.getDate();
      }
      if (this.type === 'datetime') {
        date += ' ';
      }
      if (this.type !== 'date') {
        date += this._value.getHours() + ':' + this._value.getMinutes();
      }
      if (this._isInitialized) {
        this._onChangeCallback(date);
        this.change.emit(date);
      }
    }
  }

  get displayDate(): Date {
    if (this._displayDate && this.dateUtil.isValidDate(this._displayDate)) {
      return this._displayDate;
    } else {
      return this.today;
    }
  }
  set displayDate(date: Date) {
    if (date && this.dateUtil.isValidDate(date)) {
      if (this._minDate && this._minDate > date) {
        date = this._minDate;
      }
      if (this._maxDate && this._maxDate < date) {
        date = this._maxDate;
      }
      this._displayDate = date;
      this.displayDay = {
        year: date.getFullYear(),
        month: this.months[date.getMonth()],
        date: this._prependZero(date.getDate() + ''),
        day: this.days[date.getDay()],
        hour: this._prependZero(date.getHours() + ''),
        minute: this._prependZero(date.getMinutes() + '')
      };
    }
  }

  @HostListener('click', ['$event'])
  _handleClick(event: MouseEvent) {
    if (this.disabled) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
  }

  @HostListener('keydown', ['$event'])
  _handleKeydown(event: KeyboardEvent) {
    if (this.disabled) { return; }

    if (this.isDatepickerVisible) {
      event.preventDefault();
      event.stopPropagation();

      switch (event.keyCode) {
        case KeyCodes.TAB:
        case KeyCodes.ESCAPE: this.onBlur(); break;
      }
      let displayDate = this.displayDate;
      if (this.isYearsVisible) {
        switch (event.keyCode) {
          case KeyCodes.ENTER:
          case KeyCodes.SPACE: this._onClickOk(); break;

          case KeyCodes.DOWN_ARROW:
            if (this.displayDate.getFullYear() < (this.today.getFullYear() + 100)) {
              this.displayDate = this.dateUtil.incrementYears(displayDate, 1);
              this._scrollToSelectedYear();
            }
            break;
          case KeyCodes.UP_ARROW:
            if (this.displayDate.getFullYear() > 1900) {
              this.displayDate = this.dateUtil.incrementYears(displayDate, -1);
              this._scrollToSelectedYear();
            }
            break;
        }

      } else if (this.isCalendarVisible) {
        switch (event.keyCode) {
          case KeyCodes.ENTER:
          case KeyCodes.SPACE: this.setDate(this.displayDate); break;

          case KeyCodes.RIGHT_ARROW: this.displayDate = this.dateUtil.incrementDays(displayDate, 1); break;
          case KeyCodes.LEFT_ARROW: this.displayDate = this.dateUtil.incrementDays(displayDate, -1); break;

          case KeyCodes.PAGE_DOWN: this.displayDate = this.dateUtil.incrementMonths(displayDate, 1); break;
          case KeyCodes.PAGE_UP: this.displayDate = this.dateUtil.incrementMonths(displayDate, -1); break;

          case KeyCodes.DOWN_ARROW: this.displayDate = this.dateUtil.incrementDays(displayDate, 7); break;
          case KeyCodes.UP_ARROW: this.displayDate = this.dateUtil.incrementDays(displayDate, -7); break;

          case KeyCodes.HOME: this.displayDate = this.dateUtil.getFirstDateOfMonth(displayDate); break;
          case KeyCodes.END: this.displayDate = this.dateUtil.getLastDateOfMonth(displayDate); break;
        }
        if (!this.dateUtil.isSameMonthAndYear(displayDate, this.displayDate)) {
          this.generateCalendar();
        }
      } else if (this.isHoursVisible) {
        switch (event.keyCode) {
          case KeyCodes.ENTER:
          case KeyCodes.SPACE: this.setHour(this.displayDate.getHours()); break;

          case KeyCodes.UP_ARROW: this.displayDate = this.dateUtil.incrementHours(displayDate, 1); this._resetClock(); break;
          case KeyCodes.DOWN_ARROW: this.displayDate = this.dateUtil.incrementHours(displayDate, -1); this._resetClock(); break;
        }
      } else {
        switch (event.keyCode) {
          case KeyCodes.ENTER:
          case KeyCodes.SPACE: this.setMinute(this.displayDate.getMinutes()); break;

          case KeyCodes.UP_ARROW: this.displayDate = this.dateUtil.incrementMinutes(displayDate, 1); this._resetClock(); break;
          case KeyCodes.DOWN_ARROW: this.displayDate = this.dateUtil.incrementMinutes(displayDate, -1); this._resetClock(); break;
        }
      }
    } else {
      switch (event.keyCode) {
        case KeyCodes.ENTER:
        case KeyCodes.SPACE:
          event.preventDefault();
          event.stopPropagation();
          this.showDatepicker();
          break;
      }
    }
  }

  @HostListener('blur')
  public onBlur() {
    this.isDatepickerVisible = false;
    this.isYearsVisible = false;
    this.isCalendarVisible = this.type !== 'time' ? true : false;
    this.isHoursVisible = true;
  }
  /**
   * Display Years
   */
  public _showYear() {
    this.isYearsVisible = true;
    this.isCalendarVisible = true;
    this._scrollToSelectedYear();
  }

  private getYears() {
    let startYear = this._minDate ? this._minDate.getFullYear() : 1900,
      endYear = this._maxDate ? this._maxDate.getFullYear() : this.today.getFullYear() + 100;
    this.years = [];
    for (let i = startYear; i <= endYear; i++) {
      this.years.push(i);
    }
  }

  private _scrollToSelectedYear() {
    setTimeout(() => {
      let yearContainer = this.element.nativeElement.querySelector('.md2-years'),
        selectedYear = this.element.nativeElement.querySelector('.md2-year.selected');
      yearContainer.scrollTop = (selectedYear.offsetTop + 20) - yearContainer.clientHeight / 2;
    }, 0);
  }

  /**
   * select year
   * @param year
   */
  private _setYear(year: number) {
    let date = this.displayDate;
    this.displayDate = new Date(year, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
    this.generateCalendar();
    this.isYearsVisible = false;
    // this.isCalendarVisible = true;
  }

  /**
   * Display Datepicker
   */
  public showDatepicker() {
    if (this.disabled || this.readonly) { return; }
    this.isDatepickerVisible = true;
    this.selectedDate = this.value || new Date(1, 0, 1);
    this.displayDate = this.value || this.today;
    this.generateCalendar();
    this._resetClock();
    this.element.nativeElement.focus();
  }

  /**
   * Display Calendar
   */
  public _showCalendar() {
    this.isYearsVisible = false;
    this.isCalendarVisible = true;
  }

  /**
   * Toggle Hour visiblity
   */
  public _toggleHours(value: boolean) {
    this.isYearsVisible = false;
    this.isCalendarVisible = false;
    this.isYearsVisible = false;
    this.isHoursVisible = value;
    this._resetClock();
  }

  /**
   * Ok Button Event
   */
  public _onClickOk() {
    if (this.isYearsVisible) {
      this.generateCalendar();
      this.isYearsVisible = false;
      this.isCalendarVisible = true;
    } else if (this.isCalendarVisible) {
      this.setDate(this.displayDate);
    } else if (this.isHoursVisible) {
      this.isHoursVisible = false;
      this._resetClock();
    } else {
      this.value = this.displayDate;
      this.onBlur();
    }
  }

  /**
   * Date Selection Event
   * @param event Event Object
   * @param date Date Object
   */
  private _onClickDate(event: Event, date: any) {
    event.preventDefault();
    event.stopPropagation();
    if (date.disabled) { return; }
    if (date.calMonth === this.prevMonth) {
      this.updateMonth(-1);
    } else if (date.calMonth === this.currMonth) {
      this.setDate(new Date(date.dateObj.year, date.dateObj.month, date.dateObj.day, this.displayDate.getHours(), this.displayDate.getMinutes()));
    } else if (date.calMonth === this.nextMonth) {
      this.updateMonth(1);
    }
  }

  /**
   * Set Date
   * @param date Date Object
   */
  private setDate(date: Date) {
    if (this.type === 'date') {
      this.value = date;
      this.onBlur();
    } else {
      this.selectedDate = date;
      this.displayDate = date;
      this.isCalendarVisible = false;
      this.isHoursVisible = true;
      this._resetClock();
    }
  }

  /**
   * Update Month
   * @param noOfMonths increment number of months
   */
  public updateMonth(noOfMonths: number) {
    this.displayDate = this.dateUtil.incrementMonths(this.displayDate, noOfMonths);
    this.generateCalendar();
  }

  /**
   * Check is Before month enabled or not
   * @return boolean
   */
  public _isBeforeMonth() {
    return !this._minDate ? true : this._minDate && this.dateUtil.getMonthDistance(this.displayDate, this._minDate) < 0;
  }

  /**
   * Check is After month enabled or not
   * @return boolean
   */
  public _isAfterMonth() {
    return !this._maxDate ? true : this._maxDate && this.dateUtil.getMonthDistance(this.displayDate, this._maxDate) > 0;
  }

  /**
   * Check the date is enabled or not
   * @param date Date Object
   * @return boolean
   */
  private _isDisabledDate(date: Date): boolean {
    if (this._minDate && this._maxDate) {
      return (this._minDate > date) || (this._maxDate < date);
    } else if (this._minDate) {
      return (this._minDate > date);
    } else if (this._maxDate) {
      return (this._maxDate < date);
    } else {
      return false;
    }

    // if (this.disableWeekends) {
    //   let dayNbr = this.getDayNumber(date);
    //   if (dayNbr === 0 || dayNbr === 6) {
    //     return true;
    //   }
    // }
    // return false;
  }

  /**
   * Generate Month Calendar
   */
  private generateCalendar(): void {
    let year = this.displayDate.getFullYear();
    let month = this.displayDate.getMonth();

    this.dates.length = 0;

    let firstDayOfMonth = this.dateUtil.getFirstDateOfMonth(this.displayDate);
    let numberOfDaysInMonth = this.dateUtil.getNumberOfDaysInMonth(this.displayDate);
    let numberOfDaysInPrevMonth = this.dateUtil.getNumberOfDaysInMonth(this.dateUtil.incrementMonths(this.displayDate, -1));

    let dayNbr = 1;
    let calMonth = this.prevMonth;
    for (let i = 1; i < 7; i++) {
      let week: IWeek[] = [];
      if (i === 1) {
        let prevMonth = numberOfDaysInPrevMonth - firstDayOfMonth.getDay() + 1;
        for (let j = prevMonth; j <= numberOfDaysInPrevMonth; j++) {
          let iDate: IDate = { year: year, month: month - 1, day: j, hour: 0, minute: 0 };
          let date: Date = new Date(year, month - 1, j);
          week.push({
            date: date,
            dateObj: iDate,
            calMonth: calMonth,
            today: this.dateUtil.isSameDay(this.today, date),
            disabled: this._isDisabledDate(date)
          });
        }

        calMonth = this.currMonth;
        let daysLeft = 7 - week.length;
        for (let j = 0; j < daysLeft; j++) {
          let iDate: IDate = { year: year, month: month, day: dayNbr, hour: 0, minute: 0 };
          let date: Date = new Date(year, month, dayNbr);
          week.push({
            date: date,
            dateObj: iDate,
            calMonth: calMonth,
            today: this.dateUtil.isSameDay(this.today, date),
            disabled: this._isDisabledDate(date)
          });
          dayNbr++;
        }
      } else {
        for (let j = 1; j < 8; j++) {
          if (dayNbr > numberOfDaysInMonth) {
            dayNbr = 1;
            calMonth = this.nextMonth;
          }
          let iDate: IDate = { year: year, month: calMonth === this.currMonth ? month : month + 1, day: dayNbr, hour: 0, minute: 0 };
          let date: Date = new Date(year, iDate.month, dayNbr);
          week.push({
            date: date,
            dateObj: iDate,
            calMonth: calMonth,
            today: this.dateUtil.isSameDay(this.today, date),
            disabled: this._isDisabledDate(date)
          });
          dayNbr++;
        }
      }
      this.dates.push(week);
    }
  }

  /**
   * Select Hour
   * @param event Event Object
   * @param hour number of hours
   */
  private _onClickHour(event: Event, hour: number) {
    event.preventDefault();
    event.stopPropagation();
    this.setHour(hour);
  }

  /**
   * Select Minute
   * @param event Event Object
   * @param minute number of minutes
   */
  private _onClickMinute(event: Event, minute: number) {
    event.preventDefault();
    event.stopPropagation();
    this.setMinute(minute);
  }

  /**
   * Set hours
   * @param hour number of hours
   */
  private setHour(hour: number) {
    let date = this.displayDate;
    this.isHoursVisible = false;
    this.displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, date.getMinutes());
    this._resetClock();
  }

  /**
   * Set minutes
   * @param minute number of minutes
   */
  private setMinute(minute: number) {
    let date = this.displayDate;
    this.displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), minute);
    this.selectedDate = this.displayDate;
    this.value = this.selectedDate;
    this.onBlur();
  }

  // private onMouseDownClock(event: MouseEvent) {
  //  document.addEventListener('mousemove', this.mouseMoveListener);
  //  document.addEventListener('mouseup', this.mouseUpListener);



  //  // let offset = this.offset(event.currentTarget)
  //  // this.clock.x = offset.left + this.clock.dialRadius;
  //  // this.clock.y = offset.top + this.clock.dialRadius;
  //  // this.clock.dx = event.pageX - this.clock.x;
  //  // this.clock.dy = event.pageY - this.clock.y;
  //  // let z = Math.sqrt(this.clock.dx * this.clock.dx + this.clock.dy * this.clock.dy);
  //  // if (z < this.clock.outerRadius - this.clock.tickRadius || z > this.clock.outerRadius + this.clock.tickRadius) { return; }
  //  // event.preventDefault();
  //  // this.setClockHand(this.clock.dx, this.clock.dy);

  //  // // this.onMouseMoveClock = this.onMouseMoveClock.bind(this);
  //  // // this.onMouseUpClock = this.onMouseUpClock.bind(this);
  //  // document.addEventListener('mousemove', this.onMouseMoveClock);
  //  // document.addEventListener('mouseup', this.onMouseUpClock);
  // }

  // onMouseMoveClock(event: MouseEvent) {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   let x = event.pageX - this.clock.x,
  //     y = event.pageY - this.clock.y;
  //   this.clock.moved = true;
  //   this._setClockHand(x, y);// , false, true
  //   // if (!moved && x === dx && y === dy) {
  //   //   // Clicking in chrome on windows will trigger a mousemove event
  //   //   return;
  //   // }
  // }

  // onMouseUpClock(event: MouseEvent) {
  //   event.preventDefault();
  //   document.removeEventListener('mousemove', this.mouseMoveListener);
  //   document.removeEventListener('mouseup', this.mouseUpListener);
  //   // let space = false;

  //   let x = event.pageX - this.clock.x,
  //     y = event.pageY - this.clock.y;
  //   if ((space || this.clockEvent.moved) && x === this.clockEvent.dx && y === this.clockEvent.dy) {
  //     this.setClockHand(x, y);
  //   }
  //   // if (this.isHoursVisible) {
  //   //   // self.toggleView('minutes', duration / 2);
  //   // } else {
  //   //   // if (options.autoclose) {
  //   //   //   self.minutesView.addClass('clockpicker-dial-out');
  //   //   //   setTimeout(function () {
  //   //   //     self.done();
  //   //   //   }, duration / 2);
  //   //   // }
  //   // }

  //   if ((space || moved) && x === dx && y === dy) {
  //     self.setHand(x, y);
  //   }
  //   if (self.currentView === 'hours') {
  //     self.toggleView('minutes', duration / 2);
  //   } else {
  //     if (options.autoclose) {
  //       self.minutesView.addClass('clockpicker-dial-out');
  //       setTimeout(function () {
  //         self.done();
  //       }, duration / 2);
  //     }
  //   }
  //   plate.prepend(canvas);

  //   // Reset cursor style of body
  //   clearTimeout(movingTimer);
  //   $body.removeClass('clockpicker-moving');

  // }

  /**
   * reser clock hands
   */
  private _resetClock() {
    let hour = this.displayDate.getHours();
    let minute = this.displayDate.getMinutes();

    let value = this.isHoursVisible ? hour : minute,
      unit = Math.PI / (this.isHoursVisible ? 6 : 30),
      radian = value * unit,
      radius = this.isHoursVisible && value > 0 && value < 13 ? this.clock.innerRadius : this.clock.outerRadius,
      x = Math.sin(radian) * radius,
      y = - Math.cos(radian) * radius;
    this._setClockHand(x, y);
  }

  /**
   * set clock hand
   * @param x number of x position
   * @param y number of y position
   */
  private _setClockHand(x: number, y: number) {
    let radian = Math.atan2(x, y),
      unit = Math.PI / (this.isHoursVisible ? 6 : 30),
      z = Math.sqrt(x * x + y * y),
      inner = this.isHoursVisible && z < (this.clock.outerRadius + this.clock.innerRadius) / 2,
      radius = inner ? this.clock.innerRadius : this.clock.outerRadius,
      value = 0;

    if (radian < 0) { radian = Math.PI * 2 + radian; }
    value = Math.round(radian / unit);
    radian = value * unit;
    if (this.isHoursVisible) {
      if (value === 12) { value = 0; }
      value = inner ? (value === 0 ? 12 : value) : value === 0 ? 0 : value + 12;
    } else {
      if (value === 60) { value = 0; }
    }

    this.clock.hand = {
      x: Math.sin(radian) * radius,
      y: Math.cos(radian) * radius
    };
  }

  /**
   * render Click
   */
  private generateClock() {
    this.hours.length = 0;

    for (let i = 0; i < 24; i++) {
      let radian = i / 6 * Math.PI;
      let inner = i > 0 && i < 13,
        radius = inner ? this.clock.innerRadius : this.clock.outerRadius;
      this.hours.push({
        hour: i === 0 ? '00' : i,
        top: this.clock.dialRadius - Math.cos(radian) * radius - this.clock.tickRadius,
        left: this.clock.dialRadius + Math.sin(radian) * radius - this.clock.tickRadius
      });
    }

    for (let i = 0; i < 60; i += 5) {
      let radian = i / 30 * Math.PI;
      this.minutes.push({
        minute: i === 0 ? '00' : i,
        top: this.clock.dialRadius - Math.cos(radian) * this.clock.outerRadius - this.clock.tickRadius,
        left: this.clock.dialRadius + Math.sin(radian) * this.clock.outerRadius - this.clock.tickRadius
      });
    }
  }

  /**
   * format date
   * @param date Date Object
   * @return string with formatted date
   */
  private _formatDate(date: Date): string {
    return this.format
      .replace('YYYY', date.getFullYear() + '')
      .replace('MM', this._prependZero((date.getMonth() + 1) + ''))
      .replace('DD', this._prependZero(date.getDate() + ''))
      .replace('HH', this._prependZero(date.getHours() + ''))
      .replace('mm', this._prependZero(date.getMinutes() + ''))
      .replace('ss', this._prependZero(date.getSeconds() + ''));
  }

  /**
   * Prepend Zero
   * @param value String value
   * @return string with prepend Zero
   */
  private _prependZero(value: string): string {
    return parseInt(value) < 10 ? '0' + value : value;
  }

  /**
   * Get Offset
   * @param element HtmlElement
   * @return top, left offset from page
   */
  private _offset(element: any) {
    let top = 0, left = 0;
    do {
      top += element.offsetTop || 0;
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);

    return {
      top: top,
      left: left
    };
  }

  writeValue(value: any): void {
    if (value && value !== this._value) {
      if (this.dateUtil.isValidDate(value)) {
        this._value = value;
      } else {
        if (this.type === 'time') {
          this._value = new Date('1-1-1 ' + value);
        } else {
          this._value = new Date(value);
        }
      }
      this.displayInputDate = this._formatDate(this._value);
      let date = '';
      if (this.type !== 'time') {
        date += this._value.getFullYear() + '-' + (this._value.getMonth() + 1) + '-' + this._value.getDate();
      }
      if (this.type === 'datetime') {
        date += ' ';
      }
      if (this.type !== 'date') {
        date += this._value.getHours() + ':' + this._value.getMinutes();
      }
    }
  }

  registerOnChange(fn: any) { this._onChangeCallback = fn; }

  registerOnTouched(fn: any) { this._onTouchedCallback = fn; }

}

export const MD2_DATEPICKER_DIRECTIVES = [Md2Datepicker];

@NgModule({
  imports: [CommonModule, FormsModule],
  exports: MD2_DATEPICKER_DIRECTIVES,
  declarations: MD2_DATEPICKER_DIRECTIVES,
})
export class Md2DatepickerModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: Md2DatepickerModule,
      providers: [Md2DateUtil]
    };
  }
}
