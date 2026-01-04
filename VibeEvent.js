class VibeEvent {
    static getSchema() {
        return {
            className: 'VibeEvent',
            fields: {
                host: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                eventDate: { type: 'Date', required: true },
                location: { type: 'GeoPoint' },
                ticketsAvailable: { type: 'Number', required: true },
                qrEntry: { type: 'String' },
                promoted: { type: 'Boolean', default: false },
                attendees: { type: 'Relation', targetClass: '_User' },
                coverImage: { type: 'File' },
                price: { type: 'Number', default: 0 }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeEvent');
    }
}

export default VibeEvent;