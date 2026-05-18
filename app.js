import { Recognizer, Point } from './recognizer.js';
import { getTemplates } from './templates.js';

class App {
    constructor() {
        this.canvas = document.getElementById('gesture-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.points = [];
        this.templates = getTemplates();
        this.activeTemplate = null;

        // Webcam-related properties
        this.currentMode = 'mouse'; // 'mouse' or 'webcam'
        this.handLandmarker = null;
        this.video = document.getElementById('webcam-video');
        this.loader = document.getElementById('webcam-loader');
        this.isPinching = false;
        this.activeHand = null;
        this.activeHandRaw = null;
        this.stream = null;
        this.pinchStartDist = 0.08;
        this.pinchEndDist = 0.12;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('pointerdown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('pointermove', (e) => this.draw(e));
        this.canvas.addEventListener('pointerup', (e) => this.stopDrawing(e));

        document.getElementById('clear-btn').addEventListener('click', () => this.clear(true));

        // Mode selection button events
        const mouseBtn = document.getElementById('mode-mouse');
        const webcamBtn = document.getElementById('mode-webcam');

        if (mouseBtn && webcamBtn) {
            mouseBtn.addEventListener('click', () => this.switchMode('mouse'));
            webcamBtn.addEventListener('click', () => this.switchMode('webcam'));
        }

        this.renderTemplatesGrid();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.clear();
    }

    async switchMode(mode) {
        if (this.currentMode === mode) return;

        const mouseBtn = document.getElementById('mode-mouse');
        const webcamBtn = document.getElementById('mode-webcam');

        if (mode === 'mouse') {
            this.currentMode = 'mouse';
            if (mouseBtn) mouseBtn.classList.add('active');
            if (webcamBtn) webcamBtn.classList.remove('active');
            this.disableWebcam();
        } else {
            this.currentMode = 'webcam';
            if (webcamBtn) webcamBtn.classList.add('active');
            if (mouseBtn) mouseBtn.classList.remove('active');
            await this.enableWebcam();
        }
        this.clear(true);
    }

    isWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    async enableWebcam() {
        // Pre-emptively fail fast if WebGL is completely unsupported/disabled in the browser
        if (!this.isWebGLSupported()) {
            alert(
                "Aura Scribing (Webcam Mode) requires WebGL support, but WebGL is disabled or unsupported in your browser.\n\n" +
                "To resolve this and use Aura Scribing:\n" +
                "1. Go to your browser Settings -> System -> Toggle 'Use graphics acceleration when available' to ON.\n" +
                "2. Visit https://get.webgl.org to verify your WebGL context is functional.\n" +
                "3. Reload the page and try again!\n\n" +
                "Reverting to Mouse Scribing."
            );
            this.switchMode('mouse');
            return;
        }

        // Pre-emptively fail fast if browser lacks camera API access (occurs in non-secure or restricted sandboxed contexts)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert(
                "Aura Scribing (Webcam Mode) requires a Secure Context (HTTPS or localhost) to access your camera.\n\n" +
                "To resolve this and use Aura Scribing:\n" +
                "1. Ensure you access this prototype via http://localhost:45647 or http://127.0.0.1:45647.\n" +
                "2. If testing on a network or virtual machine, make sure it is recognized as a secure loopback or served over HTTPS.\n\n" +
                "Reverting to Mouse Scribing."
            );
            this.switchMode('mouse');
            return;
        }

        if (this.loader) this.loader.classList.remove('hidden');

        try {
            // Request camera stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            this.video.srcObject = this.stream;
            this.video.classList.add('active');

            // Load hand tracker via ESM dynamic import
            if (!this.handLandmarker) {
                const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs");
                const { HandLandmarker, FilesetResolver } = visionModule;

                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
                );

                const baseOptions = {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
                };

                try {
                    // Attempt WebGL accelerated GPU delegation first
                    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                        baseOptions: { ...baseOptions, delegate: "GPU" },
                        runningMode: "VIDEO",
                        numHands: 1
                    });
                } catch (gpuError) {
                    console.warn("WebGL/GPU initiation failed, falling back to CPU delegation:", gpuError);
                    // Safe client-side CPU fallback (no WebGL context required)
                    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                        baseOptions: { ...baseOptions, delegate: "CPU" },
                        runningMode: "VIDEO",
                        numHands: 1
                    });
                }
            }

            if (this.loader) this.loader.classList.add('hidden');
            this.startWebcamTracking();
        } catch (err) {
            console.error("Webcam initiation failed:", err);
            alert("Unable to open webcam or load the tracking models. Falling back to Mouse Mode.");
            this.switchMode('mouse');
        }
    }

    disableWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
            this.video.classList.remove('active');
        }
        this.isPinching = false;
        this.activeHand = null;
        this.activeHandRaw = null;
        if (this.loader) this.loader.classList.add('hidden');
        this.render();
    }

    startWebcamTracking() {
        const checkFrame = () => {
            if (this.currentMode !== 'webcam') return;

            if (this.video && this.video.readyState === this.video.HAVE_ENOUGH_DATA && this.handLandmarker) {
                try {
                    const results = this.handLandmarker.detectForVideo(this.video, performance.now());
                    this.processHandLandmarks(results);
                } catch (err) {
                    console.error("Webcam tracking frame crashed due to WebGL context issues:", err);
                    alert(
                        "Aura Scribing stopped: WebGL context was lost or is unsupported by your browser.\n\n" +
                        "To resolve this:\n" +
                        "1. Go to your browser Settings -> System -> Enable 'graphics acceleration' / 'hardware acceleration'.\n" +
                        "2. Refresh the page to restore connectivity."
                    );
                    this.switchMode('mouse');
                    return; // Terminate frame tracking loop
                }
            }

            requestAnimationFrame(checkFrame);
        };
        requestAnimationFrame(checkFrame);
    }

    processHandLandmarks(results) {
        if (results.landmarks && results.landmarks.length > 0) {
            const hand = results.landmarks[0];
            this.activeHandRaw = hand;

            const thumb = hand[4];
            const index = hand[8];
            const wrist = hand[0];
            const middleMCP = hand[9];

            // Map index tip coordinates to canvas and mirror
            const canvasX = (1.0 - index.x) * this.canvas.width;
            const canvasY = index.y * this.canvas.height;
            this.activeHand = { x: canvasX, y: canvasY };

            // Calculate Euclidean distance for pinch detection
            const dRaw = Math.sqrt(
                Math.pow(index.x - thumb.x, 2) +
                Math.pow(index.y - thumb.y, 2) +
                Math.pow(index.z - thumb.z, 2)
            );

            // Normalize by reference scale (wrist to middle knuckle)
            const handScale = Math.sqrt(
                Math.pow(middleMCP.x - wrist.x, 2) +
                Math.pow(middleMCP.y - wrist.y, 2) +
                Math.pow(middleMCP.z - wrist.z, 2)
            );

            const dNorm = dRaw / (handScale || 1.0);

            // Double threshold hysteresis
            if (!this.isPinching && dNorm < this.pinchStartDist) {
                this.isPinching = true;
                this.startDrawingCoord(canvasX, canvasY);
            } else if (this.isPinching && dNorm > this.pinchEndDist) {
                this.isPinching = false;
                this.stopDrawing();
            } else if (this.isPinching) {
                this.drawCoord(canvasX, canvasY);
            }
        } else {
            this.activeHand = null;
            this.activeHandRaw = null;
            if (this.isPinching) {
                this.isPinching = false;
                this.stopDrawing();
            }
        }

        this.render();
    }

    startDrawing(e) {
        if (this.currentMode !== 'mouse') return;
        this.isDrawing = true;
        this.recognitionResult = null;
        this.points = [];

        const x = e.offsetX;
        const y = e.offsetY;
        this.points.push(new Point(x, y));

        this.render();
    }

    draw(e) {
        if (this.currentMode !== 'mouse') return;
        if (!this.isDrawing) return;

        const x = e.offsetX;
        const y = e.offsetY;
        this.points.push(new Point(x, y));

        this.render();
    }

    startDrawingCoord(x, y) {
        this.isDrawing = true;
        this.recognitionResult = null;
        this.points = [];
        this.points.push(new Point(x, y));
        this.render();
    }

    drawCoord(x, y) {
        if (!this.isDrawing) return;
        this.points.push(new Point(x, y));
        this.render();
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.points.length > 10) {
            const result = Recognizer.recognize(this.points, this.templates);
            this.recognitionResult = result;
            this.showResult(result);
        } else {
            this.clear();
        }
        this.render();
    }

    showResult(result) {
        const resName = document.getElementById('res-name');
        const resScore = document.getElementById('res-score');
        const resTime = document.getElementById('res-time');
        const container = document.getElementById('canvas-container');

        resName.innerText = result.name;
        resScore.innerText = Math.round(result.score * 100) + '%';
        resTime.innerText = result.time + 'ms';

        if (result.score > 0.7) {
            container.classList.add('recognized');
            setTimeout(() => container.classList.remove('recognized'), 600);

            document.querySelectorAll('.template-icon').forEach(icon => {
                icon.classList.toggle('active', icon.dataset.name === result.name);
            });
        } else {
            resName.innerText = "Unknown";
        }
    }

    renderHandOverlay() {
        if (this.currentMode !== 'webcam') return;

        // Draw skeletal connections
        if (this.activeHandRaw) {
            this.ctx.save();
            this.ctx.strokeStyle = this.isPinching ? 'rgba(0, 255, 170, 0.18)' : 'rgba(125, 95, 255, 0.15)';
            this.ctx.lineWidth = 1.5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                [0, 5], [5, 6], [6, 7], [7, 8], // Index
                [9, 10], [10, 11], [11, 12],   // Middle
                [13, 14], [14, 15], [15, 16],  // Ring
                [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
                [5, 9], [9, 13], [13, 17]       // Palm knuckles
            ];

            connections.forEach(([from, to]) => {
                const p1 = this.activeHandRaw[from];
                const p2 = this.activeHandRaw[to];
                if (p1 && p2) {
                    this.ctx.beginPath();
                    this.ctx.moveTo((1.0 - p1.x) * this.canvas.width, p1.y * this.canvas.height);
                    this.ctx.lineTo((1.0 - p2.x) * this.canvas.width, p2.y * this.canvas.height);
                    this.ctx.stroke();
                }
            });
            this.ctx.restore();
        }

        // Draw glowing pointer at index finger tip
        if (this.activeHand) {
            this.ctx.save();

            const radius = this.isPinching ? 25 : 15;
            const gradient = this.ctx.createRadialGradient(
                this.activeHand.x, this.activeHand.y, 2,
                this.activeHand.x, this.activeHand.y, radius
            );

            if (this.isPinching) {
                gradient.addColorStop(0, 'rgba(0, 255, 170, 1)');
                gradient.addColorStop(0.3, 'rgba(0, 255, 170, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                gradient.addColorStop(0, 'rgba(125, 95, 255, 1)');
                gradient.addColorStop(0.3, 'rgba(125, 95, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(this.activeHand.x, this.activeHand.y, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Glowing core
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowColor = this.isPinching ? '#00ffaa' : '#7d5fff';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(this.activeHand.x, this.activeHand.y, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Guide
        if (this.activeTemplate) {
            this.drawGuide(this.activeTemplate);
        }

        // Draw current points
        if (this.points.length >= 2) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }

            // Style based on state
            if (this.recognitionResult && this.recognitionResult.score > 0.7) {
                this.ctx.strokeStyle = '#00ffaa';
                this.ctx.shadowColor = '#00ffaa';
            } else {
                this.ctx.strokeStyle = '#7d5fff';
                this.ctx.shadowColor = '#7d5fff';
            }

            this.ctx.lineWidth = 4;
            this.ctx.lineJoin = 'round';
            this.ctx.lineCap = 'round';
            this.ctx.shadowBlur = 10;

            this.ctx.stroke();
            this.ctx.restore();
        }

        // Draw webcam tracking elements on top of the drawing
        this.renderHandOverlay();
    }

    clear(resetActive = false) {
        this.points = [];
        this.recognitionResult = null;
        
        document.getElementById('res-name').innerText = "None";
        document.getElementById('res-score').innerText = "0%";
        document.getElementById('res-time').innerText = "0ms";
        
        if (resetActive) {
            document.querySelectorAll('.template-icon').forEach(icon => icon.classList.remove('active'));
            this.activeTemplate = null;
        }
        
        this.render();
    }

    drawGuide(template) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(125, 95, 255, 0.15)';
        this.ctx.lineWidth = 20;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.beginPath();
        const pts = template.renderPoints || template.points;
        this.ctx.moveTo(pts[0].x + centerX, pts[0].y + centerY);
        for (let i = 1; i < pts.length; i++) {
            this.ctx.lineTo(pts[i].x + centerX, pts[i].y + centerY);
        }
        this.ctx.stroke();
        
        this.ctx.strokeStyle = 'rgba(125, 95, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 10]);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    renderTemplatesGrid() {
        const grid = document.getElementById('templates-grid');
        grid.innerHTML = '';
        
        this.templates.forEach(t => {
            const div = document.createElement('div');
            div.className = 'template-icon';
            div.dataset.name = t.name;
            
            const scale = 0.5;
            const offset = 100;
            const pts = t.renderPoints || t.points;
            let svgContent = `<svg viewBox="0 0 200 200">`;
            svgContent += `<path d="M ${pts[0].x * scale + offset} ${pts[0].y * scale + offset}`;
            for(let i=1; i<pts.length; i++) {
                svgContent += ` L ${pts[i].x * scale + offset} ${pts[i].y * scale + offset}`;
            }
            svgContent += `" /></svg>`;
            
            div.innerHTML = svgContent + `<span class="template-label">${t.name}</span>`;
            
            div.addEventListener('click', () => {
                const isActive = div.classList.contains('active');
                this.clear(true);
                
                if (!isActive) {
                    this.activeTemplate = t;
                    this.drawGuide(t);
                    div.classList.add('active');
                }
            });

            grid.appendChild(div);
        });
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
