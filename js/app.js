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
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
//#region
const BIND_ATTRIBUTES = ':not([-loop] [-content]),[-value],[-loop],[-if],[-show]';
let obsElements = {};

class DynamicView extends HTMLElement {
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
        console.time('Dynamic view bootstrap time')
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

      await this.bindData(this.wrapper, this.model);
      await this.bindEvents(this.wrapper);
      console.timeEnd('Dynamic view bootstrap time')

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

    mapBind = ($el, model, alias = null, collectionId) => {
        const computeValue = (val) => {
            // ⚠ CLOSE YOUR EYES! IT'S EVAL TIME AGAIN 😂
            // this will allow as to perform extra processing to the data bind value 😎
            if (!$el.dataset.bindFn || val === null || val === undefined)
                return val;

            return eval($el.dataset.bindFn)(val);
        };

        const getValue = (val) => {
            if(typeof (val*1) === 'number' && !Number.isNaN(val*1)) return (val*1);
            else if(val.includes("'")) return val;
            else if(['true','false'].includes(val)) return !!val;
            return this.getObjPropByPath(model,val) ?? false;
        }

        if ($el.hasAttribute('-if')) {
            const prop = $el.getAttribute('-if');
           // console.info(prop, model)
            let [fullMatch, a, operator, b] = prop.match(/([\.a-zA-Z0-9_]+)(>|<|>=|<=|==|!=|===|!==)([\.a-zA-Z0-9_']+)/) ?? [prop];
            
            let boolResult = false;
            if(a && operator && b) {
                const computedA = getValue(a)
                const computedB = getValue(b)

                console.info(`Conditional rendering: ${computedA} ${operator} ${computedB}`, $el)
                boolResult = eval(`'${computedA}' ${operator} ${computedB}`);
            } else if (fullMatch){
                const negate = prop.startsWith('!') * 1;
                boolResult = negate ? !getValue(fullMatch.substring(negate)) : getValue(fullMatch.substring(negate));
            }

            if(!boolResult) {
                $el.remove();
                return;
            }

            $el.removeAttribute('-if')
        }

        if ($el.hasAttribute('-show')) {
            const prop = $el.getAttribute('-show');
           // console.info(prop, model)
            let [fullMatch, a, operator, b] = prop.match(/([\.a-zA-Z0-9_]+)(>|<|>=|<=|==|!=|===|!==)([\.a-zA-Z0-9_']+)/) ?? [prop];
            
            let boolResult = false;
            if(a && operator && b) {
                const computedA = getValue(a)
                const computedB = getValue(b)

                console.info(`Conditional visibility: ${computedA} ${operator} ${computedB}`, $el)
                boolResult = eval(`'${computedA}' ${operator} ${computedB}`);
            } else if (fullMatch){
                const negate = prop.startsWith('!') * 1;
                boolResult = negate ? !getValue(fullMatch.substring(negate)) : getValue(fullMatch.substring(negate));
            }

            $el.style.display = boolResult ? '' : 'none'
            //this.bindings.addItem({[prop] : {target: $el, mutationAttr: 'show', replaceAttr: 'value'}})
            this.bindings.addItem2(prop , {target: $el, mutationAttr: 'show'})

            $el.removeAttribute('-show')
        }        

        if ($el.hasAttribute('-content')) {
            const modelKeyMap = /(\{\{(?<modelProp>[\w\._]+)\}\})/g;
            
            const cachedTemplate = $el.innerHTML;


            let matches = [...$el.textContent.matchAll(modelKeyMap)];


            for(let i = matches.length-1; i >= 0; i--) {
                const match = matches[i];
                const value =  this.getObjPropByPath(model, match.groups.modelProp);

                $el.firstChild.splitText(match.index)
               // create new span node with content
                var span = document.createElement("bind");
                span.appendChild(document.createTextNode(value));

                const rightNode = $el.firstChild.splitText(match.index);
                // Split the text node into two and add new span
                const targetBind = $el.insertBefore(span, rightNode);

                if(alias) {
                    let replaceKey = match.groups.modelProp.split('.')
                    replaceKey = Array.isArray(replaceKey) ? replaceKey[replaceKey.length-1] : replaceKey;

                    this.bindings.appendCollection(
                        alias, 
                        collectionId, 
                        match.groups.modelProp, 
                        {target: targetBind, mutationAttr: 'content', replaceKey, ownerId: collectionId}
                    );
                } else {
                    
                    this.bindings.addItem2(match.groups.modelProp , {target: targetBind, mutationAttr: 'content', replaceKey: match.groups.modelProp})
                }

                rightNode.nextSibling.textContent = rightNode.nextSibling.textContent.replace(modelKeyMap, '');
            }

            $el.removeAttribute('-content')
        }


        if ($el.hasAttribute('-value')) {
            const prop = $el.getAttribute('-value');
            const dataBindValue =  this.getObjPropByPath(model, prop);
            $el.setAttribute('value', computeValue(dataBindValue));

            this.bindings.addItem2(prop, {target: $el, mutationAttr: 'value', replaceAttr: 'value'})


            $el.addEventListener('keyup', () => this.model[prop] = isNaN(this.model[prop]) ? $el.value.toString() : Number($el.value))

            $el.removeAttribute('-value')
        }
        
        if ($el.hasAttribute('-class')) {
            const prop = $el.getAttribute('-class');
            const dataBindValue =  this.getObjPropByPath(model, prop);
            $el.setAttribute('class', computeValue(dataBindValue));

            this.bindings.addItem2(prop, {target: $el, mutationAttr: 'class', replaceAttr: 'class'})

            $el.removeAttribute('-class')
        }     

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

            const renderFn = (dataBindValues, collectionId) => {
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
                        this.mapBind($child, mappedModel, alias, collectionId);
                    });

                });
            }

            if(mappedProp == 'users') {
                console.log(dataBindValues)
            }
            const collectionId = uuidv4();
            this.bindings.addCollection(mappedProp, collectionId, {target: $el, id: collectionId, mutationAttr: 'content', bindType: 'collection', replaceTemplate: $el.innerHTML.trim(), render: renderFn, bindEvents: this.bindEvents})


            /*if(!Array.isArray(dataBindValues))
                Object.keys(dataBindValues).forEach(k => renderFn(dataBindValues[k], collectionId))
            else*/
                renderFn(dataBindValues, collectionId);

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
customElements.define('view-model', DynamicView);
//#endregion
