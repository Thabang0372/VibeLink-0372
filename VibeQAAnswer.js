class VibeQAAnswer {
    static getSchema() {
        return {
            className: 'VibeQAAnswer',
            fields: {
                question: { type: 'Pointer', targetClass: 'VibeQA', required: true },
                author: { type: 'Pointer', targetClass: '_User', required: true },
                content: { type: 'String', required: true },
                upvotes: { type: 'Number', default: 0 },
                isAccepted: { type: 'Boolean', default: false }
            }
        };
    }
    static createParseClass() { return Parse.Object.extend('VibeQAAnswer'); }
}
window.VibeQAAnswer = VibeQAAnswer;