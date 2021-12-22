const LOG = false;

class ViewModel {
    model;

    constructor(initialModel) {
        const _self = this;

        const handler = {
            get(target, prop) {
                //LOG && console.log({ type: 'get', target, prop });
                return Reflect.get(target, prop);
            },
            set(target, prop, value) {
                LOG && console.log({ type: 'set', target, prop, value });
                if (prop !== '__bindings__') _self.updateUI(prop, value);
                return Reflect.set(target, prop, value);
            }
        };

        this.model = new Proxy(initialModel, handler);
    }

    updateUI(prop, value) {
        let observable = this.model.__bindings__[prop];

        if (!observable || !observable?.mutationAttr) {
            if (Array.isArray(value)) {
                const pattern = new RegExp(`^${prop}\\[(\\d+)\\]`);
                let count = 0;
                Object.keys(this.model.__bindings__).forEach((k) => {
                    if (!k.match(pattern)) return;
                    this.updateUI(`${k}`, value[count]);
                    count++;
                });
            } else {
                console.warn('Model muttate but no UI bind to update could be found');
                return;
            }
        }

        if (observable.mutationAttr === 'content') {
            const newValue = `<bind>${value}</bind>`;
            observable.target.innerHTML = observable.target.innerHTML.replace(
                observable.replaceValue,
                newValue
            );
            observable.replaceValue = newValue;
        } else if (
            observable.mutationAttr === 'value' &&
            observable.replaceAttr === 'value'
        ) {
            observable.target.value = value;
        }
        LOG && console.log(observable);
    }
}

export { viewModel, methods };

const methods = {
    doSomething() {
        this.title = 'helloooooo';
    },
    hey(e) {
        this.initVal += 3;
    }
};

const viewModel = new ViewModel({
    __bindings__: {},

    title: 'title 1',
    test: 'test 2',
    initVal: 69,

    items: [{ item: 'one' }, { item: 'two' }],

    list: ['one 1', 'two 2'],

    static: {
        title: 'title 2',

        items: ['item 1', 'item 2']
    }
});
