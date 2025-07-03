const fs = require('fs');
const path = require('path');

/**
 * Discord Bot Code Documentation Generator
 * This script automatically creates a documentation file containing
 * all your bot's files with their folder structure and code content.
 */

class CodeDocumentationGenerator {
    constructor(options = {}) {
        this.rootDir = options.rootDir || process.cwd();
        this.outputFile = options.outputFile || 'dummy.js';
        this.excludePatterns = options.excludePatterns || [
            'node_modules',
            '.git',
            '.gitignore',
            'package-lock.json',
            '.env',
            '*.log',
            '.DS_Store',
            'Thumbs.db',
            'docs.js', // Exclude docs.js from current folder
            this.outputFile
        ];
        this.includeExtensions = options.includeExtensions || ['.js', '.json', '.md', '.txt'];
        this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB default
    }

    /**
     * Check if a file/folder should be excluded
     */
    shouldExclude(filePath, fileName) {
        // Check if it's the docs.js file in the root directory
        if (fileName === 'docs.js') {
            const fullPath = path.resolve(this.rootDir, filePath);
            const rootDocsPath = path.resolve(this.rootDir, 'docs.js');
            if (fullPath === rootDocsPath) {
                return true; // Exclude docs.js from root directory
            }
        }
        
        // Exclude the output file (dummy.js)
        const isOutputFile = path.resolve(this.rootDir, filePath) === path.resolve(this.rootDir, this.outputFile);
        if (isOutputFile) {
            return true;
        }
        
        // Regular exclusion patterns for other files
        return this.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                // Handle wildcard patterns
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(fileName);
            }
            return fileName === pattern || filePath.includes(pattern);
        });
    }

    /**
     * Check if file extension is included
     */
    isIncludedExtension(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        return this.includeExtensions.includes(ext);
    }

    /**
     * Get relative path from root directory
     */
    getRelativePath(fullPath) {
        return path.relative(this.rootDir, fullPath);
    }

    /**
     * Read file content safely
     */
    readFileContent(filePath) {
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > this.maxFileSize) {
                return `// File too large (${Math.round(stats.size / 1024)}KB) - Content truncated\n// File: ${filePath}`;
            }
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            return `// Error reading file: ${error.message}`;
        }
    }

    /**
     * Recursively scan directory and collect files
     */
    scanDirectory(dirPath = this.rootDir, files = []) {
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                const relativePath = this.getRelativePath(fullPath);

                // Skip excluded files/folders
                if (this.shouldExclude(relativePath, item.name)) {
                    continue;
                }

                if (item.isDirectory()) {
                    // Recursively scan subdirectories
                    this.scanDirectory(fullPath, files);
                } else if (item.isFile() && this.isIncludedExtension(item.name)) {
                    files.push({
                        fullPath,
                        relativePath,
                        name: item.name,
                        directory: path.dirname(relativePath)
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error.message);
        }

        return files;
    }

    /**
     * Generate the documentation content
     */
    generateDocumentation() {
        console.log('🔍 Scanning files...');
        const files = this.scanDirectory();
        
        console.log(`📁 Found ${files.length} files to document`);

        let documentation = '';
        
        // Add header
        documentation += '/*\n';
        documentation += '='.repeat(80) + '\n';
        documentation += `Discord Bot Code Documentation\n`;
        documentation += `Generated on: ${new Date().toLocaleString()}\n`;
        documentation += `Root Directory: ${this.rootDir}\n`;
        documentation += `Total Files: ${files.length}\n`;
        documentation += '='.repeat(80) + '\n';
        documentation += '*/\n\n';

        // Add table of contents
        documentation += '// TABLE OF CONTENTS\n';
        documentation += '// ' + '='.repeat(50) + '\n';
        files.forEach((file, index) => {
            documentation += `// ${index + 1}. ${file.relativePath}\n`;
        });
        documentation += '\n\n';

        // Add file contents
        files.forEach((file, index) => {
            console.log(`📄 Processing: ${file.relativePath}`);
            
            documentation += '='.repeat(80) + '\n';
            documentation += `// ${index + 1}. FILE: ${file.relativePath}\n`;
            documentation += '='.repeat(80) + '\n';
            
            const content = this.readFileContent(file.fullPath);
            documentation += content;
            documentation += '\n\n';
        });

        // Add footer
        documentation += '/*\n';
        documentation += '='.repeat(80) + '\n';
        documentation += 'End of Documentation\n';
        documentation += `Total Files Documented: ${files.length}\n`;
        documentation += `Generated by: Discord Bot Documentation Generator\n`;
        documentation += `Date: ${new Date().toLocaleString()}\n`;
        documentation += '='.repeat(80) + '\n';
        documentation += '*/\n';

        return documentation;
    }

    /**
     * Save documentation to file
     */
    saveDocumentation(content) {
        try {
            // Delete existing dummy.js if it exists
            if (fs.existsSync(this.outputFile)) {
                fs.unlinkSync(this.outputFile);
                console.log(`🗑️  Deleted existing output file: ${this.outputFile}`);
            }
            
            fs.writeFileSync(this.outputFile, content, 'utf8');
            console.log(`✅ Documentation saved to: ${this.outputFile}`);
            console.log(`📊 File size: ${Math.round(content.length / 1024)}KB`);
        } catch (error) {
            console.error('❌ Error saving documentation:', error.message);
            throw error;
        }
    }

    /**
     * Generate and save documentation
     */
    async generate() {
        try {
            console.log('🚀 Starting documentation generation...');
            console.log(`📂 Root directory: ${this.rootDir}`);
            console.log(`📝 Output file: ${this.outputFile}`);
            
            const startTime = Date.now();
            const documentation = this.generateDocumentation();
            this.saveDocumentation(documentation);
            
            const endTime = Date.now();
            console.log(`⏱️  Generation completed in ${endTime - startTime}ms`);
            
            return this.outputFile;
        } catch (error) {
            console.error('❌ Documentation generation failed:', error.message);
            throw error;
        }
    }
}

// Configuration options
const config = {
    rootDir: process.cwd(), // Current directory
    outputFile: 'dummy.js',
    excludePatterns: [
        'node_modules',
        '.git',
        '.gitignore',
        'package-lock.json',
        '.env',
        '*.log',
        '.DS_Store',
        'Thumbs.db',
        'docs.js',
        'dummy.js',
        'commands/normal/BotInfo/botinfo.js',
        'commands/slash/BotInfo/botinfo.js',
        'commands/normal/BotInfo/uptime.js',
        'commands/slash/BotInfo/uptime.js',
        'commands/normal/BotInfo/stats.js',
        'commands/slash/BotInfo/stats.js'
    ],
    includeExtensions: ['.js', '.json', '.md', '.txt', '.yml', '.yaml'],
    maxFileSize: 1024 * 1024 // 1MB
};

// Main execution
async function main() {
    const generator = new CodeDocumentationGenerator(config);
    
    try {
        // Generate documentation
        await generator.generate();
        
        console.log('\n🎉 Documentation generation completed successfully!');
        console.log('📁 Generated file:');
        console.log(`   - ${config.outputFile} (Full documentation)`);
        
        console.log('\n📝 Note: docs.js from current folder is excluded from documentation.');
        console.log('🗑️  Any existing dummy.js was deleted and recreated.');
        console.log('💡 The generated dummy.js contains all your bot\'s code documentation.');
    } catch (error) {
        console.error('\n💥 Documentation generation failed:', error.message);
        process.exit(1);
    }
}

// CLI usage
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = CodeDocumentationGenerator;