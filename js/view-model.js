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

    addItem2(prop, watcher) {
        if(!this.#__bindings__[prop]) this.#__bindings__[prop] = []
        this.#__bindings__[prop].push(watcher);
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
    mutableHtmlAttributes = ['accept', 'accept-charset', 'accesskey', 'action', 'align', 'allow', 'alt', 'async', 'autocapitalize', 'autocomplete', 'autofocus', 'autoplay', 'background', 'bgcolor', 'border', 'buffered', 'capture', 'challenge', 'charset', 'checked', 'cite', 'class', 'code', 'codebase', 'color', 'cols', 'colspan', 'content', 'contenteditable', 'contextmenu', 'controls', 'coords', 'crossorigin', 'csp', 'data', 'data-*', 'datetime', 'decoding', 'default', 'defer', 'dir', 'dirname', 'disabled', 'download', 'draggable', 'enctype', 'enterkeyhint', 'for', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'http-equiv', 'icon', 'id', 'importance', 'integrity', 'intrinsicsize', 'inputmode', 'ismap', 'itemprop', 'keytype', 'kind', 'label', 'lang', 'language', 'loading', 'list', 'loop', 'low', 'manifest', 'max', 'maxlength', 'minlength', 'media', 'method', 'min', 'multiple', 'muted', 'name', 'novalidate', 'open', 'optimum', 'pattern', 'ping', 'placeholder', 'poster', 'preload', 'radiogroup', 'readonly', 'referrerpolicy', 'rel', 'required', 'reversed', 'rows', 'rowspan', 'sandbox', 'scope', 'scoped', 'selected', 'shape', 'size', 'sizes', 'slot', 'span', 'spellcheck', 'src', 'srcdoc', 'srclang', 'srcset', 'start', 'step', 'style', 'summary', 'tabindex', 'target', 'title', 'translate', 'type', 'usemap', 'value', 'width', 'wrap']

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
                if(o?.bindType === 'collection') {
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
                } else {
                    if (o.mutationAttr === 'content') {
                        o.target.innerHTML = value;
                    } else if (o.mutationAttr === 'show') {
                        o.target.style.display = value  ? '' : 'none';
                    } else if (
                        this.mutableHtmlAttributes.includes(o.mutationAttr) 
                        &&
                        this.mutableHtmlAttributes.includes(o.replaceAttr)
                    ) {
                        o.target.value = value;
                    } 
                }
            })
        } else if (observable.mutationAttr === 'content') {
            observable.target.innerHTML = value;
        } else if (
            this.mutableHtmlAttributes.includes(observable.mutationAttr) 
            &&
            this.mutableHtmlAttributes.includes(observable.replaceAttr)
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
