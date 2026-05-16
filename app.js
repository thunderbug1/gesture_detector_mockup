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

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('pointerdown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('pointermove', (e) => this.draw(e));
        this.canvas.addEventListener('pointerup', (e) => this.stopDrawing(e));

        document.getElementById('clear-btn').addEventListener('click', () => this.clear(true));

        this.renderTemplatesGrid();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.clear();
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.clear();
        
        if (this.activeTemplate) {
            this.drawGuide(this.activeTemplate);
        }

        const x = e.offsetX;
        const y = e.offsetY;
        this.points = [new Point(x, y)];
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.strokeStyle = '#7d5fff';
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#7d5fff';
    }

    draw(e) {
        if (!this.isDrawing) return;
        const x = e.offsetX;
        const y = e.offsetY;
        this.points.push(new Point(x, y));
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.points.length > 10) {
            const result = Recognizer.recognize(this.points, this.templates);
            this.showResult(result);
        } else {
            this.clear();
        }
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

            this.ctx.strokeStyle = '#00ffaa';
            this.ctx.shadowColor = '#00ffaa';
            this.ctx.stroke();
        } else {
            resName.innerText = "Unknown";
        }
    }

    clear(resetActive = false) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.shadowBlur = 0;
        this.ctx.setLineDash([]);
        
        document.getElementById('res-name').innerText = "None";
        document.getElementById('res-score').innerText = "0%";
        document.getElementById('res-time').innerText = "0ms";
        
        if (resetActive) {
            document.querySelectorAll('.template-icon').forEach(icon => icon.classList.remove('active'));
            this.activeTemplate = null;
        }
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
        const pts = template.points;
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
            let svgContent = `<svg viewBox="0 0 200 200">`;
            svgContent += `<path d="M ${t.points[0].x * scale + offset} ${t.points[0].y * scale + offset}`;
            for(let i=1; i<t.points.length; i++) {
                svgContent += ` L ${t.points[i].x * scale + offset} ${t.points[i].y * scale + offset}`;
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
