class EventService {
    constructor(app) {
        this.app = app;
    }

    async createVibeEvent(eventData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const event = new VibeEvent();
        
        event.set('host', this.app.currentUser);
        event.set('title', eventData.title);
        event.set('description', eventData.description);
        event.set('eventDate', new Date(eventData.date));
        event.set('location', eventData.location);
        event.set('ticketsAvailable', eventData.tickets);
        event.set('qrEntry', this.generateQRCode(eventData.title + Date.now()));
        event.set('promoted', eventData.promoted || false);
        event.set('attendees', [this.app.currentUser]);
        event.set('coverImage', eventData.coverImage);
        event.set('price', eventData.price || 0);

        await event.save();
        
        this.app.showSuccess('Event created successfully! 🎉');
        return event;
    }

    async rsvpToEvent(eventId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        const event = await query.get(eventId);
        
        const currentAttendees = event.get('attendees') || [];
        const ticketsAvailable = event.get('ticketsAvailable');
        
        if (currentAttendees.length >= ticketsAvailable) {
            throw new Error('Event is fully booked');
        }

        event.addUnique('attendees', this.app.currentUser);
        await event.save();

        await this.app.services.wallet.addLoyaltyPoints(25, 'event_rsvp');

        this.app.showSuccess('Successfully RSVPed to the event!');
        return event;
    }

    async startLiveStream(streamData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const stream = new VibeLiveStream();
        
        const streamKey = this.generateStreamKey();
        
        stream.set('host', this.app.currentUser);
        stream.set('title', streamData.title);
        stream.set('category', streamData.category);
        stream.set('streamKey', streamKey);
        stream.set('viewers', []);
        stream.set('isLive', true);
        stream.set('type', streamData.type || 'video');
        stream.set('thumbnail', streamData.thumbnail);
        stream.set('startedAt', new Date());
        
        await stream.save();

        await this.app.services.notifications.notifyFollowers(
            `${this.app.currentUser.get('username')} started a live stream: ${streamData.title}`
        );

        this.app.showSuccess('Live stream started! 🎥');
        return { stream, streamKey };
    }

    async joinStream(streamId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const query = new Parse.Query(VibeLiveStream);
        const stream = await query.get(streamId);
        
        if (!stream.get('isLive')) {
            throw new Error('Stream is not live');
        }

        stream.addUnique('viewers', this.app.currentUser);
        await stream.save();

        this.app.services.realtime.broadcastUpdate('viewer_joined', {
            streamId: streamId,
            viewer: this.app.currentUser.get('username'),
            viewerCount: (stream.get('viewers') || []).length
        });

        this.app.showSuccess('Joined the live stream!');
        return stream;
    }

    async endStream(streamId) {
        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const query = new Parse.Query(VibeLiveStream);
        const stream = await query.get(streamId);
        
        if (stream.get('host').id !== this.app.currentUser.id) {
            throw new Error('Only the host can end the stream');
        }

        stream.set('isLive', false);
        stream.set('endedAt', new Date());
        await stream.save();

        this.app.services.realtime.broadcastUpdate('stream_ended', {
            streamId: streamId,
            host: this.app.currentUser.get('username')
        });

        this.app.showSuccess('Stream ended successfully');
        return stream;
    }

    async loadUpcomingEvents(limit = 20) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        query.greaterThan('eventDate', new Date());
        query.include('host');
        query.ascending('eventDate');
        query.limit(limit);

        try {
            const events = await query.find();
            this.displayEvents(events);
            return events;
        } catch (error) {
            console.error('Error loading events:', error);
            this.app.showError('Failed to load events');
            return [];
        }
    }

    async loadLiveStreams(limit = 10) {
        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const query = new Parse.Query(VibeLiveStream);
        query.equalTo('isLive', true);
        query.include('host');
        query.descending('startedAt');
        query.limit(limit);

        try {
            const streams = await query.find();
            this.displayLiveStreams(streams);
            return streams;
        } catch (error) {
            console.error('Error loading live streams:', error);
            return [];
        }
    }

    async loadHostedEvents() {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        query.equalTo('host', this.app.currentUser);
        query.descending('createdAt');
        query.limit(50);

        try {
            return await query.find();
        } catch (error) {
            console.error('Error loading hosted events:', error);
            return [];
        }
    }

    async searchEvents(searchParams) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        
        if (searchParams.title) {
            query.contains('title', searchParams.title);
        }
        
        if (searchParams.location) {
            query.near('location', searchParams.location);
        }
        
        if (searchParams.dateRange) {
            query.greaterThanOrEqualTo('eventDate', new Date(searchParams.dateRange.start));
            query.lessThanOrEqualTo('eventDate', new Date(searchParams.dateRange.end));
        }
        
        if (searchParams.priceRange) {
            query.greaterThanOrEqualTo('price', searchParams.priceRange.min);
            query.lessThanOrEqualTo('price', searchParams.priceRange.max);
        }
        
        query.include('host');
        query.ascending('eventDate');
        query.limit(50);

        try {
            return await query.find();
        } catch (error) {
            console.error('Error searching events:', error);
            return [];
        }
    }

    generateQRCode(data) {
        return 'QR_' + btoa(data).substr(0, 20);
    }

    generateStreamKey() {
        return 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    displayEvents(events) {
        const eventsContainer = document.getElementById('events-list');
        if (!eventsContainer) return;

        eventsContainer.innerHTML = events.map(event => `
            <div class="event-card" data-event-id="${event.id}">
                <div class="event-cover">
                    <img src="${event.get('coverImage')?.url() || '/assets/default-event.jpg'}" alt="${event.get('title')}">
                </div>
                <div class="event-details">
                    <h3 class="event-title">${event.get('title')}</h3>
                    <p class="event-description">${event.get('description')}</p>
                    <div class="event-meta">
                        <div class="event-date">${new Date(event.get('eventDate')).toLocaleString()}</div>
                        <div class="event-location">${event.get('location') ? event.get('location').toString() : 'Online'}</div>
                        <div class="event-price">${event.get('price') ? event.get('price') + ' VIBE' : 'Free'}</div>
                    </div>
                    <div class="event-stats">
                        <span>${event.get('attendees')?.length || 0} attending</span>
                        <span>${event.get('ticketsAvailable') - (event.get('attendees')?.length || 0)} tickets left</span>
                    </div>
                    <button onclick="vibeApp.services.events.rsvpToEvent('${event.id}')" class="btn-rsvp">
                        RSVP Now
                    </button>
                </div>
            </div>
        `).join('');
    }

    displayLiveStreams(streams) {
        const streamsContainer = document.getElementById('live-streams');
        if (!streamsContainer) return;

        streamsContainer.innerHTML = streams.map(stream => `
            <div class="stream-card" data-stream-id="${stream.id}">
                <div class="stream-thumbnail">
                    <img src="${stream.get('thumbnail')?.url() || '/assets/default-stream.jpg'}" alt="${stream.get('title')}">
                    <div class="live-badge">LIVE</div>
                    <div class="viewer-count">${(stream.get('viewers') || []).length} viewers</div>
                </div>
                <div class="stream-details">
                    <h3 class="stream-title">${stream.get('title')}</h3>
                    <div class="stream-host">Hosted by ${stream.get('host').get('username')}</div>
                    <div class="stream-category">${stream.get('category')}</div>
                    <div class="stream-actions">
                        <button onclick="vibeApp.services.events.joinStream('${stream.id}')" class="btn-watch">
                            Watch Stream
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async getEventAnalytics(eventId) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        const event = await query.get(eventId);
        
        const attendees = event.get('attendees') || [];
        const ticketsAvailable = event.get('ticketsAvailable');
        
        return {
            totalAttendees: attendees.length,
            attendanceRate: (attendees.length / ticketsAvailable) * 100,
            ticketsRemaining: ticketsAvailable - attendees.length,
            revenue: event.get('price') * attendees.length
        };
    }

    async promoteEvent(eventId, promotionData) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        const event = await query.get(eventId);
        
        if (event.get('host').id !== this.app.currentUser.id) {
            throw new Error('Only the host can promote the event');
        }

        event.set('promoted', true);
        await event.save();

        // Create promotion campaign
        await this.createPromotionCampaign(eventId, promotionData);

        this.app.showSuccess('Event promoted successfully!');
        return event;
    }

    async createPromotionCampaign(eventId, promotionData) {
        // This would integrate with advertising services
        // For now, just track the promotion
        console.log('Creating promotion campaign for event:', eventId, promotionData);
        
        await this.app.services.ai.trackUserBehavior('event_promotion', {
            eventId: eventId,
            budget: promotionData.budget,
            targetAudience: promotionData.targetAudience
        });
    }

    async sendEventReminders(eventId) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        const event = await query.get(eventId);
        
        const attendees = event.get('attendees') || [];
        
        for (const attendee of attendees) {
            await this.app.services.notifications.createNotification(
                attendee.id,
                'event_reminder',
                `Reminder: ${event.get('title')} is happening soon!`
            );
        }

        this.app.showSuccess('Event reminders sent to all attendees!');
    }

    async exportEventAttendees(eventId) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        query.include('attendees');
        const event = await query.get(eventId);
        
        const attendees = event.get('attendees') || [];
        const attendeeData = attendees.map(attendee => ({
            username: attendee.get('username'),
            email: attendee.get('email'),
            rsvpDate: event.get('createdAt')
        }));

        // Create downloadable CSV
        this.downloadCSV(attendeeData, `${event.get('title')}_attendees.csv`);
        
        return attendeeData;
    }

    downloadCSV(data, filename) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        const headers = Object.keys(data[0] || {});
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    async createStreamChat(streamId) {
        const streamChat = await this.app.services.chat.createChatRoom(
            `Stream Chat - ${streamId}`,
            true,
            [] // Members will be added as they join
        );

        return streamChat;
    }

    async handleStreamEnded(streamId) {
        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const query = new Parse.Query(VibeLiveStream);
        const stream = await query.get(streamId);
        
        // Generate replay URL (in a real app, this would come from your streaming service)
        const replayURL = `https://vibelink0372.streams/replay/${streamId}`;
        stream.set('replayURL', replayURL);
        await stream.save();

        // Notify viewers about the replay
        const viewers = stream.get('viewers') || [];
        for (const viewer of viewers) {
            await this.app.services.notifications.createNotification(
                viewer.id,
                'stream_replay',
                `Replay available for: ${stream.get('title')}`
            );
        }

        return stream;
    }

    async getStreamStats(streamId) {
        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const query = new Parse.Query(VibeLiveStream);
        const stream = await query.get(streamId);
        
        const viewers = stream.get('viewers') || [];
        const startTime = stream.get('startedAt');
        const endTime = stream.get('endedAt') || new Date();
        const duration = endTime - startTime;

        return {
            peakViewers: viewers.length,
            totalViewers: viewers.length, // In a real app, you'd track unique viewers
            averageViewTime: this.calculateAverageViewTime(viewers, duration),
            engagementRate: this.calculateEngagementRate(streamId),
            duration: Math.floor(duration / (1000 * 60)) // Duration in minutes
        };
    }

    calculateAverageViewTime(viewers, streamDuration) {
        // Simplified calculation - in a real app, you'd track individual view times
        return Math.floor(streamDuration / (1000 * 60) * 0.7); // Assume 70% average watch time
    }

    calculateEngagementRate(streamId) {
        // This would calculate engagement based on chat messages, reactions, etc.
        return 0.65; // Placeholder
    }

    async recordStreamReaction(streamId, reactionType) {
        await this.app.services.ai.trackUserBehavior('stream_reaction', {
            streamId: streamId,
            reactionType: reactionType
        });

        this.app.services.realtime.broadcastUpdate('stream_reaction', {
            streamId: streamId,
            reactionType: reactionType,
            user: this.app.currentUser.get('username')
        });
    }
}

export default EventService;