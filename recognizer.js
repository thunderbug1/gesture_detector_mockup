export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Template {
    constructor(name, points, options = {}) {
        const { numPoints = 64, squareSize = 250.0, origin = { x: 0, y: 0 } } = options;
        this.name = name;
        this.points = Recognizer.resample(points, numPoints);
        const radians = Recognizer.indicativeAngle(this.points);
        this.points = Recognizer.rotateBy(this.points, -radians);
        this.points = Recognizer.scaleTo(this.points, squareSize);
        this.points = Recognizer.translateTo(this.points, origin);
    }
}

export class Recognizer {
    static NumPoints = 64;
    static SquareSize = 250.0;
    static Origin = { x: 0, y: 0 };
    static Diagonal = Math.sqrt(Recognizer.SquareSize * Recognizer.SquareSize + Recognizer.SquareSize * Recognizer.SquareSize);
    static HalfDiagonal = 0.5 * Recognizer.Diagonal;
    static AngleRange = Math.PI / 4; // 45 degrees
    static AnglePrecision = Math.PI / 90; // 2 degrees
    static Phi = 0.5 * (-1.0 + Math.sqrt(5.0)); // Golden Ratio

    static recognize(points, templates) {
        const t0 = performance.now();
        
        // 1. Preprocess
        points = this.resample(points, this.NumPoints);
        const radians = this.indicativeAngle(points);
        points = this.rotateBy(points, -radians);
        points = this.scaleTo(points, this.SquareSize);
        points = this.translateTo(points, this.Origin);

        let bestDist = Infinity;
        let bestTemplate = null;

        for (const template of templates) {
            const d = this.distanceAtBestAngle(points, template, -this.AngleRange, this.AngleRange, this.AnglePrecision);
            if (d < bestDist) {
                bestDist = d;
                bestTemplate = template;
            }
        }

        const t1 = performance.now();
        const score = 1.0 - (bestDist / this.HalfDiagonal);
        
        return {
            name: bestTemplate ? bestTemplate.name : "Unknown",
            score: Math.max(score, 0),
            time: Math.round(t1 - t0)
        };
    }

    static resample(points, n) {
        const I = this.pathLength(points) / (n - 1);
        let D = 0.0;
        const newPoints = [points[0]];
        const pts = [...points];
        
        for (let i = 1; i < pts.length; i++) {
            const d = this.distance(pts[i - 1], pts[i]);
            if ((D + d) >= I) {
                const qx = pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x);
                const qy = pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y);
                const q = new Point(qx, qy);
                newPoints.push(q);
                pts.splice(i, 0, q);
                D = 0.0;
            } else {
                D += d;
            }
        }
        
        if (newPoints.length === n - 1) {
            newPoints.push(pts[pts.length - 1]);
        }
        return newPoints;
    }

    static indicativeAngle(points) {
        const c = this.centroid(points);
        // Find point farthest from centroid for stable rotation axis
        let maxD = -1;
        let refPoint = points[0];
        for (const p of points) {
            const d = this.distance(c, p);
            if (d > maxD) {
                maxD = d;
                refPoint = p;
            }
        }
        return Math.atan2(c.y - refPoint.y, c.x - refPoint.x);
    }

    static rotateBy(points, radians) {
        const c = this.centroid(points);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return points.map(p => {
            const qx = (p.x - c.x) * cos - (p.y - c.y) * sin + c.x;
            const qy = (p.x - c.x) * sin + (p.y - c.y) * cos + c.y;
            return new Point(qx, qy);
        });
    }

    static scaleTo(points, size) {
        const B = this.boundingBox(points);
        return points.map(p => new Point(
            p.x * (size / Math.max(B.width, 1)),
            p.y * (size / Math.max(B.height, 1))
        ));
    }

    static translateTo(points, pt) {
        const c = this.centroid(points);
        return points.map(p => new Point(p.x + pt.x - c.x, p.y + pt.y - c.y));
    }

    static distanceAtBestAngle(points, template, a, b, threshold) {
        let x1 = this.Phi * a + (1.0 - this.Phi) * b;
        let f1 = this.distanceAtAngle(points, template, x1);
        let x2 = (1.0 - this.Phi) * a + this.Phi * b;
        let f2 = this.distanceAtAngle(points, template, x2);
        
        while (Math.abs(b - a) > threshold) {
            if (f1 < f2) {
                b = x2;
                x2 = x1;
                f2 = f1;
                x1 = this.Phi * a + (1.0 - this.Phi) * b;
                f1 = this.distanceAtAngle(points, template, x1);
            } else {
                a = x1;
                x1 = x2;
                f1 = f2;
                x2 = (1.0 - this.Phi) * a + this.Phi * b;
                f2 = this.distanceAtAngle(points, template, x2);
            }
        }
        return Math.min(f1, f2);
    }

    static distanceAtAngle(points, template, radians) {
        const newPoints = this.rotateBy(points, radians);
        return this.pathDistance(newPoints, template.points);
    }

    static pathDistance(pts1, pts2) {
        const dForward = this.cyclicPathDistance(pts1, pts2);
        const pts1Rev = [...pts1].reverse();
        const dBackward = this.cyclicPathDistance(pts1Rev, pts2);
        return Math.min(dForward, dBackward);
    }

    static cyclicPathDistance(pts1, pts2) {
        const n = pts1.length;
        let minD = Infinity;
        const isClosed = this.distance(pts1[0], pts1[n - 1]) < (this.SquareSize * 0.3);
        const step = isClosed ? 1 : n;
        
        for (let shift = 0; shift < n; shift += step) {
            let d = 0.0;
            for (let i = 0; i < n; i++) {
                d += this.distance(pts1[(i + shift) % n], pts2[i]);
            }
            if (d < minD) minD = d;
        }
        return minD / n;
    }

    static pathLength(points) {
        let d = 0.0;
        for (let i = 1; i < points.length; i++) {
            d += this.distance(points[i - 1], points[i]);
        }
        return d;
    }

    static distance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    static centroid(points) {
        const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        return new Point(sum.x / points.length, sum.y / points.length);
    }

    static boundingBox(points) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
}
