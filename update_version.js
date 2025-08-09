import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// update version file 
const music_version_file_path = path.join(__dirname, 'frontend/projects/music/public/app/version.txt');
function update_music_version() {
    try {
        // Read current version
        let currentVersion = '0.0.0';
        if (fs.existsSync(music_version_file_path)) {
            currentVersion = fs.readFileSync(music_version_file_path, 'utf8').trim();
        }
        
        // Parse version format: major.minor.patch[suffix]
        const versionRegex = /^(\d+)\.(\d+)\.(\d+)([a-zA-Z]*)$/;
        const match = currentVersion.match(versionRegex);
        
        if (!match) {
            console.warn(`Invalid version format: ${currentVersion}, using 0.0.1`);
            currentVersion = '0.0.1';
        } else {
            const major = match[1];
            const minor = match[2];
            const patch = parseInt(match[3], 10);
            const suffix = match[4] || ''; // Preserve letter suffix (like 'b')
            
            // Increment patch number and rebuild version
            const newPatch = patch + 1;
            currentVersion = `${major}.${minor}.${newPatch}${suffix}`;
        }
        
        // Write updated version to file
        fs.writeFileSync(music_version_file_path, currentVersion, 'utf8');
        console.log(`📦 Version updated to: ${currentVersion}`);
        
        return currentVersion;
    } catch (error) {
        console.error('❌ Error updating version file:', error);
        return null;
    }
}
update_music_version();