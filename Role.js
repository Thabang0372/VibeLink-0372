class Role {
    static getSchema() {
        return {
            className: '_Role',
            fields: {
                name: { type: 'String', required: true },
                users: { type: 'Relation', targetClass: '_User' },
                ACL: { type: 'ACL' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('_Role');
    }
}

export default Role;