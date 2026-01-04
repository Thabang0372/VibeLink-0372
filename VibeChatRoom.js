class VibeChatRoom {
    static getSchema() {
        return {
            className: 'VibeChatRoom',
            fields: {
                name: { type: 'String', required: true },
                members: { type: 'Relation', targetClass: '_User', required: true },
                isGroup: { type: 'Boolean', default: true },
                lastMessage: { type: 'Pointer', targetClass: 'Message' },
                mediaEnabled: { type: 'Boolean', default: true },
                audioVibesEnabled: { type: 'Boolean', default: true },
                createdAt: { type: 'Date' },
                admin: { type: 'Pointer', targetClass: '_User', required: true }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeChatRoom');
    }
}

export default VibeChatRoom;