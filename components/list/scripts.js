const LOG = false;

class Bindings {
        #__bindings__;

        constructor() {
            this.#__bindings__ = {};
        }

        getBinding(bind) {
            return this.#__bindings__[bind];
        };

        addItem(bind) {
            this.#__bindings__ = {
                ...this.#__bindings__,
                ...bind
            };
            console.log(this.#__bindings__)

        };

        addCollection(bindListName, bindOwner) {
            if (!this.#__bindings__[bindListName])
                this.#__bindings__[bindListName] = {
                    $self: bindOwner,
                    $items: {},
                    mutationAttr: 'collection'
                };
        };

        appendCollection(bindListName, bindItemName, bindItem) {
            console.log(bindListName, bindItemName, bindItem) ;
            if (!this.#__bindings__[bindListName].$items[bindItemName])
                this.#__bindings__[bindListName].$items[bindItemName] = [];

            this.#__bindings__[bindListName].$items[bindItemName].push(bindItem);
        };

        cleanCollection(bindListName) {
            this.#__bindings__[bindListName].$items = {};
        }
    }

class ViewModel {
    model;
    bindings;

    constructor(initialModel) {
        const _self = this;

        this.bindings = new Bindings();

        const handler = {
            get(target, prop) {
                //LOG && console.log({ type: 'get', target, prop });
                return Reflect.get(target, prop);
            },
            set(target, prop, value) {
                LOG && console.log({ type: 'set', target, prop, value });
                const oldValue = this.get(target, prop);
                if (prop !== '__bindings__')
                    _self.updateUI(prop, value, oldValue);
                return Reflect.set(target, prop, value);
            }
        };

        this.model = new Proxy(initialModel, handler);
    }

    updateUI(prop, value, oldValue) {
        let observable = this.bindings.getBinding(prop);

        if (!observable) {
            console.warn(
                'Model has mutated but no UI bind to update could be found'
            );
            return;
        }

        if (observable.mutationAttr === 'collection') {
            const bindings = Object.values(observable.$items)[0];
            bindings.forEach((bind, idx) => {
                if (
                    value.length !== oldValue.length &&
                    bind.mutationAttr === 'content'
                ) {
                    console.log('collection size changed');
                    observable.$self.target.innerHTML = observable.$self.replaceTemplate;
                    observable.$self.render(value);
                    observable.$self.bindEvents(bind.target);
                    observable.$self.target.firstElementChild.remove();

                } else {
                    console.log('collection size the same', idx);
                    if (bind.mutationAttr === 'content') {
                        const newValue = `<bind>${value[idx]}</bind>`;
                        bind.target.innerHTML = bind.target.innerHTML.replace(
                            bind.replaceValue,
                            newValue
                        );
                        bind.replaceValue = newValue;
                    }
                }
            });
            /*if(value.length !== oldValue.length && observable.mutationAttr === 'content') {
                console.log('a')
                observable.target.innerHTML = observable.replaceTemplate;
                observable.render(value);
                observable.bindEvents(observable.target);
                observable.target.firstElementChild.remove();
            } else {
                console.log('b')

                if(this.model.__bindings__.hasOwnProperty(prop)) {
                    //this.model.__bindings__[prop].forEach(item => this.updateUI(`${k}`, value[count]))
                } else {
                    const pattern = new RegExp(`^${prop}\\[(\\d+)\\]`);
                    let count = 0;
                    Object.keys(this.model.__bindings__).forEach((k) => {
                        if (!k.match(pattern)) return;
                        this.updateUI(`${k}`, value[count]);
                        count++;
                    });
                }
            }*/
        } else if (observable.mutationAttr === 'content') {
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
        } else {
            console.warn(
                'Model has mutated but no UI bind to update could be found'
            );
        }

        LOG && console.log(observable);
    }
}

export { viewModel, methods };

const methods = {
    doSomething(e) {
        console.log(e, this);
        this.title = 'helloooooo';
    },
    hey(e) {
        this.initVal += 3;
    },

    listItemClick(e, var1) {
        console.log(e, var1, this);
    }
};

const viewModel = new ViewModel({
    title: 'title 1',
    test: 'test 2',
    initVal: 69,

    items: [
        { item: 'one', id: 1 },
        { item: 'two', id: 2 }
    ],

    enum: ['one 1', 'two 2'],

    static: {
        title: 'title 2',

        items: ['item 1', 'item 2']
    }
});
