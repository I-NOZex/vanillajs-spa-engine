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
            if (!this.#__bindings__[bindListName].$items[bindItemName])
                this.#__bindings__[bindListName].$items[bindItemName] = [];

            this.#__bindings__[bindListName].$items[bindItemName].push(bindItem);
        };

        cleanCollection(bindListName) {
            this.#__bindings__[bindListName].$items = {};
        }

        cleanCollectionItems(bindListName, bindItemName) {
            this.#__bindings__[bindListName].$items[bindItemName] = [];
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
                `Model has mutated but no UI bind to update could be found.\nProperty changed: "${prop}".`
            );
            return;
        }

        if (observable.mutationAttr === 'collection') {
            const bindings = Object.values(observable.$items)[0];
            console.log(Object.keys(observable.$items)[0])
            bindings.forEach((bind, idx) => {
                if (
                    value.length !== oldValue.length &&
                    bind.mutationAttr === 'content'
                ) {
                    observable.$self.target.innerHTML = observable.$self.replaceTemplate;
                    this.bindings.cleanCollection(prop)
                    observable.$self.render(value);
                    observable.$self.bindEvents(bind.target);
                    observable.$self.target.firstElementChild.remove();

                } else {
                    const newValue = (value[idx] instanceof Object) ? value[idx][bind.replaceKey] : value[idx];
                    if (bind.mutationAttr === 'content') {
                        bind.target.innerHTML = newValue;
                    }
                }
            });

        } else if (observable.mutationAttr === 'content') {
            observable.target.innerHTML = value;
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
