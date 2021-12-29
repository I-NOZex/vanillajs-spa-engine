export { viewModel, methods };

const methods = {
    setComplete(e, isCompleted, itemId) {
        const item = this.todos.find(td => td.id == itemId);
        item.completed = !item.completed;
        this.todos = [...this.todos.filter(td => td.id != itemId), item]
    },

    addTodo(e) {
        if(!this.newTodoName || this.newTodoName.trim(' ').length === 0) return;
        if(this.todos.findIndex(td => td.name === this.newTodoName) >= 0) return;
        this.todos =  [
            ...this.todos,
            ...[{id: this.todos.length, name: this.newTodoName, completed: false}],
        ]
    },
};

const viewModel = new ViewModel({
    newTodoName: '',
    todos : [
        {id: 1, name: 'groceries', completed: false},
        {id: 2, name: 'pay taxes', completed: true},
    ]
});
