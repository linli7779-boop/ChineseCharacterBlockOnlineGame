from flask import Flask, send_from_directory, jsonify, send_file
import os

app = Flask(__name__, static_folder='static', static_url_path='')

# Serve the main HTML file
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Serve static files
@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    return send_from_directory('static', 'index.html')

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)

