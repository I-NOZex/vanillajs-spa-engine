/**
 * @author Tiago Marques <tiagofm.profissional@outlook.pt>
 */

class BindValue extends HTMLElement {
    constructor() {
      // Always call super first in constructor
      super();
    }
}
  

class Router {
    constructor(_routes, _templateEngine) {
        this.routes = _routes;
        this.templateEngine = _templateEngine;

        this.appContainer = null;
        this.currentRoute = null;

        window.customElements.define('bind-value', BindValue, {extends: 'span'});
        window.document.addEventListener('click', this.interceptClickEvent);
        window.addEventListener('popstate', this.onFreshLoad);
        window.addEventListener('load', this.onFreshLoad, { once: true });
    }

    get model() {
        return this.currentRoute.remoteModel ? 
            (async () => {
                try {
                    return {...this.currentRoute.staticModel, ...await this.currentRoute?.remoteModel()}
                } catch(e) {
                    console.log(e)
                return {};  // fallback value
                }
            })() :
            this.currentRoute.staticModel
    }

    onNavigateRequest = async (path) => {
        const route = this.routes[path];
        if(!route) return;
    
        window.history.pushState({}, path, window.location.origin + '/#' + path);
        this.currentRoute = route;
        this.appContainer.classList.add('loading')
        this.appContainer.innerHTML = await this.templateEngine.renderTemplate(route);
        this.templateEngine
            .bindData(this.appContainer, this.model)
            .then(() => {
                this.templateEngine.bindEvents(this.appContainer);
                this.appContainer.classList.remove('loading')
            })
    }

    onModelUpdated = async() => {
        //this.appContainer.innerHTML = await this.templateEngine.renderTemplate(this.currentRoute, await this.model);
        this.appContainer.classList.add('loading')
        this.templateEngine
            .bindData(this.appContainer, this.model)
            .then(() => {
                this.templateEngine.bindEvents(this.appContainer);
                this.appContainer.classList.remove('loading')
            })
    }
    
    onFreshLoad = () => {
        this.onNavigateRequest(window.location.pathname)
    }    
    
    // https://stackoverflow.com/a/33616981/1869192
    interceptClickEvent = (e) => {
        const target = e.target || e.srcElement;
        if (target.tagName === 'A') {
            const href = target.getAttribute('href');
    
            if (true) {
    
                if(href !== location.hash.substring(1)) {
                    this.onNavigateRequest(href);
                }
                //tell the browser not to respond to the link click
               e.preventDefault();
            }
        }
    }
}

class TemplateEngine {
    constructor() {
      this.cachingEnabled = false;
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
                window.localStorage.setItem(templatePath, doc.body.innerHTML);
    
                return doc.body;
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
    
    mapBind = ($el, model, recursive = false) => {
        if($el.dataset.bindContent) {
            const dataBindValue = this.getObjPropByPath(model, $el.dataset.bindContent);

            if($el.childElementCount < 1) {
                $el.innerHTML = dataBindValue;
            } else {
                $el.childNodes.forEach($node => {
                    if ($node.tagName !== 'VALUE') return;
                    $node.innerHTML = dataBindValue;
                })
            }

            //const modelKeyMap = `{{${$el.dataset.bindContent}}}`;
    
            //if ($el.innerHTML.includes(modelKeyMap)) {
                //$el.innerHTML = $el.innerHTML.replace(modelKeyMap, dataBindValue);
            //} else {
               // $el.innerHTML = dataBindValue || $el.innerHTML;
            //}
    
            //delete $el.dataset.bindContent;
        }
    
        if($el.dataset.bindAttrs) {
            const dataBindAttrs = $el.dataset.bindAttrs.replace(/\s+/g, '').split(',');
    
            dataBindAttrs.forEach((binding) => {
                let [attr, value] = binding.split(':');
                let dataBindValue = this.getObjPropByPath(model, value);
                $el.setAttribute(attr, dataBindValue);
            })
    
            //delete $el.dataset.bindAttrs;
        }
    
        if($el.dataset.bindLoop) {
            let dataBindValues = this.getObjPropByPath(model, $el.dataset.bindLoop);

            $el.innerHTML = $el.firstElementChild.outerHTML; //to reset the template for model updates
            const $childBindingContainers = $el.querySelectorAll('[data-bind-content],[data-bind-attrs],[data-bind-loop]');
            //const templateChilds = $el.childElementCount;
            
            dataBindValues?.forEach((subModel) => {
                console.log($el.childElementCount )
                //const $loopContainer = templateChilds > 1 ? document.createElement('div') : $el.firstElementChild.cloneNode();
                const $loopContainer = $el.firstElementChild.cloneNode();
                $el.appendChild($loopContainer);     

                $childBindingContainers.forEach($child => {
                    const $childTemplate = $child.cloneNode(true);
               
                    $loopContainer.appendChild($childTemplate);
                    this.mapBind($childTemplate, subModel, true)
                    $child.remove();
                })
            })

            $el.firstElementChild.remove();
    
        }
    };
    
    bindData = async($template, model) => {
        const $bindingContainers =  $template.querySelectorAll('[data-bind-content],[data-bind-attrs],[data-bind-loop]');
        const computedModel = await model;
        $bindingContainers.forEach(($el) => this.mapBind($el, computedModel));    
    }

    bindEvents = ($dom) => {
        const $bindingContainers =  $dom.querySelectorAll('[data-bind-event]');

        $bindingContainers.forEach($el => {
            if($el.dataset.bindEvent) {
                let [trigger, eventName] = $el.dataset.bindEvent.split(':');
    
                $el.addEventListener(trigger, () => window.EVENTBUS.emit(eventName));
            
                //delete $el.dataset.bindEvent;
            }        
        });
    }
    
    renderTemplate = async (route, model) => {
        let $staticTemplate = await this.loadTemplate(route.template);    
        return $staticTemplate.innerHTML;
    }
}

export default class VanillaSpaEngine {
    constructor({routes, appContainer, enableCaching}) {
        this.templateEngine = new TemplateEngine(); 
        this.router = new Router(routes, this.templateEngine);

        this.router.appContainer = appContainer;
        this.templateEngine.cachingEnabled = enableCaching ?? false;
    }

    updateCurrentModel({remoteModel, staticModel}) {
        remoteModel && (this.router.currentRoute.remoteModel = remoteModel);
        staticModel && (this.router.currentRoute.staticModel = staticModel);

        this.router.onModelUpdated();
    }
}
