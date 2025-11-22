from flask import Flask, send_from_directory, jsonify, send_file, Response
import os

app = Flask(__name__, static_folder='static', static_url_path='')

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
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        index_path = os.path.join(static_dir, 'index.html')
        if not os.path.exists(index_path):
            return f'index.html not found at {index_path}. Current dir: {os.getcwd()}', 500
        return send_from_directory('static', 'index.html')
    except Exception as e:
        import traceback
        return f'Error loading index.html: {str(e)}\n{traceback.format_exc()}', 500

# Serve static JavaScript and CSS files
@app.route('/game.js')
def serve_game_js():
    try:
        return send_from_directory('static', 'game.js', 
                                  mimetype='application/javascript')
    except Exception as e:
        return f'Error loading game.js: {str(e)}', 500

@app.route('/style.css')
def serve_style_css():
    try:
        return send_from_directory('static', 'style.css', 
                                  mimetype='text/css')
    except Exception as e:
        return f'Error loading style.css: {str(e)}', 500

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
    
    # Get file extension
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in static_extensions:
        static_path = os.path.join('static', filename)
        if os.path.exists(static_path):
            return send_from_directory('static', filename, 
                                     mimetype=static_extensions[ext])
        # If file not in static, try root directory (for level JSON files)
        if ext == '.json' and os.path.exists(filename):
            return send_file(filename, mimetype='application/json')
    
    # For non-static paths, serve index.html (SPA fallback)
    try:
        return send_from_directory('static', 'index.html', 
                                  mimetype='text/html')
    except Exception as e:
        return f'Error: {str(e)}', 500

# Health check endpoint
@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'static_folder': os.path.exists('static'),
        'index_exists': os.path.exists(os.path.join('static', 'index.html')),
        'game_js_exists': os.path.exists(os.path.join('static', 'game.js')),
        'style_css_exists': os.path.exists(os.path.join('static', 'style.css')),
        'level1_exists': os.path.exists('level1.json')
    })

# API endpoint to load level data
@app.route('/api/levels/<int:level_num>')
def get_level(level_num):
    """Load character level data."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, f'level{level_num}.json')
    txt_path = os.path.join(base_dir, f'level{level_num}.txt')
    
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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, f'idiom_level{level_num}.json')
    txt_path = os.path.join(base_dir, f'idiom_level{level_num}.txt')
    
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

# Export app for Vercel
# This is the handler that Vercel will use
handler = app

if __name__ == '__main__':
    app.run(debug=True, port=5000)

