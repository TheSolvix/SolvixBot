// variables.js
const emojis = require('./variables/emojis.js');
const colors = require('./variables/colors.js');

module.exports = {
    // Bot information
    botName: 'Solvix',
    botVersion: '1.0.0',
    
    // Import colors and emojis
    ...require('./variables/colors.js'),
    emojis: require('./variables/emojis.js'),
    
    // Timing (in milliseconds)
    statusRotationInterval: 30000, // 30 seconds
    slashCommandRefreshInterval: 1800000, // 30 minutes
    
    // Command settings
    commandCooldown: 3000, // 3 seconds
    maxCommandLength: 2000,
    cooldownMessageDeleteTime: 2500, // Time to delete cooldown message (in ms)
    
    // Embed settings
    embedThumbnail: null,
    embedFooter: 'Solvix', // Default fallback footer
    embedTimestamp: true,
    
    // Command statistics tracking
    commandStats: {
        total: 0,
        commands: {}
    },
    
    // Author helper function
    getAuthor: function(client) {
        return {
            name: `${this.botName} • v${this.botVersion}`,
            iconURL: client.user.displayAvatarURL()
        };
    },
    
    // Rest of your existing functions...
    // (keep all the existing functions like getPingEmoji, getPingStatus, etc.)
    
    // Footer helper functions
    getSlashCommandFooter: function(interaction) {
        return {
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        };
    },
    
    getNormalCommandFooter: function(message) {
        return {
            text: `Requested by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        };
    },
    
    // Generic footer function that detects the type
    getCommandFooter: function(context) {
        if (context.user) {
            // It's an interaction
            return this.getSlashCommandFooter(context);
        } else if (context.author) {
            // It's a message
            return this.getNormalCommandFooter(context);
        } else {
            // Fallback
            return { text: this.embedFooter };
        }
    },
    
    // Websocket Latency (Bot Latency) utility functions
    getPingEmoji: function(ping) {
        if (ping > 400) return emojis.ping_poor;
        if (ping > 150) return emojis.ping_noticeable;
        if (ping > 50) return emojis.ping_good;
        return emojis.ping_excellent;
    },
    
    getPingStatus: function(ping) {
        if (ping > 400) return 'Poor';
        if (ping > 150) return 'Noticeable';
        if (ping > 50) return 'Good';
        return 'Excellent';
    },
    
    // Round Trip Latency utility functions (using different thresholds)
    getRoundTripEmoji: function(latency) {
        if (latency > 800) return emojis.ping_poor;      // Very slow round trip
        if (latency > 400) return emojis.ping_noticeable; // Noticeable delay
        if (latency > 200) return emojis.ping_good;       // Good response
        return emojis.ping_excellent;                     // Excellent response
    },
    
    getRoundTripStatus: function(latency) {
        if (latency > 800) return 'Poor';
        if (latency > 400) return 'Noticeable';
        if (latency > 200) return 'Good';
        return 'Excellent';
    },
    
    // Overall connection quality based on both metrics
    getOverallStatus: function(roundTrip, websocket) {
        const roundTripScore = this.getLatencyScore(roundTrip, 'roundtrip');
        const websocketScore = this.getLatencyScore(websocket, 'websocket');
        
        // Calculate average score
        const averageScore = (roundTripScore + websocketScore) / 2;
        
        if (averageScore >= 4) return 'Excellent';
        if (averageScore >= 3) return 'Good';
        if (averageScore >= 2) return 'Noticeable';
        return 'Poor';
    },
    
    // Helper function to convert latency to score
    getLatencyScore: function(latency, type) {
        if (type === 'roundtrip') {
            if (latency <= 200) return 4;  // Excellent
            if (latency <= 400) return 3;  // Good
            if (latency <= 800) return 2;  // Noticeable
            return 1;                      // Poor
        } else { // websocket
            if (latency <= 50) return 4;   // Excellent
            if (latency <= 150) return 3;  // Good
            if (latency <= 400) return 2;  // Noticeable
            return 1;                      // Poor
        }
    },
    
    // Get color based on latency (useful for future enhancements)
    getLatencyColor: function(latency, type = 'websocket') {
        const score = this.getLatencyScore(latency, type);
        switch (score) {
            case 4: return colors.successColor;    // Excellent - Green
            case 3: return colors.infoColor;       // Good - Blue
            case 2: return colors.warningColor;    // Noticeable - Yellow
            case 1: return colors.errorColor;      // Poor - Red
            default: return colors.embedColor;     // Default
        }
    }
};