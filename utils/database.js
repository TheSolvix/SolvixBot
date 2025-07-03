const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.guildPrefixesFile = path.join(this.dataDir, 'guild_prefixes.json');
        this.isConnected = false;
        this.guildPrefixes = {};
    }

    async connect() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });

            // Load existing guild prefixes or create empty file
            try {
                const data = await fs.readFile(this.guildPrefixesFile, 'utf8');
                this.guildPrefixes = JSON.parse(data);
            } catch (error) {
                // File doesn't exist or is invalid, start with empty data
                this.guildPrefixes = {};
                await this.saveGuildPrefixes();
            }

            this.isConnected = true;
            console.log('✅ Connected to JSON file database');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize JSON database:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await this.saveGuildPrefixes();
            console.log('✅ Disconnected from JSON file database');
        }
    }

    async saveGuildPrefixes() {
        try {
            await fs.writeFile(this.guildPrefixesFile, JSON.stringify(this.guildPrefixes, null, 2));
        } catch (error) {
            console.error('Error saving guild prefixes:', error.message);
        }
    }

    getCollection(name) {
        if (!this.isConnected) {
            return null;
        }
        // For compatibility with existing code
        return { name };
    }

    async getGuildPrefix(guildId) {
        try {
            if (!this.isConnected) {
                return null;
            }

            return this.guildPrefixes[guildId] || null;
        } catch (error) {
            console.error('Error getting guild prefix:', error.message);
            return null;
        }
    }

    async setGuildPrefix(guildId, prefix) {
        try {
            if (!this.isConnected) {
                console.warn('Database not connected, cannot set guild prefix');
                return false;
            }

            this.guildPrefixes[guildId] = prefix;
            await this.saveGuildPrefixes();
            return true;
        } catch (error) {
            console.error('Error setting guild prefix:', error.message);
            return false;
        }
    }

    async removeGuildPrefix(guildId) {
        try {
            if (!this.isConnected) {
                console.warn('Database not connected, cannot remove guild prefix');
                return false;
            }

            delete this.guildPrefixes[guildId];
            await this.saveGuildPrefixes();
            return true;
        } catch (error) {
            console.error('Error removing guild prefix:', error.message);
            return false;
        }
    }

    async removeGuild(guildId) {
        try {
            if (!this.isConnected) {
                console.warn('Database not connected, cannot remove guild');
                return false;
            }

            delete this.guildPrefixes[guildId];
            await this.saveGuildPrefixes();
            return true;
        } catch (error) {
            console.error('Error removing guild:', error.message);
            return false;
        }
    }

    // Get all guild prefixes (for statistics or management)
    async getAllGuildPrefixes() {
        try {
            if (!this.isConnected) {
                return {};
            }

            return { ...this.guildPrefixes };
        } catch (error) {
            console.error('Error getting all guild prefixes:', error.message);
            return {};
        }
    }
}

module.exports = new Database();