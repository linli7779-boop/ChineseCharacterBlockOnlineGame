# Chinese Character Block Online Game

An online version of the Chinese Character Block game, playable in web browsers.

## Features

- **Three Game Modes:**
  - 认汉字 (Recognize Chinese Characters): Rotate blocks to correct orientation
  - 认字写拼音 (Recognize and Write Pinyin): Type pinyin for characters
  - 组成语 (Form Idioms): Click characters in correct idiom order

- **Cross-Platform Support:**
  - Works on Windows, macOS, and Linux
  - Compatible with Chrome, Edge, Safari, and Firefox
  - Touch-friendly controls for tablets (iPad) and mobile devices

- **Touch/Mouse Controls:**
  - Arrow buttons for left, right, and down movement
  - Rotation button for block rotation
  - All controls work with both mouse and touch

- **Special Features:**
  - Pinyin display when characters touch the bottom in pinyin mode
  - PayPal donation support

## Deployment on Vercel

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Or connect your GitHub repository to Vercel for automatic deployments.

## Local Development

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the Flask app:
   ```bash
   python app.py
   ```

3. Open your browser to `http://localhost:5000`

## Requirements

- Python 3.7+
- Flask 3.0.0
- Level data files (level1.json through level14.json, idiom_level1.json through idiom_level6.json)

## Game Controls

- **Keyboard:**
  - Arrow keys: Move blocks left/right/down
  - Space: Rotate block (in rotate mode)
  - Type letters: Enter pinyin (in pinyin mode)

- **Touch/Mouse:**
  - Click arrow buttons: Move blocks
  - Click rotation button: Rotate block
  - Click on blocks: Select characters (in idiom mode)
