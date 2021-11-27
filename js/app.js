import VanillaSpaEngine from './vanilla-spa-engine.js';
import EventBus from './event-bus.js';

const APP_CONTAINER = document.getElementById('app');
const ENABLE_CACHING = false;

const routes = {
    '/' : {
        path: '/',
        template: '/_home.html',
        staticModel: {
            user_name: 'Tiago',
            labelTitle: 'test title',
            xpto: 'a xpto val',
            xpto2: 'a xpto2 title',
            list: [
                {label: 'tiago', title: 'i am tiago', href:'/', linkName: 'back home'},
                {label: 'marques', title: 'tiAGO MArques'},
            ]
        },
    },
    '/products' : {
        path: '/products',
        template: '/_products.html',
        staticModel: {
            user_name: 'Tiago',
            labelTitle: 'test title',
            xpto: 'a xpto val',
            xpto2: 'a xpto2 title',
            ist: [                {label: 'tiago', title: 'i am tiago', href:'/', linkName: 'back home'},
                {label: 'marques', title: 'tiAGO MArques'},
            ]
        },
        
        remoteModel: async() => await fetchRemoteModel('http://localhost:8008/products', 'products')
    }
}


const fetchRemoteModel = async(contentUrl, model, ignoreCache = false) => {     
    if (window.localStorage.getItem(contentUrl) !== null && !ignoreCache) {
        return JSON.parse(window.localStorage.getItem(contentUrl));
    }
    console.log('fetching remote model')

    return await fetch(contentUrl)
    // The API call was successful!
    .then(async (response) => ({[model] : await response.json()}))
    .then((json) => {
        window.localStorage.setItem(contentUrl, JSON.stringify(json));
        console.log(json)
        return json;
    })
}

const EVENTBUS = window.EVENTBUS = new EventBus();

const App = new VanillaSpaEngine({
    routes: routes,
    appContainer: APP_CONTAINER,
    enableCaching: ENABLE_CACHING,
});


const filter = () => {
 App.updateCurrentModel({
    remoteModel: async() => await fetchRemoteModel('http://localhost:8008/products-filter?price_gte=8', 'products',)
 })
}

EVENTBUS.on('product-sayHello', (e) => filter())


window.fl = filter

window.app = App;

