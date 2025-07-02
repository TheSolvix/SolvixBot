// handlers/autoExecute.js
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const loadAutoExecuteModules = () => {
        const autoExecutePath = path.join(__dirname, '../autoexecute');
        
        // Create AutoExecute directory if it doesn't exist
        if (!fs.existsSync(autoExecutePath)) {
            fs.mkdirSync(autoExecutePath, { recursive: true });
            console.log('📁 Created AutoExecute directory');
            return;
        }
        
        const autoExecuteFiles = fs.readdirSync(autoExecutePath).filter(file => file.endsWith('.js'));
        
        if (autoExecuteFiles.length === 0) {
            console.log('📂 No AutoExecute modules found');
            return;
        }
        
        for (const file of autoExecuteFiles) {
            try {
                const filePath = path.join(autoExecutePath, file);
                
                // Clear cache to ensure fresh load
                delete require.cache[require.resolve(filePath)];
                
                const autoExecuteModule = require(filePath);
                
                // Validate the module structure
                if (!autoExecuteModule.name || !autoExecuteModule.event || !autoExecuteModule.execute) {
                    console.warn(`⚠️ Invalid AutoExecute module: ${file} (missing required properties)`);
                    continue;
                }
                
                // Register the event listener
                client.on(autoExecuteModule.event, (...args) => {
                    try {
                        autoExecuteModule.execute(...args, client);
                    } catch (error) {
                        console.error(`❌ Error executing AutoExecute module ${autoExecuteModule.name}:`, error);
                    }
                });
                
                console.log(`✅ Loaded AutoExecute module: ${autoExecuteModule.name} (${autoExecuteModule.event})`);
                
            } catch (error) {
                console.error(`❌ Error loading AutoExecute module ${file}:`, error);
            }
        }
        
        console.log(`📦 Loaded ${autoExecuteFiles.length} AutoExecute modules`);
    };
    
    // Watch for changes in AutoExecute directory for hot reloading
    const watchAutoExecuteDirectory = () => {
        const autoExecutePath = path.join(__dirname, '../AutoExecute');
        
        if (!fs.existsSync(autoExecutePath)) {
            return;
        }
        
        fs.watch(autoExecutePath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                console.log(`🔄 AutoExecute file changed: ${filename}, reloading...`);
                
                // Remove all existing listeners for auto-execute events
                const autoExecuteEvents = ['guildCreate', 'guildDelete', 'guildMemberAdd', 'guildMemberRemove',];
                autoExecuteEvents.forEach(event => {
                    client.removeAllListeners(event);
                });
                
                // Reload all auto-execute modules
                loadAutoExecuteModules();
            }
        });
    };
    
    // Load modules and start watching
    loadAutoExecuteModules();
    watchAutoExecuteDirectory();
};