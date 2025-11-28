from flask import Flask, send_from_directory, jsonify, send_file, Response
import os
import sys

# Get the directory where this file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, 
            static_folder=os.path.join(BASE_DIR, 'static'),
            static_url_path='',
            root_path=BASE_DIR)

# Add CORS headers for API requests
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 
                        'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 
                        'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Serve the main HTML file
@app.route('/')
def index():
    try:
        static_dir = os.path.join(BASE_DIR, 'static')
        index_path = os.path.join(static_dir, 'index.html')
        if not os.path.exists(index_path):
            return jsonify({
                'error': 'index.html not found',
                'path': index_path,
                'base_dir': BASE_DIR,
                'cwd': os.getcwd(),
                'static_dir': static_dir,
                'files': os.listdir(BASE_DIR) if os.path.exists(BASE_DIR) else []
            }), 500
        return send_from_directory(static_dir, 'index.html', 
                                  mimetype='text/html')
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'base_dir': BASE_DIR,
            'cwd': os.getcwd()
        }), 500

# Serve static JavaScript and CSS files
@app.route('/game.js')
def serve_game_js():
    try:
        return send_from_directory(
            os.path.join(BASE_DIR, 'static'), 
            'game.js', 
            mimetype='application/javascript'
        )
    except Exception as e:
        return jsonify({'error': str(e), 'base_dir': BASE_DIR}), 500

@app.route('/style.css')
def serve_style_css():
    try:
        return send_from_directory(
            os.path.join(BASE_DIR, 'static'), 
            'style.css', 
            mimetype='text/css'
        )
    except Exception as e:
        return jsonify({'error': str(e), 'base_dir': BASE_DIR}), 500

# Serve assets files (videos, audio, etc.)
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    try:
        assets_path = os.path.join(BASE_DIR, 'assets', filename)
        if not os.path.exists(assets_path):
            return jsonify({
                'error': 'File not found',
                'requested': filename,
                'assets_path': assets_path,
                'base_dir': BASE_DIR,
                'assets_dir_exists': os.path.exists(os.path.join(BASE_DIR, 'assets')),
                'files_in_assets': os.listdir(os.path.join(BASE_DIR, 'assets')) if os.path.exists(os.path.join(BASE_DIR, 'assets')) else []
            }), 404
        
        # Determine MIME type based on extension
        ext = os.path.splitext(filename)[1].lower()
        mime_types = {
            '.mp4': 'video/mp4',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ttf': 'font/ttf',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2'
        }
        mimetype = mime_types.get(ext, 'application/octet-stream')
        
        return send_from_directory(
            os.path.join(BASE_DIR, 'assets'), 
            filename, 
            mimetype=mimetype
        )
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'filename': filename,
            'base_dir': BASE_DIR
        }), 500

# Serve static files (JS, CSS, etc.)
@app.route('/<path:filename>')
def serve_static_files(filename):
    # Skip API routes
    if filename.startswith('api/'):
        return 'Not found', 404
    
    # Check if it's a static file request
    static_extensions = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.wav': 'audio/wav',
        '.json': 'application/json'
    }
    
    # Skip assets folder - handled by dedicated route
    if filename.startswith('assets/'):
        return 'Not found', 404
    
    # Get file extension
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in static_extensions:
        static_path = os.path.join(BASE_DIR, 'static', filename)
        if os.path.exists(static_path):
            return send_from_directory(
                os.path.join(BASE_DIR, 'static'), 
                filename, 
                mimetype=static_extensions[ext]
            )
        # If file not in static, try root directory (for level JSON files)
        root_path = os.path.join(BASE_DIR, filename)
        if ext == '.json' and os.path.exists(root_path):
            return send_file(root_path, mimetype='application/json')
    
    # For non-static paths, serve index.html (SPA fallback)
    try:
        return send_from_directory(
            os.path.join(BASE_DIR, 'static'), 
            'index.html', 
            mimetype='text/html'
        )
    except Exception as e:
        return jsonify({'error': str(e), 'base_dir': BASE_DIR}), 500

# Health check endpoint
@app.route('/health')
def health():
    static_dir = os.path.join(BASE_DIR, 'static')
    return jsonify({
        'status': 'ok',
        'base_dir': BASE_DIR,
        'cwd': os.getcwd(),
        'static_folder': os.path.exists(static_dir),
        'index_exists': os.path.exists(os.path.join(static_dir, 'index.html')),
        'game_js_exists': os.path.exists(os.path.join(static_dir, 'game.js')),
        'style_css_exists': os.path.exists(os.path.join(static_dir, 'style.css')),
        'level1_exists': os.path.exists(os.path.join(BASE_DIR, 'level1.json')),
        'files_in_base': os.listdir(BASE_DIR) if os.path.exists(BASE_DIR) else []
    })

# API endpoint to load level data
@app.route('/api/levels/<int:level_num>')
def get_level(level_num):
    """Load character level data."""
    json_path = os.path.join(BASE_DIR, f'level{level_num}.json')
    txt_path = os.path.join(BASE_DIR, f'level{level_num}.txt')
    
    level_map = {}
    if os.path.exists(json_path):
        try:
            import json
            with open(json_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    ch = item.get('character') or item.get('char')
                    py = item.get('pinyin') or item.get('py')
                    if ch and py:
                        level_map[ch] = py
            elif isinstance(data, dict):
                level_map = data
        except Exception as e:
            print(f'Error loading level {level_num}: {e}')
            pass
    else:
        print(f'Level file not found: {json_path}')
    
    if not level_map and os.path.exists(txt_path):
        try:
            with open(txt_path, 'r', encoding='utf-8-sig') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split()
                    if len(parts) >= 2:
                        ch = parts[0]
                        py = parts[1]
                        level_map[ch] = py
        except Exception:
            pass
    
    return jsonify(level_map)

# API endpoint to load idiom level data
@app.route('/api/idioms/<int:level_num>')
def get_idiom_level(level_num):
    """Load idiom level data."""
    json_path = os.path.join(BASE_DIR, f'idiom_level{level_num}.json')
    txt_path = os.path.join(BASE_DIR, f'idiom_level{level_num}.txt')
    
    idioms = []
    if os.path.exists(json_path):
        try:
            import json
            with open(json_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, str):
                        idioms.append(item)
                    elif isinstance(item, dict):
                        val = item.get('idiom')
                        if isinstance(val, str):
                            idioms.append(val)
        except Exception:
            pass
    
    if not idioms and os.path.exists(txt_path):
        try:
            with open(txt_path, 'r', encoding='utf-8-sig') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        idioms.append(line)
        except Exception:
            pass
    
    return jsonify(idioms)

# Vercel automatically detects Flask apps and creates the handler
# No need to manually define handler - just export the app

if __name__ == '__main__':
    app.run(debug=True, port=5000)

