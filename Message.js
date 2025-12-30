class Message {
    static getSchema() {
        return {
            className: 'Message',
            fields: {
                sender: { type: 'Pointer', targetClass: '_User', required: true },
                chatRoom: { type: 'Pointer', targetClass: 'VibeChatRoom', required: true },
                text: { type: 'String', required: true },
                attachments: { type: 'Array', default: [] },
                messageType: { type: 'String', default: 'text' },
                paymentIncluded: { type: 'Boolean', default: false },
                readBy: { type: 'Array', default: [] },
                createdAt: { type: 'Date' },
                updatedAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Message');
    }
}

export default Message;