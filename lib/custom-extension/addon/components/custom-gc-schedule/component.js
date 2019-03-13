import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get, set, observer, computed } from '@ember/object';

const ONE_HOUR_SECONDS = 3600;
const ONE_DAY_SECONDS = 24 * ONE_HOUR_SECONDS;

export default Component.extend({
  harbor:           service(),
  gcScheduleErrors:        null,
  schedule:                {
    type:    'none',
    weekday: 0,
    offtime: 0,
    hour:    0,
    min:     0,
  },
  rawSchedule:              null,
  triggerNames: {
    'Manual':    '手动',
    'Immediate': '',
    'Scheduled': ''
  },
  scheduleTypes: [
    {
      value: 'none',
      label: '无',
    },
    {
      value: 'Daily',
      label: '每天',
    },
    {
      value: 'Weekly',
      label: '每周',
    },
  ],
  weekdays: [
    {
      value: 0,
      label: '周一',
    },
    {
      value: 1,
      label: '周二',
    },
    {
      value: 2,
      label: '周三',
    },
    {
      value: 3,
      label: '周四',
    },
    {
      value: 4,
      label: '周五',
    },
    {
      value: 5,
      label: '周六',
    },
    {
      value: 6,
      label: '周日',
    },
  ],
  actions: {
    saveGCSchedule() {

    },
    cancelGCSchedule() {

    },
    gcSchedule() {

    },
  },
  hasSchedule: computed('schedule.type', function() {
    const type = get(this, 'schedule.type');

    return type !== 'none';
  }),
  isWeeklySchedule: computed('schedule.type', function() {
    const type = get(this, 'schedule.type');

    return type === 'Weekly';
  }),
  _localTime:              new Date(),
  getOfftime(daily_time) {
    let timeOffset = 0; // seconds

    if (daily_time && typeof daily_time === 'number') {
      timeOffset = +daily_time;
    }

    // Convert to current time
    let timezoneOffset = this._localTime.getTimezoneOffset();

    // Local time
    timeOffset = timeOffset - timezoneOffset * 60;
    if (timeOffset < 0) {
      timeOffset = timeOffset + ONE_DAY_SECONDS;
    }

    if (timeOffset >= ONE_DAY_SECONDS) {
      timeOffset -= ONE_DAY_SECONDS;
    }

    // To time string
    let hours = Math.floor(timeOffset / ONE_HOUR_SECONDS);
    let minutes = Math.floor(
      (timeOffset - hours * ONE_HOUR_SECONDS) / 60
    );

    let timeStr = `${ hours }`;

    if (hours < 10) {
      timeStr = `0${ timeStr }`;
    }
    if (minutes < 10) {
      timeStr += ':0';
    } else {
      timeStr += ':';
    }
    timeStr += minutes;

    return timeStr;
  },
  setOfftime(v) {
    if (!v || v === '') {
      return;
    }

    let values = v.split(':');

    if (!values || values.length !== 2) {
      return;
    }

    let hours = +values[0];
    let minutes = +values[1];
    // Convert to UTC time
    let timezoneOffset = this._localTime.getTimezoneOffset();
    let utcTimes = hours * ONE_HOUR_SECONDS + minutes * 60;

    utcTimes += timezoneOffset * 60;
    if (utcTimes < 0) {
      utcTimes += ONE_DAY_SECONDS;
    }

    if (utcTimes >= ONE_DAY_SECONDS) {
      utcTimes -= ONE_DAY_SECONDS;
    }

    return utcTimes;
  },
  validateGCSchedule() {
    const errors = [];
    const {
      type, hour, min
    } = get(this, 'schedule');

    if (type === 'none') {
      return true;
    }
    if (!/^\d{0,2}$/.test(hour) || hour < 0 || hour > 23) {
      errors.push('时应该是0到23之间到整数')
    }
    if (!/^\d{0,2}$/.test(min) || min < 0 || hour > 59) {
      errors.push('分应该是0到59之间到整数')
    }
    if (errors.length > 0 ) {
      set(this, 'gcScheduleErrors', errors);

      return false;
    }

    return true;
  },
});