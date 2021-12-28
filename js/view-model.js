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

        addCollection(bindListName, collectionId, bindOwner) {
            if (!this.#__bindings__[bindListName])
                this.#__bindings__[bindListName] = [{...bindOwner, ...{$items: {}}}];
            else
                this.#__bindings__[bindListName].push({...bindOwner, ...{$items: {}}});

        };

        appendCollection(bindListName, bindOwnerId, bindItemName, bindItem) {
            const collection = this.#__bindings__[bindListName].find(c => c.id === bindOwnerId);
            if (!collection?.$items[bindItemName])
                collection.$items[bindItemName] = [];

            collection.$items[bindItemName].push({...collection.$items[bindItemName], ...bindItem});
        };

        cleanCollection(bindListName) {
            this.#__bindings__[bindListName].$items = [];
        }

        cleanCollectionItems(bindListName, bindOwnerId) {
            const collection = this.#__bindings__[bindListName].find(c => c.id === bindOwnerId);
            collection.$items = [];
        }        
    }

class ViewModel {
    model;
    bindings;
    muteMutations = false;

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
                if (prop !== '__bindings__' && !this.muteMutations)
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

        this.muteMutations = true;

        if (Array.isArray(observable)) {
            observable.forEach(o => {
                if ( value?.length !== oldValue?.length ) {
                    console.log('re-render all')
                    o.target.innerHTML = o.replaceTemplate;
                    this.bindings.cleanCollectionItems(prop, o.id)
                    o.render(value, o.id);
                    o.bindEvents(o.target);
                    o.target.firstElementChild.remove();
                } else {
                    console.log('update partial')
                    Object.keys(o.$items).forEach((key, idx) => {
                        o.$items[key].forEach((bind, idx) => {
                            const newValue = (value[idx] instanceof Object) ? value[idx][bind.replaceKey] : value[idx];
                            if (bind.mutationAttr === 'content') {
                                bind.target.innerHTML = newValue ?? '';
                            }
                        })
                    })
                }
            })
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
        this.muteMutations = false;

        LOG && console.log(observable);
    }
}
