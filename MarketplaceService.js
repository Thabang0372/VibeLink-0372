class MarketplaceService {
    constructor(app) {
        this.app = app;
    }

    async createMarketplaceItem(itemData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const item = new MarketplaceItem();
        
        item.set('seller', this.app.currentUser);
        item.set('title', itemData.title);
        item.set('description', itemData.description);
        item.set('price', itemData.price);
        item.set('currency', itemData.currency || 'VIBE');
        item.set('category', itemData.category);
        item.set('barterOption', itemData.barterOption || false);
        item.set('status', 'available');
        item.set('images', itemData.images || []);
        item.set('condition', itemData.condition || 'new');

        await item.save();
        
        this.app.showSuccess('Item listed successfully! 🛍️');
        return item;
    }

    async createVibeGig(gigData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGig = this.app.services.parse.getClass('VibeGig');
        const gig = new VibeGig();
        
        gig.set('poster', this.app.currentUser);
        gig.set('skillNeeded', gigData.skillNeeded);
        gig.set('description', gigData.description);
        gig.set('payment', gigData.payment);
        gig.set('currency', gigData.currency || 'VIBE');
        gig.set('status', 'open');
        gig.set('applicants', []);
        gig.set('verifiedProfessionals', gigData.verifiedProfessionals || false);
        gig.set('deadline', new Date(gigData.deadline));
        gig.set('location', gigData.location);

        await gig.save();
        
        this.app.showSuccess('Gig posted successfully! 💼');
        return gig;
    }

    async addToCart(itemId, quantity = 1) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeShoppingCart = this.app.services.parse.getClass('VibeShoppingCart');
        
        let cart = await this.getUserShoppingCart();
        if (!cart) {
            cart = new VibeShoppingCart();
            cart.set('owner', this.app.currentUser);
            cart.set('items', []);
            cart.set('totalPrice', 0);
            cart.set('currency', 'VIBE');
            cart.set('status', 'active');
        }

        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const itemQuery = new Parse.Query(MarketplaceItem);
        const item = await itemQuery.get(itemId);

        const cartItems = cart.get('items') || [];
        const existingItemIndex = cartItems.findIndex(cartItem => 
            cartItem.itemId === itemId
        );

        if (existingItemIndex > -1) {
            cartItems[existingItemIndex].quantity += quantity;
        } else {
            cartItems.push({
                itemId: itemId,
                item: item,
                quantity: quantity,
                price: item.get('price'),
                addedAt: new Date()
            });
        }

        cart.set('items', cartItems);
        
        const totalPrice = cartItems.reduce((total, cartItem) => {
            return total + (cartItem.price * cartItem.quantity);
        }, 0);
        
        cart.set('totalPrice', totalPrice);
        await cart.save();

        this.app.showSuccess('Item added to cart! 🛒');
        return cart;
    }

    async checkoutCart() {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const cart = await this.getUserShoppingCart();
        if (!cart || cart.get('items').length === 0) {
            throw new Error('Cart is empty');
        }

        const userWallet = await this.app.services.wallet.getUserWallet();
        const totalPrice = cart.get('totalPrice');

        if (userWallet.get('balance') < totalPrice) {
            throw new Error('Insufficient balance');
        }

        // Process each item in cart
        const cartItems = cart.get('items');
        for (const cartItem of cartItems) {
            await this.processItemPurchase(cartItem);
        }

        // Update cart status
        cart.set('status', 'completed');
        await cart.save();

        // Create new active cart
        await this.createNewCart();

        this.app.showSuccess('Purchase completed successfully! 🎉');
        return { success: true, items: cartItems.length, total: totalPrice };
    }

    async processItemPurchase(cartItem) {
        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const itemQuery = new Parse.Query(MarketplaceItem);
        const item = await itemQuery.get(cartItem.itemId);

        // Update item status
        item.set('status', 'sold');
        await item.save();

        // Transfer payment to seller
        const sellerWallet = await this.app.services.wallet.getUserWallet(item.get('seller').id);
        await this.app.services.wallet.createWalletTransaction({
            type: 'credit',
            amount: cartItem.price * cartItem.quantity,
            wallet: sellerWallet,
            description: `Sale of ${item.get('title')}`
        });

        // Deduct from buyer
        const buyerWallet = await this.app.services.wallet.getUserWallet();
        await this.app.services.wallet.createWalletTransaction({
            type: 'debit',
            amount: cartItem.price * cartItem.quantity,
            wallet: buyerWallet,
            description: `Purchase of ${item.get('title')}`
        });

        // Create order chat
        await this.createOrderChat(item.get('seller').id, item.id);

        // Add loyalty points
        await this.app.services.wallet.addLoyaltyPoints(5, 'marketplace_purchase');
    }

    async createOrderChat(sellerId, itemId) {
        const chatRoom = await this.app.services.chat.createChatRoom(
            `Order Chat - ${itemId}`,
            false,
            [this.app.services.parse.createPointer('_User', sellerId)]
        );

        return chatRoom;
    }

    async applyToGig(gigId, applicationData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGig = this.app.services.parse.getClass('VibeGig');
        const query = new Parse.Query(VibeGig);
        const gig = await query.get(gigId);
        
        const applicants = gig.get('applicants') || [];
        
        // Check if already applied
        const alreadyApplied = applicants.some(applicant => 
            applicant.id === this.app.currentUser.id
        );
        
        if (alreadyApplied) {
            throw new Error('You have already applied to this gig');
        }

        applicants.push({
            applicant: this.app.currentUser,
            applicationData: applicationData,
            appliedAt: new Date(),
            status: 'pending'
        });

        gig.set('applicants', applicants);
        await gig.save();

        // Notify gig poster
        await this.app.services.notifications.createNotification(
            gig.get('poster').id,
            'gig_application',
            `${this.app.currentUser.get('username')} applied to your gig: ${gig.get('skillNeeded')}`
        );

        this.app.showSuccess('Application submitted successfully!');
        return gig;
    }

    async getUserShoppingCart() {
        const VibeShoppingCart = this.app.services.parse.getClass('VibeShoppingCart');
        const query = new Parse.Query(VibeShoppingCart);
        query.equalTo('owner', this.app.currentUser);
        query.equalTo('status', 'active');
        
        return await query.first();
    }

    async createNewCart() {
        const VibeShoppingCart = this.app.services.parse.getClass('VibeShoppingCart');
        const cart = new VibeShoppingCart();
        
        cart.set('owner', this.app.currentUser);
        cart.set('items', []);
        cart.set('totalPrice', 0);
        cart.set('currency', 'VIBE');
        cart.set('status', 'active');
        
        await cart.save();
        return cart;
    }

    async loadMarketplaceItems(filters = {}) {
        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const query = new Parse.Query(MarketplaceItem);
        
        if (filters.category) {
            query.equalTo('category', filters.category);
        }
        
        if (filters.priceRange) {
            query.greaterThanOrEqualTo('price', filters.priceRange.min);
            query.lessThanOrEqualTo('price', filters.priceRange.max);
        }
        
        if (filters.search) {
            query.contains('title', filters.search);
        }
        
        query.equalTo('status', 'available');
        query.include('seller');
        query.descending('createdAt');
        query.limit(filters.limit || 50);

        try {
            const items = await query.find();
            this.displayMarketplaceItems(items);
            return items;
        } catch (error) {
            console.error('Error loading marketplace items:', error);
            this.app.showError('Failed to load marketplace items');
            return [];
        }
    }

    async loadVibeGigs(filters = {}) {
        const VibeGig = this.app.services.parse.getClass('VibeGig');
        const query = new Parse.Query(VibeGig);
        
        if (filters.skillNeeded) {
            query.equalTo('skillNeeded', filters.skillNeeded);
        }
        
        if (filters.paymentRange) {
            query.greaterThanOrEqualTo('payment', filters.paymentRange.min);
            query.lessThanOrEqualTo('payment', filters.paymentRange.max);
        }
        
        query.equalTo('status', 'open');
        query.include('poster');
        query.ascending('deadline');
        query.limit(filters.limit || 50);

        try {
            const gigs = await query.find();
            this.displayVibeGigs(gigs);
            return gigs;
        } catch (error) {
            console.error('Error loading gigs:', error);
            this.app.showError('Failed to load gigs');
            return [];
        }
    }

    displayMarketplaceItems(items) {
        const container = document.getElementById('marketplace-items');
        if (!container) return;

        container.innerHTML = items.map(item => `
            <div class="marketplace-item-card" data-item-id="${item.id}">
                <div class="item-images">
                    ${item.get('images').length > 0 ? `
                        <img src="${item.get('images')[0].url()}" alt="${item.get('title')}">
                    ` : '<div class="no-image">No Image</div>'}
                </div>
                <div class="item-details">
                    <h3 class="item-title">${item.get('title')}</h3>
                    <p class="item-description">${item.get('description')}</p>
                    <div class="item-meta">
                        <div class="item-price">${item.get('price')} ${item.get('currency')}</div>
                        <div class="item-condition">${item.get('condition')}</div>
                        <div class="item-seller">Sold by: ${item.get('seller').get('username')}</div>
                    </div>
                    <div class="item-actions">
                        <button onclick="vibeApp.services.marketplace.addToCart('${item.id}')" class="btn-add-cart">
                            Add to Cart
                        </button>
                        ${item.get('barterOption') ? '<span class="barter-badge">Barter Available</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayVibeGigs(gigs) {
        const container = document.getElementById('vibe-gigs');
        if (!container) return;

        container.innerHTML = gigs.map(gig => `
            <div class="gig-card" data-gig-id="${gig.id}">
                <div class="gig-details">
                    <h3 class="gig-skill">${gig.get('skillNeeded')}</h3>
                    <p class="gig-description">${gig.get('description')}</p>
                    <div class="gig-meta">
                        <div class="gig-payment">${gig.get('payment')} ${gig.get('currency')}</div>
                        <div class="gig-deadline">Due: ${new Date(gig.get('deadline')).toLocaleDateString()}</div>
                        <div class="gig-applicants">${gig.get('applicants')?.length || 0} applicants</div>
                        ${gig.get('verifiedProfessionals') ? '<span class="verified-badge">Verified Only</span>' : ''}
                    </div>
                    <div class="gig-actions">
                        <button onclick="vibeApp.services.marketplace.applyToGig('${gig.id}', {message: 'I am interested in this gig!'})" class="btn-apply">
                            Apply Now
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async getMarketplaceStats() {
        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const itemsQuery = new Parse.Query(MarketplaceItem);
        itemsQuery.equalTo('seller', this.app.currentUser);
        
        const VibeGig = this.app.services.parse.getClass('VibeGig');
        const gigsQuery = new Parse.Query(VibeGig);
        gigsQuery.equalTo('poster', this.app.currentUser);

        try {
            const [items, gigs] = await Promise.all([
                itemsQuery.find(),
                gigsQuery.find()
            ]);

            const soldItems = items.filter(item => item.get('status') === 'sold');
            const totalRevenue = soldItems.reduce((sum, item) => sum + item.get('price'), 0);
            const activeGigs = gigs.filter(gig => gig.get('status') === 'open');

            return {
                totalItems: items.length,
                soldItems: soldItems.length,
                totalRevenue: totalRevenue,
                activeGigs: activeGigs.length,
                totalApplications: gigs.reduce((sum, gig) => sum + (gig.get('applicants')?.length || 0), 0)
            };
        } catch (error) {
            console.error('Error getting marketplace stats:', error);
            return {};
        }
    }

    async initiateBarter(itemId, barterOffer) {
        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const query = new Parse.Query(MarketplaceItem);
        const item = await query.get(itemId);

        if (!item.get('barterOption')) {
            throw new Error('Barter not available for this item');
        }

        // Create barter negotiation
        const barterChat = await this.app.services.chat.createChatRoom(
            `Barter - ${item.get('title')}`,
            false,
            [item.get('seller')]
        );

        // Send initial barter offer
        await this.app.services.chat.sendMessage(
            barterChat.id,
            `Barter Offer: ${barterOffer.description}\nValue: ${barterOffer.value} ${barterOffer.currency}`
        );

        this.app.showSuccess('Barter offer sent!');
        return barterChat;
    }

    async updateItemStatus(itemId, status) {
        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const query = new Parse.Query(MarketplaceItem);
        query.equalTo('seller', this.app.currentUser);
        
        const item = await query.get(itemId);
        item.set('status', status);
        await item.save();

        this.app.showSuccess(`Item status updated to ${status}`);
        return item;
    }

    async searchMarketplace(query, filters = {}) {
        const MarketplaceItem = this.app.services.parse.getClass('MarketplaceItem');
        const searchQuery = new Parse.Query(MarketplaceItem);
        
        if (query) {
            const searchFields = ['title', 'description', 'category'];
            const orQueries = searchFields.map(field => {
                const fieldQuery = new Parse.Query(MarketplaceItem);
                fieldQuery.contains(field, query);
                return fieldQuery;
            });
            searchQuery._orQuery(orQueries);
        }
        
        if (filters.category) {
            searchQuery.equalTo('category', filters.category);
        }
        
        if (filters.priceMin) {
            searchQuery.greaterThanOrEqualTo('price', filters.priceMin);
        }
        
        if (filters.priceMax) {
            searchQuery.lessThanOrEqualTo('price', filters.priceMax);
        }
        
        if (filters.condition) {
            searchQuery.equalTo('condition', filters.condition);
        }
        
        if (filters.barterOnly) {
            searchQuery.equalTo('barterOption', true);
        }
        
        searchQuery.equalTo('status', 'available');
        searchQuery.include('seller');
        searchQuery.descending('createdAt');
        searchQuery.limit(filters.limit || 50);

        try {
            return await searchQuery.find();
        } catch (error) {
            console.error('Error searching marketplace:', error);
            return [];
        }
    }
}

export default MarketplaceService;