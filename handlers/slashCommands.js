const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const loadSlashCommands = (dir = '') => {
        const commandsPath = path.join(__dirname, '../commands/slash', dir);
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }
        
        const items = fs.readdirSync(commandsPath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                // Recursively load commands from subdirectories
                loadSlashCommands(path.join(dir, item.name));
            } else if (item.name.endsWith('.js')) {
                const filePath = path.join(commandsPath, item.name);
                
                delete require.cache[require.resolve(filePath)];
                
                try {
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        // Check for duplicates before setting
                        if (client.slashCommands.has(command.data.name)) {
                            continue;
                        }
                        
                        client.slashCommands.set(command.data.name, command);
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    };
    
    const watchDirectory = (dir) => {
        const watchPath = path.join(__dirname, '../commands/slash', dir);
        if (!fs.existsSync(watchPath)) return;
        
        fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                client.slashCommands.clear();
                loadSlashCommands();
            }
        });
    };
    
    // Clear existing commands before loading to prevent duplicates
    client.slashCommands.clear();
    loadSlashCommands();
    watchDirectory('');
};