class VibeMembershipRequestModel {
    static getSchema() {
        return {
            className: 'VibeMembershipRequest',
            fields: {
                community: { type: 'Pointer', targetClass: 'VibeCommunity', required: true },
                user: { type: 'Pointer', targetClass: '_User', required: true },
                message: { type: 'String' },
                status: { type: 'String', default: 'pending' },
                requestedAt: { type: 'Date', required: true },
                reviewedAt: { type: 'Date' },
                reviewedBy: { type: 'Pointer', targetClass: '_User' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeMembershipRequest');
    }
}
window.VibeMembershipRequestModel = VibeMembershipRequestModel;