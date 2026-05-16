# Arcane Scribing: Gesture Recognition Prototype

A responsive, high-fidelity web prototype for arcane gesture recognition. This project implements a geometric shape recognizer designed for immersive, meditative spell-casting experiences.

![Arcane Scribing Preview](https://via.placeholder.com/800x450?text=Arcane+Scribing+Interface)

## Features

- **Robust Gesture Recognition**: Uses a modified version of the $P/$1 point-cloud algorithm.
- **Orientation Sensitivity**: Specifically tuned to distinguish between similar shapes in different orientations (e.g., 'V' vs. 'Caret').
- **Premium Aesthetics**: Features a dark, mystical theme with CSS glassmorphism, glowing strokes, and smooth micro-animations.
- **Visual Guides**: Interactive "Known Runes" grid that allows users to visualize templates before drawing.
- **High Performance**: Optimized rendering loop to prevent visual glitches and shadow accumulation artifacts.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas, CSS3.
- **Algorithms**: Geometric Template Matching ($1 Recognizer variant).
- **Fonts**: 'Cinzel' (Serif) and 'Inter' (Sans-serif) via Google Fonts.

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/thunderbug1/gesture_detector_mockup.git
    cd gesture_detector_mockup
    ```

2.  **Run a local server**:
    Since the project uses ES6 Modules, it must be served via HTTP.
    ```bash
    # Using Python
    python3 -m http.server 8000
    ```

3.  **Open in Browser**:
    Navigate to `http://localhost:8000`.

## How to Use

- **Drawing**: Click and drag on the central canvas to draw a single continuous stroke.
- **Casting**: Release the mouse/pointer to trigger recognition. If the gesture matches a known rune with >70% confidence, the stroke will glow green.
- **Guides**: Click on any rune in the "Known Runes" sidebar to see a faint guide on the canvas to help you practice.
- **Clear**: Use the "Clear Canvas" button or start a new drawing to reset the interface.

## Project Structure

- `index.html`: Main application entry point.
- `app.js`: Application logic, event handling, and rendering loop.
- `recognizer.js`: Core geometric recognition algorithm.
- `templates.js`: Definitions for known rune shapes.
- `styles.css`: Visual styling and animations.

## License

MIT
