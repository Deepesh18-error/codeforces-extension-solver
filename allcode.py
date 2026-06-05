import os

# 1. Extensions to include based on your project structure
CODE_EXTENSIONS = {'.js', '.json', '.html', '.css'}

# 2. Specific filenames to include (often have no extension or special ones)
INCLUDE_FILENAMES = {'.gitignore', 'package.json', 'manifest.json'}

# 3. Folders and files to strictly EXCLUDE
EXCLUDE_DIRS = {'node_modules', '.git', 'icons', 'dist', 'build'} 
EXCLUDE_FILENAMES = {
    'package-lock.json', 
    'README.md', 
    'extract_code.py',  # Exclude this script itself
    'all_project_code.txt',
    '.env'
}

def should_include_file(filename, filepath):
    # Exclude if in an excluded directory
    for exclude_dir in EXCLUDE_DIRS:
        if f"{os.sep}{exclude_dir}{os.sep}" in filepath or filepath.startswith(f"{exclude_dir}{os.sep}"):
            return False
    
    # Exclude specific filenames
    if filename in EXCLUDE_FILENAMES:
        return False

    # Include if extension matches OR if it's in our specific include list
    extension = os.path.splitext(filename)[1]
    return extension in CODE_EXTENSIONS or filename in INCLUDE_FILENAMES

def main():
    output_filename = 'all_project_code.txt'
    count = 0
    
    print(f"Starting code extraction into {output_filename}...")
    
    with open(output_filename, 'w', encoding='utf-8') as out_file:
        # Walk from the current directory
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories efficiently
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                filepath = os.path.join(root, file)
                
                # Normalize path for the header (removes the './' prefix)
                display_path = os.path.relpath(filepath, '.')

                if should_include_file(file, filepath):
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as src:
                            out_file.write(f'--- {display_path} ---\n')
                            out_file.write(src.read())
                            out_file.write('\n\n' + '='*50 + '\n\n') # Separator between files
                        print(f'Added: {display_path}')
                        count += 1
                    except Exception as e:
                        print(f'Error processing {display_path}: {e}')

    print(f"\nDone! Successfully combined {count} files into {output_filename}")

if __name__ == '__main__':
    main()
