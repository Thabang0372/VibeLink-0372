class FriendshipModel {
    static getSchema() {
        return {
            className: 'Friendship',
            fields: {
                requester: { type: 'Pointer', targetClass: '_User', required: true },
                recipient: { type: 'Pointer', targetClass: '_User', required: true },
                status: { type: 'String', default: 'pending' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('Friendship');
    }
}
window.FriendshipModel = FriendshipModel;