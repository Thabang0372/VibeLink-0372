class AI {
    static getSchema() {
        return {
            className: 'AI',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                aiData: { type: 'Object', default: {} },
                preferences: { type: 'Object', default: {} },
                learningPattern: { type: 'Object', default: {} }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('AI');
    }
}
window.AI = AI;