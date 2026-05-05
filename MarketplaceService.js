class MarketplaceService {
    constructor(app) { this.app = app; }

    async createItem(data) {
        const Item = Parse.Object.extend('MarketplaceItem');
        const i = new Item();
        i.set('seller', this.app.currentUser);
        i.set('title', data.title);
        i.set('description', data.description);
        i.set('price', data.price);
        i.set('currency', 'VIBE');
        i.set('status', 'available');
        await i.save();
        showNotification('Item listed');
        await this.loadItems();
    }

    async loadItems() {
        const items = await new Parse.Query('MarketplaceItem').equalTo('status','available').include('seller').descending('createdAt').find();
        document.getElementById('marketplace-items').innerHTML = items.map(i => `<div class="card"><h4>${i.get('title')}</h4><p>${i.get('price')} VIBE</p><button onclick="vibeApp.services.marketplace.addToCart('${i.id}')">Add to Cart</button></div>`).join('');
    }

    async addToCart(itemId) {
        let cart = await new Parse.Query('VibeShoppingCart').equalTo('owner', this.app.currentUser).equalTo('status','active').first();
        if (!cart) {
            cart = new Parse.Object('VibeShoppingCart');
            cart.set('owner', this.app.currentUser); cart.set('items', []); cart.set('status','active');
        }
        const items = cart.get('items') || [];
        const existing = items.find(i => i.itemId === itemId);
        if (existing) existing.quantity++; else items.push({ itemId, quantity: 1 });
        cart.set('items', items);
        await cart.save();
        showNotification('Added to cart');
    }

    async createGig(data) {
        const Gig = Parse.Object.extend('VibeGig');
        const g = new Gig();
        g.set('poster', this.app.currentUser);
        g.set('skillNeeded', data.skill);
        g.set('description', data.desc);
        g.set('payment', data.payment);
        g.set('status','open');
        await g.save();
        showNotification('Gig posted');
        await this.loadGigs();
    }

    async loadGigs() {
        const gigs = await new Parse.Query('VibeGig').equalTo('status','open').include('poster').find();
        document.getElementById('vibe-gigs').innerHTML = gigs.map(g => `<div class="card"><h4>${g.get('skillNeeded')}</h4><p>${g.get('payment')} VIBE</p><button onclick="vibeApp.services.marketplace.applyToGig('${g.id}')">Apply</button></div>`).join('');
    }

    async applyToGig(gigId) {
        const gig = await new Parse.Query('VibeGig').get(gigId);
        gig.addUnique('applicants', this.app.currentUser);
        await gig.save();
        showNotification('Applied');
    }
}
window.MarketplaceService = MarketplaceService;