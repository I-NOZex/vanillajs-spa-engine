//#region
class EventBus {
    /**
     * Initialize a new event bus instance.
     */
    constructor() {
        this.bus = document.createElement('eventbus-proxy');
        this.eventList = [];
        window.$EventBus = this;
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
//#endregion

//#region
const BIND_ATTRIBUTES = ':not([-loop] [-content]),[-value],[data-bind-attrs],[-loop],[data-bind-if]';
let obsElements = {};

class ViewModel extends HTMLElement {
    shadow = null;
    wrapper = null;
    templatePath = null;
    scriptsPath = null;
    methods = null;
    model = null;
    bindings = null;
    eventBus = new EventBus();

    static get observedAttributes() {
        return ['title'];
    }

    constructor() {
        // Always call super first in constructor
        super();

        // Create a shadow root
        this.shadow = this.attachShadow({ mode: 'open' });

        // Create spans
        this.wrapper = document.createElement('div');
        this.shadow.appendChild(this.wrapper);

        this.templatePath = this.getAttribute('template');
        this.scriptsPath = this.getAttribute('scripts');
    }

    /**
     * Invoked each time the custom element is appended into a document-connected element.
     * This will happen each time the node is moved,
     * and may happen before the element's contents have been fully parsed.
     *
     * Note: connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
     */
    async connectedCallback() {
      const $templateDom = await this.loadTemplate(this.templatePath);

      const $templateNode = $templateDom.getElementsByTagName('template');

      if ($templateNode.length === 1) {
          const $templateDomContent = $templateNode[0].content;
          this.wrapper.appendChild($templateDomContent);
      } else if ($templateNode.length > 1) {
          console.warn('Multiple templates found');
      }

      const {viewModel, methods} = await import(this.scriptsPath);
      window.vm = this.model = viewModel.model;
      window.db = this.bindings = viewModel.bindings;

      this.methods = methods;

      this.bindData(this.wrapper, this.model);
      this.bindEvents(this.wrapper);

      console.log('Custom square element added to page.');
      //updateStyle(this);
    }

    /**
     * Invoked each time the custom element is disconnected from the document's DOM.
     */
    disconnectedCallback() {
        console.log('Custom square element removed from page.');
    }

    /**
     * Invoked each time the custom element is moved to a new document.
     */
    adoptedCallback() {
        console.log('Custom square element moved to new page.');
    }

    /**
     * Invoked each time one of the custom element's attributes is added, removed, or changed.
     * Which attributes to notice change for is specified in a static get observedAttributes method
     */
    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            console.log(`${name} changed from ${oldVal} to ${newVal}`);
        }
        //updateStyle(this);
    }

    loadTemplate = async (templatePath) => {
        if (
            window.localStorage.getItem(templatePath) !== null &&
            this.cachingEnabled
        ) {
            const $auxNode = document.createElement('div');
            $auxNode.innerHTML = window.localStorage.getItem(templatePath);
            return $auxNode;
        }

        return await fetch(location.origin + templatePath)
            // The API call was successful!
            .then((response) => response.text())

            .then((html) => {
                // Convert the HTML string into a document object
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');
                //window.localStorage.setItem(templatePath, doc.body.innerHTML);

                return doc;
            })
            .catch((err) => {
                // There was an error
                console.warn('Something went wrong.', err);
            });
    };

    // to parse Object paths
    getObjPropByPath = (obj, path = '') => {
      if (path.split('.').length <= 1 && !path.match(/^\w+\[\d+\]/g)) return obj[path];

      /* ⚠ DONT USE THIS IN PRODUCTION */
      // all this code is proof of concept an may not follow the best practices at times
      // like the use of "eval", I just want to simplify my life ...             
      try {
          return eval(`obj.${path}`);
      } catch (e) {
          if (e instanceof SyntaxError) {
              console.error(e.message);
          }
      }
    }

    bindData = async ($template, model) => {
        const $bindingContainers = $template.querySelectorAll(BIND_ATTRIBUTES);
            $bindingContainers.forEach(($el) =>
                this.mapBind($el, model)
            );
    };

    mapBind = ($el, model, alias = null) => {
        const computeValue = (val) => {
            // ⚠ CLOSE YOUR EYES! IT'S EVAL TIME AGAIN 😂
            // this will allow as to perform extra processing to the data bind value 😎
            if (!$el.dataset.bindFn || val === null || val === undefined)
                return val;

            return eval($el.dataset.bindFn)(val);
        };

        if ($el.dataset.bindIf) {
            let dataBindValue;
            const negate = $el.dataset.bindIf.startsWith('!');
            if (negate)
                dataBindValue = this.getObjPropByPath(
                    model,
                    $el.dataset.bindIf.substring(1)
                );
            else
                dataBindValue = this.getObjPropByPath(
                    model,
                    $el.dataset.bindIf
                );

            const shouldRender = dataBindValue && !negate;
            if (dataBindValue) {
                if (negate) {
                    $el.remove();
                    return;
                }
            } else {
                if (!negate) {
                    $el.remove();
                    return;
                }
            }
        }

        if ($el.hasAttribute('-content')) {
            const modelKeyMap = /\{\{(?<modelProp>[\w\._]+)\}\}/g;

            $el.innerHTML = $el.innerHTML.replace(modelKeyMap, (i, match) => {
                const value =  this.getObjPropByPath(model, match);
                if(alias) {
                    this.bindings.appendCollection(alias, match, {target: $el, mutationAttr: 'content', replaceValue:`<bind>${value}</bind>`})
                } else {
                    this.bindings.addItem({[match] : {target: $el, mutationAttr: 'content', replaceValue:`<bind>${value}</bind>`}})
                }
           
                return `<bind>${value}</bind>`;
            })


            $el.removeAttribute('-content')
        }


        if ($el.hasAttribute('-value')) {
            const prop = $el.getAttribute('-value');
            const dataBindValue =  this.getObjPropByPath(model, prop);
            $el.setAttribute('value', computeValue(dataBindValue));

            this.bindings.addItem({[prop] : {target: $el, mutationAttr: 'value', replaceAttr: 'value'}})


            $el.addEventListener('keyup', () => this.model[prop] = isNaN(this.model[prop]) ? $el.value.toString() : Number($el.value))

            $el.removeAttribute('-value')
        }
        
        /*if ($el.hasAttribute('-value')) {
            const prop = $el.getAttribute('-value');
            const dataBindValue =  this.getObjPropByPath(model, prop);
            $el.setAttribute('value', computeValue(dataBindValue));
            this.model.__bindings__ = {
                ...this.model.__bindings__,  
                ...{[prop] : {target: $el, mutationAttr: 'value', replaceAttr: 'value'}}
            }

            $el.addEventListener('keyup', () => this.model[prop] = isNaN(this.model[prop]) ? $el.value.toString() : Number($el.value))

            $el.removeAttribute('-value')
        }   */     

        if ($el.dataset.bindAttrs) {
            const dataBindAttrs = $el.dataset.bindAttrs
                .replace(/\s+/g, '')
                .split(',');

            dataBindAttrs.forEach((binding) => {
                let [attr, value] = binding.split(':');
                let dataBindValue = this.getObjPropByPath(model, value);
                $el.setAttribute(attr, computeValue(dataBindValue));
            });

            //delete $el.dataset.bindAttrs;
        }

        if ($el.hasAttribute('-loop')) {
            const prop = $el.getAttribute('-loop');

            let itemAux, listAux;
            if(prop.includes(' in ')) {
                [itemAux, listAux] = prop.split(' in ');
            }

            const mappedProp = listAux ?? prop;

            let dataBindValues = this.getObjPropByPath(
                model,
                mappedProp
            );
            if (!dataBindValues) {
                console.error(
                    `Property "${
                        mappedProp
                    }" not found in model [${Object.keys(model)}]`
                );
            }

            const renderFn = (dataBindValues) => {
                this.bindings.cleanCollection(mappedProp);
                dataBindValues?.forEach((subModel, idx) => {
                    const $loopContainer = $el.firstElementChild.cloneNode(true);
                    $el.appendChild($loopContainer);

                    let mappedModel = [];
                    let alias = `${mappedProp}`;
                    if(itemAux) 
                        mappedModel = {[itemAux]: subModel};
                    else
                        mappedModel = subModel;

                    const $childBindContainer =
                        $loopContainer.querySelectorAll('*');

                    $childBindContainer.forEach(($child) => {
                        this.mapBind($child, mappedModel, alias);
                    });
                });
            }

            this.bindings.addCollection(mappedProp, {target: $el, mutationAttr: 'content', replaceTemplate: $el.innerHTML.trim(), render: renderFn, bindEvents: this.bindEvents})

            renderFn(dataBindValues);

            $el.firstElementChild.remove();
        }

        $el.removeAttribute('-loop')
    };

    bindEvents = async ($dom) => {
        const $bindingContainers = $dom.querySelectorAll('[_click]');

        $bindingContainers.forEach(($el) => {
            const validEventAttrs = ['_click'];
            const attrs = $el.attributes;

            for (let i = attrs.length - 1; i >= 0; i--) {
                const attr = attrs[i];
                if (!validEventAttrs.includes(attr.name)) return;

                let [methodName, args] = attr.value.split('(');
                args = args?.replace(')', '').split(',') ?? [];

                if(this.methods.hasOwnProperty(methodName)) {
                    $el.addEventListener(attr.name.substr(1), (e) => this.methods[methodName].call(this.model, e, ...args));
                } else {
                    console.warn(`The method "${attr.value}" could not be found. Available methods: ${Object.keys(this.methods)}`)
                }
            }
        });
    };
}

// Define the new element
customElements.define('view-model', ViewModel);
//#endregion
