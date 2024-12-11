import pkg from '../package.json' assert { type: 'json' };

export const formatDefinition = {
    name: pkg.name,
    version: pkg.version,
    author: pkg.author,
    description: pkg.description,
    proofing: false,
    source: '' // This will be filled with the HTML template
};