'use strict';

class AutomationEventFilter {
  filter(events, type) {
    if (!type) return events;
    return events.filter(event => event.type === type);
  }
}

module.exports = AutomationEventFilter;
