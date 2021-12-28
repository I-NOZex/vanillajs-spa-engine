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
        setInterval(
            () => this.test = new Date(), 1000
        )
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

    enum: [...Array(10).keys()],//['one 1', 'two 2'],

    static: {
        title: 'title 2',

        items: ['item 1', 'item 2']
    }
});
