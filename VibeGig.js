class VibeGig {
    static getSchema() {
        return {
            className: 'VibeGig',
            fields: {
                poster: { type: 'Pointer', targetClass: '_User', required: true },
                skillNeeded: { type: 'String', required: true },
                description: { type: 'String', required: true },
                payment: { type: 'Number', required: true },
                currency: { type: 'String', default: 'VIBE' },
                status: { type: 'String', default: 'open' },
                applicants: { type: 'Relation', targetClass: '_User' },
                verifiedProfessionals: { type: 'Boolean', default: false },
                deadline: { type: 'Date', required: true },
                location: { type: 'GeoPoint' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeGig');
    }
}

export default VibeGig;