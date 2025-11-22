import json
import math
import os
import random
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import pygame


# ------------------------------
# Utility: paths and data loading
# ------------------------------


def find_project_root() -> str:
    """Return a directory that contains data files.

    The prototype expects to be run from the project root. This helper tries
    current directory first, then parents. Also handles PyInstaller's bundled resources.
    """
    # PyInstaller creates a temp folder and stores path in _MEIPASS
    if getattr(sys, 'frozen', False):
        # Running as a compiled executable
        # PyInstaller bundles data files in sys._MEIPASS
        base_path = sys._MEIPASS
        candidates = [base_path]
        # Also check if exe is in a folder with data files
        exe_dir = os.path.dirname(sys.executable)
        candidates.append(exe_dir)
    else:
        # Running as a script
        candidates = [os.getcwd()]
        here = os.path.dirname(os.path.abspath(__file__))
        candidates.append(os.path.abspath(os.path.join(here, "..", "..")))
        candidates.append(os.path.abspath(os.path.join(here, "..")))
    
    # Try to find directory with level1.json or level1.txt
    for base in candidates:
        if base and os.path.exists(base):
            level1_json = os.path.join(base, "level1.json")
            level1_txt = os.path.join(base, "level1.txt")
            if os.path.exists(level1_json) or os.path.exists(level1_txt):
                return base
    
    # Fallback
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.getcwd()


def load_character_levels(base_dir: str) -> List[Dict[str, str]]:
    """Load 14 level dictionaries mapping character -> pinyin.

    Supports JSON (preferred) and TXT fallback ("字 拼音") per line.
    Returns a list of dicts indexed by level-1.
    """
    levels: List[Dict[str, str]] = []
    for i in range(1, 15):
        json_path = os.path.join(base_dir, f"level{i}.json")
        txt_path = os.path.join(base_dir, f"level{i}.txt")
        level_map: Dict[str, str] = {}
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                # Support both list of objects and dict formats
                if isinstance(data, list):
                    for item in data:
                        ch = item.get("character") or item.get("char")
                        py = item.get("pinyin") or item.get("py")
                        if ch and py:
                            level_map[ch] = py
                elif isinstance(data, dict):
                    for ch, py in data.items():
                        if isinstance(ch, str) and isinstance(py, str):
                            level_map[ch] = py
            except Exception:
                level_map = {}
        if not level_map and os.path.exists(txt_path):
            try:
                with open(txt_path, "r", encoding="utf-8-sig") as f:
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
                level_map = {}
        
        levels.append(level_map)
    return levels


def load_idiom_levels(base_dir: str) -> List[List[str]]:
    """Load 6 idiom level lists, each is a list of idiom strings."""
    levels: List[List[str]] = []
    for i in range(1, 7):
        json_path = os.path.join(base_dir, f"idiom_level{i}.json")
        txt_path = os.path.join(base_dir, f"idiom_level{i}.txt")
        idioms: List[str] = []
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    # Support list of strings or list of objects {"idiom": "..."}
                    for item in data:
                        if isinstance(item, str):
                            idioms.append(item)
                        elif isinstance(item, dict):
                            val = item.get("idiom")
                            if isinstance(val, str):
                                idioms.append(val)
            except Exception:
                idioms = []
        if not idioms and os.path.exists(txt_path):
            try:
                with open(txt_path, "r", encoding="utf-8-sig") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            idioms.append(line)
            except Exception:
                idioms = []
        
        levels.append(idioms)
    return levels


# ------------------------------
# Game model and helpers
# ------------------------------


def strip_tone_marks(text: str) -> str:
    """Return pinyin without tone marks (yī -> yi)."""

    tone_map = {
        "ā": "a",
        "á": "a",
        "ǎ": "a",
        "à": "a",
        "ē": "e",
        "é": "e",
        "ě": "e",
        "è": "e",
        "ī": "i",
        "í": "i",
        "ǐ": "i",
        "ì": "i",
        "ō": "o",
        "ó": "o",
        "ǒ": "o",
        "ò": "o",
        "ū": "u",
        "ú": "u",
        "ǔ": "u",
        "ù": "u",
        "ǖ": "v",
        "ǘ": "v",
        "ǚ": "v",
        "ǜ": "v",
        "ü": "v",
    }
    return "".join(tone_map.get(c, c) for c in text.lower())


class Mode:
    ROTATE = 0
    PINYIN = 1
    IDIOM = 2


@dataclass
class Block:
    x: int
    y: int
    size: int
    char: str
    angle: int = 0
    vy: float = 0.0
    settled: bool = False

    def rect(self) -> pygame.Rect:
        return pygame.Rect(self.x, self.y, self.size, self.size)


class Grid:
    def __init__(self, left: int, top: int, width: int, height: int, cell: int):
        self.left = left
        self.top = top
        self.width = width
        self.height = height
        self.cell = cell
        self.cols = width // cell
        self.rows = height // cell
        self.occupied: List[List[Optional[str]]] = [
            [None for _ in range(self.cols)] for _ in range(self.rows)
        ]

    def clear(self) -> None:
        for r in range(self.rows):
            for c in range(self.cols):
                self.occupied[r][c] = None

    def can_move(self, rect: pygame.Rect) -> bool:
        if rect.left < self.left or rect.right > self.left + self.width:
            return False
        if rect.bottom > self.top + self.height:
            return False
        # Check stack collisions
        c0 = max(0, (rect.left - self.left) // self.cell)
        c1 = min(self.cols - 1, (rect.right - 1 - self.left) // self.cell)
        r0 = max(0, (rect.top - self.top) // self.cell)
        r1 = min(self.rows - 1, (rect.bottom - 1 - self.top) // self.cell)
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                if self.occupied[r][c] is not None:
                    return False
        return True

    def settle(self, block: Block) -> None:
        grid_x = (block.x - self.left) // self.cell
        grid_y = (block.y - self.top) // self.cell
        grid_x = max(0, min(self.cols - 1, grid_x))
        grid_y = max(0, min(self.rows - 1, grid_y))
        self.occupied[grid_y][grid_x] = block.char

    def reached_top(self) -> bool:
        # Game over when blocks reach one row below the top (row 1)
        if self.rows < 2:
            # If grid is too small, check top row
            for c in range(self.cols):
                if self.occupied[0][c] is not None:
                    return True
        else:
            # Check row 1 (one block away from top)
            for c in range(self.cols):
                if self.occupied[1][c] is not None:
                    return True
        return False


class Game:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("Vibe: Chinese Character Block")

        self.screen = pygame.display.set_mode((960, 600))
        self.clock = pygame.time.Clock()

        self.base_dir = find_project_root()
        self.char_levels = load_character_levels(self.base_dir)
        self.idiom_levels = load_idiom_levels(self.base_dir)

        self.running = True
        self.mode: Optional[int] = None
        self.score = 0
        self.level = 1
        self.right_count = 0
        self.target_right = 1
        self.show_message_until = 0
        self.message = ""

        # Layout
        self.width, self.height = self.screen.get_size()
        self.sidebar_w = self.width // 5
        self.play_w = self.width - self.sidebar_w

        block_size = self.height // 10
        self.grid = Grid(
            left=self.sidebar_w,
            top=0,
            width=self.play_w,
            height=self.height,
            cell=block_size,
        )

        # Fonts
        self.font_small = pygame.font.SysFont("arial", 16)
        self.font_ui = pygame.font.SysFont("arial", 24)
        self.font_char = self._load_font_from_file(block_size - 8)
        self.font_big = pygame.font.SysFont("arial", 36)
        self.font_chinese_ui = self._load_font_from_file(24)

        # Button text characters (one list per button)
        self.btn_rotate_chars = ["认", "汉", "字"]
        self.btn_pinyin_chars = ["认", "字", "写", "拼", "音"]
        self.btn_idiom_chars = ["组", "成", "语"]

        # State for modes
        self.current_blocks: List[Block] = []
        self.current_char: Optional[str] = None
        self.current_pinyin: Optional[str] = None
        self.typed: str = ""
        self.idiom_target: Optional[str] = None
        self.idiom_click_index = 0
        self.idiom_clicked_blocks: List[Block] = []  # Track clicked blocks in IDIOM mode
        self.idiom_success_until = 0  # Timer for firework effect before clearing
        self.pinyin_success_until = 0  # Timer for keeping pinyin visible after success
        self.used_chars: set = set()  # Track used characters in ROTATE and PINYIN modes

        # Physics
        self.gravity = 0.25
        self.fall_speed = 2.0
        self.fast_fall_speed = 8.0

        # UI buttons rects
        self.btn_rotate = pygame.Rect(16, self.height // 2 - 120, self.sidebar_w - 32, 60)
        self.btn_pinyin = pygame.Rect(16, self.height // 2 - 30, self.sidebar_w - 32, 60)
        self.btn_idiom = pygame.Rect(16, self.height // 2 + 60, self.sidebar_w - 32, 60)

        # Effects and sound
        self.effects: List[Tuple[int, int, int, int, int]] = []
        # Each effect: (x, y, radius, max_radius, created_ms)
        self.firework_snd = self.try_load_firework_sound()

    def try_load_firework_sound(self) -> Optional[pygame.mixer.Sound]:
        try:
            pygame.mixer.init()
            candidates = [
                os.path.join(self.base_dir, "vibe", "assets", "fireworks.wav"),
                os.path.join(self.base_dir, "assets", "fireworks.wav"),
            ]
            for p in candidates:
                if os.path.exists(p):
                    return pygame.mixer.Sound(p)
        except Exception:
            return None
        return None

    def _load_font_from_file(self, size: int) -> pygame.font.Font:
        """Load SimHei font from assets folder.
        
        Works both in development and when packaged with PyInstaller.
        """
        # Try multiple possible locations
        candidates = [
            os.path.join(self.base_dir, "assets", "simhei.ttf"),
            os.path.join(self.base_dir, "assets", "fonts", "simhei.ttf"),
            os.path.join(self.base_dir, "vibe", "assets", "simhei.ttf"),
            # PyInstaller bundled resources
            os.path.join(getattr(sys, '_MEIPASS', ''), "assets", "simhei.ttf"),
            os.path.join(getattr(sys, '_MEIPASS', ''), "assets", "fonts", "simhei.ttf"),
        ]
        
        for font_path in candidates:
            if font_path and os.path.exists(font_path):
                try:
                    return pygame.font.Font(font_path, size)
                except Exception:
                    continue
        
        # Fallback to system font if file not found
        try:
            return pygame.font.SysFont("SimHei", size)
        except Exception:
            return pygame.font.SysFont(None, size)

    # --------- mode setup and progression ---------

    def start_mode(self, mode: int) -> None:
        self.mode = mode
        self.level = 1
        self.score = 0
        self.right_count = 0
        self.set_target_right()
        self.grid.clear()
        self.used_chars.clear()  # Reset used characters when starting new mode
        
        # Show instructions for each mode
        if mode == Mode.ROTATE:
            self.message = (
                "Rotate blocks (Space) to correct orientation.\n"
                "Score: 5 points × level when block lands upright."
            )
        elif mode == Mode.PINYIN:
            self.message = (
                "Type pinyin for the character above the block.\n"
                "Score: 5 points × level when pinyin matches before landing."
            )
        elif mode == Mode.IDIOM:
            self.message = (
                "Click characters in correct idiom order.\n"
                "Score: 10 points when all characters clicked correctly."
            )
        self.show_message_until = pygame.time.get_ticks() + 5000
        self.spawn_round()

    def set_target_right(self) -> None:
        if self.mode in (Mode.ROTATE, Mode.PINYIN):
            dataset = self.char_levels[self.level - 1]
            n = max(1, int(len(dataset) * 0.1))
        else:
            dataset = self.idiom_levels[self.level - 1]
            n = max(1, int(len(dataset) * 0.1))
        self.target_right = n

    def next_level(self) -> None:
        if self.mode in (Mode.ROTATE, Mode.PINYIN):
            max_level = 14
        else:
            max_level = 6
        if self.level < max_level:
            self.level += 1
            self.right_count = 0
            self.set_target_right()
            self.grid.clear()
            self.message = "Next Level"
            self.show_message_until = pygame.time.get_ticks() + 1000
            self.used_chars.clear()  # Reset used characters when leveling up
            self.spawn_round()
        else:
            self.message = "All levels complete!"
            self.show_message_until = pygame.time.get_ticks() + 1500

    def award_points(self) -> None:
        if self.mode in (Mode.ROTATE, Mode.PINYIN):
            base = 5 * self.level
        else:
            base = 10
        self.score += base
        self.right_count += 1
        # Mark character as used in ROTATE and PINYIN modes
        if self.mode in (Mode.ROTATE, Mode.PINYIN) and self.current_char:
            self.used_chars.add(self.current_char)
        # Trigger simple firework effect at center of character block(s)
        if self.mode == Mode.IDIOM and self.idiom_clicked_blocks:
            # Center of grouped idiom blocks
            if len(self.idiom_clicked_blocks) > 0:
                first_blk = self.idiom_clicked_blocks[0]
                last_blk = self.idiom_clicked_blocks[-1]
                cx = (first_blk.x + last_blk.x + last_blk.size) // 2
                cy = first_blk.y + first_blk.size // 2
            else:
                cx = self.grid.left + self.grid.width // 2
                cy = self.grid.top + self.grid.cell
        elif (
            self.mode in (Mode.ROTATE, Mode.PINYIN)
            and self.current_blocks
        ):
            blk = self.current_blocks[0]
            cx = blk.x + blk.size // 2
            cy = blk.y + blk.size // 2
        else:
            # Fallback to center-top of playfield
            cx = self.grid.left + self.grid.width // 2
            cy = self.grid.top + self.grid.cell
        self.effects.append((cx, cy, 4, 48, pygame.time.get_ticks()))
        if self.firework_snd is not None:
            try:
                self.firework_snd.play()
            except Exception:
                pass
        if self.right_count >= self.target_right:
            self.message = "Congratulations! Level Up"
            self.show_message_until = pygame.time.get_ticks() + 1000
            self.next_level()

    # --------- spawning ---------

    def spawn_round(self) -> None:
        self.current_blocks.clear()
        self.current_char = None
        self.current_pinyin = None
        self.typed = ""
        self.idiom_target = None
        self.idiom_click_index = 0
        self.idiom_clicked_blocks.clear()
        self.idiom_success_until = 0
        self.pinyin_success_until = 0

        size = self.grid.cell
        if self.mode in (Mode.ROTATE, Mode.PINYIN):
            if self.level - 1 >= len(self.char_levels):
                return
            dataset = self.char_levels[self.level - 1]
            if not dataset:
                return
            # Filter out used characters
            available = {
                ch: py for ch, py in dataset.items() if ch not in self.used_chars
            }
            # If all characters have been used, reset and allow reuse
            if not available:
                self.used_chars.clear()
                available = dataset
            # Select from available characters
            ch, py = random.choice(list(available.items()))
            angle = 0
            if self.mode == Mode.ROTATE:
                angle = random.choice([90, 180, 270])
            x = self.sidebar_w + random.randint(0, self.grid.cols - 1) * size
            x = min(x, self.sidebar_w + self.grid.width - size)
            block = Block(x=x, y=0, size=size, char=ch, angle=angle, vy=0)
            self.current_blocks.append(block)
            self.current_char = ch
            self.current_pinyin = py
        else:
            if self.level - 1 >= len(self.idiom_levels):
                return
            idioms = self.idiom_levels[self.level - 1]
            if not idioms:
                return
            target = random.choice(idioms)
            self.idiom_target = target
            chars = list(target)
            # Shuffle characters so they're not in original order
            original_chars = chars.copy()
            max_attempts = 10
            for _ in range(max_attempts):
                random.shuffle(chars)
                if chars != original_chars:
                    break
            cols = random.sample(range(self.grid.cols), k=min(4, self.grid.cols))
            cols.sort()
            for i, ch in enumerate(chars[:4]):
                x = self.sidebar_w + cols[i] * size
                block = Block(x=x, y=0, size=size, char=ch, angle=0, vy=0)
                self.current_blocks.append(block)

    # --------- event handling ---------

    def update_cursor(self) -> None:
        """Update cursor based on mouse position."""
        mouse_pos = pygame.mouse.get_pos()
        if (
            self.btn_rotate.collidepoint(mouse_pos)
            or self.btn_pinyin.collidepoint(mouse_pos)
            or self.btn_idiom.collidepoint(mouse_pos)
        ):
            pygame.mouse.set_cursor(pygame.SYSTEM_CURSOR_HAND)
        else:
            pygame.mouse.set_cursor(pygame.SYSTEM_CURSOR_ARROW)

    def handle_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                self.on_mouse(event.pos)
            elif event.type == pygame.KEYDOWN:
                self.on_key(event)

    def on_mouse(self, pos: Tuple[int, int]) -> None:
        if self.btn_rotate.collidepoint(pos):
            self.start_mode(Mode.ROTATE)
            return
        if self.btn_pinyin.collidepoint(pos):
            self.start_mode(Mode.PINYIN)
            return
        if self.btn_idiom.collidepoint(pos):
            self.start_mode(Mode.IDIOM)
            return

        if self.mode == Mode.IDIOM and self.idiom_target:
            # Click characters in order
            if (
                self.idiom_click_index >= len(self.idiom_target)
                or self.idiom_success_until > 0
            ):
                return
            expected = self.idiom_target[self.idiom_click_index]
            for blk in self.current_blocks:
                if blk.settled or blk in self.idiom_clicked_blocks:
                    continue
                if blk.rect().collidepoint(pos):
                    if blk.char == expected:
                        # Correct character - just track it, don't reorganize yet
                        if blk not in self.idiom_clicked_blocks:
                            self.idiom_clicked_blocks.append(blk)
                        
                        self.idiom_click_index += 1
                        if self.idiom_click_index >= len(self.idiom_target):
                            # All characters clicked correctly - NOW reorganize them
                            # Verify all clicked blocks match the idiom in order
                            all_correct = True
                            if len(self.idiom_clicked_blocks) == len(self.idiom_target):
                                for i, (blk, expected_char) in enumerate(
                                    zip(self.idiom_clicked_blocks, self.idiom_target)
                                ):
                                    if blk.char != expected_char:
                                        all_correct = False
                                        break
                            else:
                                all_correct = False
                            
                            if all_correct:
                                # All correct - reorganize and show firework
                                for clicked_blk in self.idiom_clicked_blocks:
                                    clicked_blk.settled = True
                                    clicked_blk.vy = 0
                                # Position clicked blocks together horizontally
                                group_x = (
                                    self.grid.left + self.grid.width // 2
                                    - (len(self.idiom_clicked_blocks) * blk.size) // 2
                                )
                                group_y = self.grid.top + self.grid.cell
                                for i, clicked_blk in enumerate(self.idiom_clicked_blocks):
                                    clicked_blk.x = group_x + i * blk.size
                                    clicked_blk.y = group_y
                                
                                self.award_points()
                                self.idiom_success_until = pygame.time.get_ticks() + 1000
                            else:
                                # Order doesn't match - reset and let blocks fall
                                # Ensure all previously clicked blocks can fall again
                                for clicked_blk in self.idiom_clicked_blocks:
                                    if clicked_blk in self.current_blocks:
                                        clicked_blk.settled = False
                                        clicked_blk.vy = self.fall_speed * 0.5
                                self.idiom_clicked_blocks.clear()
                                self.idiom_click_index = 0
                        else:
                            # Already clicked this block, ignore
                            pass
                    else:
                        # Wrong character clicked - reset click state and let blocks fall
                        # Ensure all previously clicked blocks can fall again
                        for clicked_blk in self.idiom_clicked_blocks:
                            if clicked_blk in self.current_blocks:
                                clicked_blk.settled = False
                                clicked_blk.vy = self.fall_speed * 0.5
                        self.idiom_clicked_blocks.clear()
                        self.idiom_click_index = 0
                        # Blocks will continue falling normally and settle at bottom
                    return

    def on_key(self, event: pygame.event.Event) -> None:
        if self.mode in (Mode.ROTATE, Mode.PINYIN) and self.current_blocks:
            blk = self.current_blocks[0]
            if event.key == pygame.K_SPACE and self.mode == Mode.ROTATE:
                blk.angle = (blk.angle + 90) % 360
            # Handle horizontal movement (one block width per key press)
            elif event.key == pygame.K_LEFT:
                new_rect = blk.rect().move(-self.grid.cell, 0)
                if self.grid.can_move(new_rect):
                    blk.x = new_rect.x
            elif event.key == pygame.K_RIGHT:
                new_rect = blk.rect().move(self.grid.cell, 0)
                if self.grid.can_move(new_rect):
                    blk.x = new_rect.x
        if self.mode == Mode.PINYIN and self.current_pinyin:
            if event.key == pygame.K_BACKSPACE:
                self.typed = self.typed[:-1]
            elif event.key <= 127:
                ch = event.unicode
                if ch.isalpha():
                    self.typed += ch.lower()
                if strip_tone_marks(self.current_pinyin) == self.typed:
                    self.award_points()
                    # Keep pinyin and character visible for 1 second
                    self.pinyin_success_until = pygame.time.get_ticks() + 1000

    # --------- update ---------

    def update(self, dt: float) -> None:
        # Skip physics updates during pinyin success delay
        in_pinyin_delay = (
            self.mode == Mode.PINYIN
            and self.pinyin_success_until > 0
            and pygame.time.get_ticks() < self.pinyin_success_until
        )

        if not in_pinyin_delay:
            keys = pygame.key.get_pressed()
            speed_y = self.fast_fall_speed if keys[pygame.K_DOWN] else self.fall_speed
            # Reduce falling speed by half in IDIOM mode
            if self.mode == Mode.IDIOM:
                speed_y = speed_y * 0.5
            
            for blk in self.current_blocks:
                if blk.settled:
                    continue
                # In IDIOM mode, clicked blocks continue falling until all are clicked correctly
                # Only skip physics if all blocks are clicked correctly and reorganized (settled)
                if (
                    self.mode == Mode.IDIOM
                    and blk in self.idiom_clicked_blocks
                    and self.idiom_click_index >= len(self.idiom_target)
                    and all(b.settled for b in self.idiom_clicked_blocks)
                ):
                    continue

                # Check if block would reach or exceed the bottom of the grid
                bottom_y = blk.y + blk.size
                max_bottom = self.grid.top + self.grid.height
                
                # Check if moving would push past the bottom
                blk.vy = speed_y
                test_y = blk.y + int(blk.vy)
                test_bottom = test_y + blk.size
                
                if bottom_y >= max_bottom or test_bottom >= max_bottom:
                    # Snap to sit exactly at the bottom
                    blk.y = max_bottom - blk.size
                    blk.vy = 0  # Stop any velocity
                    blk.settled = True
                    # Check success conditions before settling
                    if self.mode == Mode.ROTATE:
                        if blk.angle % 360 == 0:
                            # Correct orientation - don't settle, just clear and spawn
                            self.award_points()
                            self.current_blocks.clear()
                            self.spawn_round()
                            continue
                    # If not correct orientation (or other mode), settle the block
                    self.grid.settle(blk)
                    # Remove only this settled block from current_blocks
                    if blk in self.current_blocks:
                        self.current_blocks.remove(blk)
                    if self.mode == Mode.PINYIN:
                        # No points if not typed before landing
                        self.spawn_round()
                    elif self.mode == Mode.ROTATE:
                        # Wrong orientation - spawn new round
                        self.spawn_round()
                    elif self.mode == Mode.IDIOM:
                        # Spawn new idiom round only when all blocks have settled
                        if not self.current_blocks:
                            self.spawn_round()
                    continue

                # Check if there's a block directly underneath before moving
                c0 = max(0, (blk.x - self.grid.left) // self.grid.cell)
                c1 = min(
                    self.grid.cols - 1,
                    (blk.x + blk.size - 1 - self.grid.left) // self.grid.cell,
                )
                # Calculate which row the bottom of the block is in
                current_row = (bottom_y - self.grid.top) // self.grid.cell
                block_below = False
                
                if current_row < self.grid.rows - 1:
                    # Check the row directly below
                    row_below = current_row + 1
                    for c in range(c0, c1 + 1):
                        if self.grid.occupied[row_below][c] is not None:
                            block_below = True
                            # Snap to sit exactly on top of the block below
                            target_y = (
                                self.grid.top + row_below * self.grid.cell - blk.size
                            )
                            blk.y = target_y
                            blk.vy = 0  # Stop any velocity
                            blk.settled = True
                            # Check success conditions before settling
                            if self.mode == Mode.ROTATE:
                                if blk.angle % 360 == 0:
                                    # Correct orientation - don't settle, just clear and spawn
                                    self.award_points()
                                    self.current_blocks.clear()
                                    self.spawn_round()
                                    break
                            # If not correct orientation (or other mode), settle the block
                            self.grid.settle(blk)
                            # Remove only this settled block from current_blocks
                            if blk in self.current_blocks:
                                self.current_blocks.remove(blk)
                            if self.mode == Mode.PINYIN:
                                # No points if not typed before landing
                                self.spawn_round()
                            elif self.mode == Mode.ROTATE:
                                # Wrong orientation - spawn new round
                                self.spawn_round()
                            elif self.mode == Mode.IDIOM:
                                # Spawn new idiom round only when all blocks have settled
                                if not self.current_blocks:
                                    self.spawn_round()
                            break
                if block_below:
                    continue

                new_rect = blk.rect().move(0, int(blk.vy))
                if self.grid.can_move(new_rect):
                    blk.y = new_rect.y
                else:
                    # Collision detected - snap to grid-aligned position above
                    # Calculate which grid row the block should be in
                    grid_y = (blk.y - self.grid.top) // self.grid.cell
                    grid_y = max(0, min(self.grid.rows - 1, grid_y))
                    target_y = self.grid.top + grid_y * self.grid.cell
                    blk.y = target_y
                    blk.vy = 0  # Stop any velocity
                    blk.settled = True
                    # Check success conditions before settling
                    if self.mode == Mode.ROTATE:
                        if blk.angle % 360 == 0:
                            # Correct orientation - don't settle, just clear and spawn
                            self.award_points()
                            self.current_blocks.clear()
                            self.spawn_round()
                        else:
                            # Wrong orientation - settle the block
                            self.grid.settle(blk)
                            # Spawn new round
                            self.spawn_round()
                    elif self.mode == Mode.PINYIN:
                        # Settle the block
                        self.grid.settle(blk)
                        # No points if not typed before landing
                        self.spawn_round()
                    elif self.mode == Mode.IDIOM:
                        # Settle the block
                        self.grid.settle(blk)
                        # Remove only this settled block from current_blocks
                        if blk in self.current_blocks:
                            self.current_blocks.remove(blk)
                        # Spawn new idiom round only when all blocks have settled
                        if not self.current_blocks:
                            self.spawn_round()
                    else:
                        # Other modes - settle the block
                        self.grid.settle(blk)

            if self.grid.reached_top():
                self.message = "Game Over"
                self.show_message_until = pygame.time.get_ticks() + 6500
                self.mode = None
                self.current_blocks.clear()
                self.grid.clear()

        # Check if pinyin success delay has expired
        if (
            self.mode == Mode.PINYIN
            and self.pinyin_success_until > 0
            and pygame.time.get_ticks() >= self.pinyin_success_until
        ):
            self.current_blocks.clear()
            self.spawn_round()

        # Check if idiom success delay has expired
        if (
            self.mode == Mode.IDIOM
            and self.idiom_success_until > 0
            and pygame.time.get_ticks() >= self.idiom_success_until
        ):
            self.current_blocks.clear()
            self.idiom_clicked_blocks.clear()
            self.spawn_round()

        # Update effects (expand radius and fade out)
        now = pygame.time.get_ticks()
        new_effects: List[Tuple[int, int, int, int, int]] = []
        for x, y, r, rmax, t0 in self.effects:
            age = now - t0
            if age < 600 and r < rmax:
                nr = r + 2
                new_effects.append((x, y, nr, rmax, t0))
        self.effects = new_effects

    # --------- render ---------

    def draw_background(self) -> None:
        # Sky - fill entire screen with light blue
        self.screen.fill((135, 206, 250))
        # Clouds - draw across entire width
        for cx in range(40, self.width, 180):
            pygame.draw.circle(self.screen, (255, 255, 255), (cx, 80), 24)
            pygame.draw.circle(self.screen, (255, 255, 255), (cx + 24, 80), 20)
            pygame.draw.circle(self.screen, (255, 255, 255), (cx + 10, 64), 20)
        # Grass hill - create curved hill shape at bottom
        # Use a vibrant green color
        grass_color = (76, 187, 23)  # Vibrant green
        hill_height = 60
        hill_top_y = self.height - hill_height
        # Draw grass hill using polygon for smooth curve
        # Create points for a curved hill
        points = [(0, self.height)]
        # Add curve points
        num_points = 20
        for i in range(num_points + 1):
            x = int((i / num_points) * self.width)
            # Create a smooth curve using sine wave
            curve_offset = int(
                15 * math.sin((i / num_points) * math.pi)
            )
            y = hill_top_y + curve_offset
            points.append((x, y))
        points.append((self.width, self.height))
        pygame.draw.polygon(self.screen, grass_color, points)

    def draw_sidebar(self) -> None:
        # Background is drawn first, so sidebar area shows sky/grass
        # Just draw the buttons on top
        self.draw_button_chinese(self.btn_rotate, self.btn_rotate_chars)
        self.draw_button_chinese(self.btn_pinyin, self.btn_pinyin_chars)
        self.draw_button_chinese(self.btn_idiom, self.btn_idiom_chars)

    def draw_button(self, rect: pygame.Rect, text: str) -> None:
        # Warm medium orange button color
        pygame.draw.rect(self.screen, (217, 122, 60), rect, border_radius=6)
        # Slightly darker warm orange border
        pygame.draw.rect(self.screen, (190, 100, 45), rect, 2, border_radius=6)
        surf = self.font_ui.render(text, True, (0, 0, 0))
        tx = rect.x + (rect.w - surf.get_width()) // 2
        ty = rect.y + (rect.h - surf.get_height()) // 2
        self.screen.blit(surf, (tx, ty))

    def draw_button_chinese(self, rect: pygame.Rect, chars: List[str]) -> None:
        """Draw button with Chinese characters from a list."""
        # Warm medium orange button color
        pygame.draw.rect(self.screen, (217, 122, 60), rect, border_radius=6)
        # Slightly darker warm orange border
        pygame.draw.rect(self.screen, (190, 100, 45), rect, 2, border_radius=6)
        # Render all characters and combine them
        char_surfs = [
            self.font_chinese_ui.render(ch, True, (0, 0, 0)) for ch in chars
        ]
        total_width = sum(surf.get_width() for surf in char_surfs)
        x_start = rect.x + (rect.w - total_width) // 2
        y_center = rect.y + (rect.h - char_surfs[0].get_height()) // 2
        for surf in char_surfs:
            self.screen.blit(surf, (x_start, y_center))
            x_start += surf.get_width()

    def draw_playfield(self) -> None:
        # Grid lines
        for r in range(self.grid.rows + 1):
            y = self.grid.top + r * self.grid.cell
            pygame.draw.line(
                self.screen,
                (200, 200, 200),
                (self.grid.left, y),
                (self.grid.left + self.grid.width, y),
                1,
            )
        for c in range(self.grid.cols + 1):
            x = self.grid.left + c * self.grid.cell
            pygame.draw.line(
                self.screen,
                (200, 200, 200),
                (x, self.grid.top),
                (x, self.grid.top + self.grid.height),
                1,
            )

        # Settled blocks
        for r in range(self.grid.rows):
            for c in range(self.grid.cols):
                ch = self.grid.occupied[r][c]
                if ch is not None:
                    x = self.grid.left + c * self.grid.cell
                    y = self.grid.top + r * self.grid.cell
                    self.draw_block(x, y, self.grid.cell, ch, 0)

        # Falling blocks (keep showing during pinyin success delay)
        if (
            self.mode != Mode.PINYIN
            or self.pinyin_success_until == 0
            or pygame.time.get_ticks() < self.pinyin_success_until
        ):
            for blk in self.current_blocks:
                # In IDIOM mode, only skip clicked blocks if they're reorganized (settled)
                if (
                    self.mode == Mode.IDIOM
                    and blk in self.idiom_clicked_blocks
                    and blk.settled
                ):
                    continue
                self.draw_block(blk.x, blk.y, blk.size, blk.char, blk.angle)
                # Draw pinyin above the block in PINYIN mode
                if (
                    self.mode == Mode.PINYIN
                    and self.typed
                    and (
                        self.pinyin_success_until == 0
                        or pygame.time.get_ticks() < self.pinyin_success_until
                    )
                ):
                    pinyin_surf = self.font_ui.render(self.typed, True, (50, 50, 220))
                    # Position pinyin centered above the block
                    pinyin_x = blk.x + (blk.size - pinyin_surf.get_width()) // 2
                    pinyin_y = blk.y - pinyin_surf.get_height() - 4
                    self.screen.blit(pinyin_surf, (pinyin_x, pinyin_y))
        
        # Draw clicked idiom blocks together (keep showing during success delay)
        if (
            self.mode == Mode.IDIOM
            and self.idiom_clicked_blocks
            and (
                self.idiom_success_until == 0
                or pygame.time.get_ticks() < self.idiom_success_until
            )
        ):
            for blk in self.idiom_clicked_blocks:
                self.draw_block(blk.x, blk.y, blk.size, blk.char, blk.angle)

        # HUD: score and level
        score_txt = self.font_ui.render(f"Score: {self.score}", True, (0, 0, 0))
        lvl_txt = self.font_small.render(f"Level: {self.level}", True, (0, 0, 0))
        sx = self.grid.left + self.grid.width - score_txt.get_width() - 10
        self.screen.blit(score_txt, (sx, 8))
        self.screen.blit(lvl_txt, (sx, 8 + score_txt.get_height() + 4))

        # Center messages (support multi-line)
        if pygame.time.get_ticks() < self.show_message_until and self.message:
            lines = self.message.split("\n")
            total_height = len(lines) * self.font_ui.get_height()
            y_start = (self.grid.top + self.grid.height - total_height) // 2
            for i, line in enumerate(lines):
                surf = self.font_ui.render(line, True, (0, 0, 0))
                x = self.grid.left + (self.grid.width - surf.get_width()) // 2
                y = y_start + i * self.font_ui.get_height()
                self.screen.blit(surf, (x, y))

        # Draw effects
        for x, y, r, _, _ in self.effects:
            pygame.draw.circle(self.screen, (255, 140, 0), (x, y), max(1, r), 2)

    def draw_block(self, x: int, y: int, size: int, ch: str, angle: int) -> None:
        rect = pygame.Rect(x, y, size, size)
        # Border is invisible in all modes
        # Character (black) centered, with rotation if needed
        glyph = self.font_char.render(ch, True, (0, 0, 0))
        if angle:
            glyph = pygame.transform.rotate(glyph, angle)
        gx = x + (size - glyph.get_width()) // 2
        gy = y + (size - glyph.get_height()) // 2
        self.screen.blit(glyph, (gx, gy))

    # --------- main loop ---------

    def run(self) -> None:
        while self.running:
            dt = self.clock.tick(60) / 1000.0
            self.handle_events()
            self.update_cursor()
            if self.mode is not None:
                self.update(dt)
            self.draw_background()
            self.draw_sidebar()
            self.draw_playfield()
            pygame.display.flip()
        pygame.quit()


def main() -> None:
    game = Game()
    game.run()


if __name__ == "__main__":
    main()


