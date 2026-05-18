# Arcane Scribing: Gesture Recognition Prototype

A responsive, high-fidelity web prototype for arcane gesture recognition. This project implements a geometric shape recognizer designed for immersive, meditative spell-casting experiences.

![Arcane Scribing Preview](https://via.placeholder.com/800x450?text=Arcane+Scribing+Interface)

## Features

- **Robust Gesture Recognition**: Uses a modified version of the $P/$1 point-cloud algorithm.
- **Dual Input Modes**: Seamlessly switch between standard mouse/touch scribing and mystical webcam-based hand gesturing ("Aura Scribing").
- **Aura Scribing (Webcam Tracking)**: Paints glowing runes in mid-air using hand landmarker tracking via MediaPipe. Features scale-invariant pinch detection robust to user distance.
- **Orientation Sensitivity**: Specifically tuned to distinguish between similar shapes in different orientations (e.g., 'V' vs. 'Caret').
- **Premium Aesthetics**: Features a dark, mystical theme with CSS glassmorphism, glowing stroke trails, a delicate geometric hand-skeleton visualization, and smooth neon animations.
- **Visual Guides**: Interactive "Known Runes" grid that allows users to visualize templates before drawing.
- **WebGL Stability & Recovery**: Includes pre-flight checks for browser WebGL context availability and error boundaries to gracefully fallback to mouse controls if hardware acceleration is disabled.

## Technology Stack

- **Core**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas, CSS3.
- **Hand Tracking**: MediaPipe Tasks-Vision (lazily loaded via ESM from jsDelivr CDN on mode activation).
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

### Mouse Scribing Mode (Default)
- **Drawing**: Click and drag on the central canvas to draw a single continuous stroke.
- **Casting**: Release the mouse/pointer to trigger recognition. If the gesture matches a known rune with >70% confidence, the stroke will glow green.

### Aura Scribing Mode (Webcam)
- **Activation**: Click the **Aura Scribing** button in the bottom capsule switch. Grant webcam access.
- **Tracking**: A delicate violet skeleton traces your hand, and a glowing spark follows your index finger tip.
- **Drawing**: Pinch your index finger and thumb tip together. The spark will ignite into an emerald flame, painting a stroke on the screen.
- **Casting**: Separate your index finger and thumb to release the pinch. Recognition will instantly analyze the drawn path.
- **Requirements**: Requires browser WebGL support. If disabled, the application will provide recovery instructions and safely revert to Mouse Mode.

### General Mechanics
- **Guides**: Click on any rune in the "Known Runes" sidebar to see a faint guide on the canvas to help you practice.
- **Clear**: Use the "Clear Canvas" button or start a new drawing to reset the interface.

## Project Structure

- `index.html`: Main application entry point with webcam element wrappers.
- `app.js`: Master application runtime controlling event loops, MediaPipe integration, coordinate pipelines, and graphics.
- `recognizer.js`: Core geometric recognition algorithm.
- `templates.js`: Definitions for known rune shapes.
- `styles.css`: Deep ambient colors, glassmorphic filters, and spell-binding neon transitions.
- `WEBCAM_CONCEPT.md`: Detailed engineering blueprint of the webcam coordinate mapping, scale-invariant distance math, and state machine.

## License

MIT
