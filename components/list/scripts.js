export {
    model,
    methods
}

const model = () => {
    return {
        static : {
            title: 'title',
            items: [
                'item 1',
                'item 2'
            ]
        },        
    }
}

const methods = {

    doSomething : () => console.log('something'),
    hey : (e) => console.log('hey', e),
}
