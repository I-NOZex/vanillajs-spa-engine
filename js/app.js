
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
class ViewModel extends HTMLElement {
    shadow = null;
    wrapper = null;
    templatePath = null;
    scriptsPath = null;
    eventBus = new EventBus();

    static get observedAttributes() {
        return [ 'title' ];
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
      /*const scriptNode = $templateDom.getElementsByTagName('script');
      const x = await import(scriptNode[0])
      var script = document.createElement('script');
      script.innerText = scriptNode.textContent;
     this.wrapper.appendChild(script);*/

      //console.log(scriptNode[0].innerText)


      if($templateNode.length === 1) {
          const $templateDomContent = $templateNode[0].content;
          this.wrapper.appendChild($templateDomContent);
      } else if($templateNode.length > 1) {
          console.warn('Multiple templates found');
      }

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
           console.log(`${name} changed from ${oldVal} to ${newVal}`)
        }
      //updateStyle(this);

    }

    loadTemplate = async(templatePath) => {
        if (window.localStorage.getItem(templatePath) !== null && this.cachingEnabled) {
            const $auxNode = document.createElement('div');
            $auxNode.innerHTML = window.localStorage.getItem(templatePath)
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

    bindEvents = async($dom) => {
      const $bindingContainers =  $dom.querySelectorAll('[_click]');
      const methods = await import(this.scriptsPath);

      $bindingContainers.forEach($el => {
          const validEventAttrs = ['_click'];
          const attrs = $el.attributes;

          for(let i = attrs.length - 1; i >= 0; i--){
            const attr = attrs[i];
            if(!validEventAttrs.includes(attr.name)) return;
            
            $el.addEventListener(attr.name.substr(1), methods[attr.value]);
          }
      });
  }
  
}

function doSomething() {
  alert(1)
}

// Define the new element
customElements.define('view-model', ViewModel);
//#endregion
