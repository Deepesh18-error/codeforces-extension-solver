import os

# List of code file extensions to include
CODE_EXTENSIONS = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.rb', '.go', '.php', '.html', '.css']

def should_include_file(filepath):
    # Exclude anything in node_modules
    return 'node_modules' not in filepath and os.path.splitext(filepath)[1] in CODE_EXTENSIONS

def main():
    with open('all_code.txt', 'w', encoding='utf-8') as out_file:
        for root, dirs, files in os.walk('.'):
            # Skip node_modules directories
            dirs[:] = [d for d in dirs if d != 'node_modules']
            for file in files:
                filepath = os.path.join(root, file)
                if should_include_file(filepath):
                    try:
                        with open(filepath, 'r', encoding='utf-8') as src:
                            out_file.write(f'--- {filepath} ---\n')
                            out_file.write(src.read())
                            out_file.write('\n\n')
                        print(f'Added: {filepath}')
                    except Exception as e:
                        print(f'Error processing {filepath}: {e}')

if __name__ == '__main__':
    main()