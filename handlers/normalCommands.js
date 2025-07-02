const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const loadNormalCommands = (dir = '') => {
        const commandsPath = path.join(__dirname, '../commands/normal', dir);
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }
        
        const items = fs.readdirSync(commandsPath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                // Recursively load commands from subdirectories
                loadNormalCommands(path.join(dir, item.name));
            } else if (item.name.endsWith('.js')) {
                const filePath = path.join(commandsPath, item.name);
                
                delete require.cache[require.resolve(filePath)];
                
                try {
                    const command = require(filePath);
                    if ('name' in command && 'execute' in command) {
                        client.normalCommands.set(command.name, command);
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    };
    
    const watchDirectory = (dir) => {
        const watchPath = path.join(__dirname, '../commands/normal', dir);
        if (!fs.existsSync(watchPath)) return;
        
        fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                client.normalCommands.clear();
                loadNormalCommands();
            }
        });
    };
    
    loadNormalCommands();
    watchDirectory('');
};