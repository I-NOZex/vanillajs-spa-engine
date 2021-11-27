export default class EventBus {
    /**
     * Initialize a new event bus instance.
     */
    constructor() {
        this.bus = document.createElement('eventbus-proxy');
        this.eventList = [];
    }

    /**
     * Add an event listener.
     */
    on(event, callback, options = {}) {
        this.bus.addEventListener(event, callback, options);
        this.eventList.push({ type: event, fn: callback.toString(), options });
    }

    /**
     * Remove an event listener.
     */
    off(event, callback) {
        this.bus.removeEventListener(event, callback);
        // eslint-disable-next-line max-len
        this.eventList = this.eventList.filter(
            (ev) =>
                !(ev.type === event && ev.fn.toString() === callback.toString())
        );
    }

    /**
     * Dispatch an event.
     */
    emit(event, detail = {}) {
        this.bus.dispatchEvent(new CustomEvent(event, { detail }));
        this.eventList = this.eventList.filter(
            (ev) => !(ev.type === event && ev.options?.once === true)
        );
    }

    listAllEventListeners() {
        return this.eventList.sort((a, b) => a.type.localeCompare(b.type));
    }
}
