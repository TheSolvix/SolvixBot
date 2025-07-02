require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Path to the prefixes file
const prefixesPath = path.join(__dirname, 'prefixes.json');

// Load prefixes from file or create empty object
let guildPrefixes = {};
if (fs.existsSync(prefixesPath)) {
    guildPrefixes = JSON.parse(fs.readFileSync(prefixesPath, 'utf8'));
}

// Function to save prefixes
function savePrefixes() {
    fs.writeFileSync(prefixesPath, JSON.stringify(guildPrefixes, null, 2));
}

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: '1389543343595327618',
    prefix: 'sv!',
    mention: false,
    ownerId: '1356342705784881368',
    allowDMs: false,
    guildPrefixes, // Add the loaded prefixes
    savePrefixes   // Add the save function
};