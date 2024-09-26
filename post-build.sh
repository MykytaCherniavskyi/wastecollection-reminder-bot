#!/bin/bash

# Directory containing the compiled JavaScript files
DIST_DIR="./dist/lambdas"

# Function to rename .js files to .mjs
rename_js_to_mjs() {
    local dir="$1"
    for file in "$dir"/*.js; do
        if [ -f "$file" ]; then
            mv "$file" "${file%.js}.mjs"
            echo "Renamed: $file -> ${file%.js}.mjs"
        fi
    done

    # Process subdirectories recursively
    for subdir in "$dir"/*/ ; do
        if [ -d "$subdir" ]; then
            rename_js_to_mjs "$subdir"
        fi
    done
}

# Main execution
if [ -d "$DIST_DIR" ]; then
    echo "Starting post-build processing..."
    rename_js_to_mjs "$DIST_DIR"
    echo "Post-build processing completed."
else
    echo "Error: $DIST_DIR directory not found. Make sure TypeScript compilation was successful."
    exit 1
fi