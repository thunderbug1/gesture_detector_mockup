import { Point, Template } from './recognizer.js';

export const getTemplates = () => {
    const templates = [];

    // Circle
    const circle = [];
    for (let i = 0; i < 360; i += 10) {
        const r = i * Math.PI / 180;
        circle.push(new Point(100 + 50 * Math.cos(r), 100 + 50 * Math.sin(r)));
    }
    templates.push(new Template("Circle", circle));

    // Triangle
    templates.push(new Template("Triangle", [
        new Point(100, 50), new Point(150, 150),
        new Point(50, 150), new Point(100, 50)
    ]));

    // Square
    templates.push(new Template("Square", [
        new Point(50, 50), new Point(150, 50),
        new Point(150, 150), new Point(50, 150),
        new Point(50, 50)
    ]));

    // V
    templates.push(new Template("V", [
        new Point(50, 50), new Point(100, 150), new Point(150, 50)
    ]));

    // ZigZag
    templates.push(new Template("ZigZag", [
        new Point(50, 50), new Point(150, 50),
        new Point(50, 150), new Point(150, 150)
    ]));

    // Lightning
    templates.push(new Template("Bolt", [
        new Point(100, 20), new Point(60, 100),
        new Point(120, 100), new Point(80, 180)
    ]));

    // Star (Single stroke)
    templates.push(new Template("Star", [
        new Point(100, 10), new Point(125, 80),
        new Point(190, 80), new Point(140, 125),
        new Point(160, 190), new Point(100, 150),
        new Point(40, 190), new Point(60, 125),
        new Point(10, 80), new Point(75, 80),
        new Point(100, 10)
    ]));

    // Spiral (Clockwise)
    const spiralCW = [];
    for (let i = 720; i >= 0; i -= 10) {
        const r = i * Math.PI / 180;
        const dist = i / 10;
        spiralCW.push(new Point(100 + dist * Math.cos(r), 100 + dist * Math.sin(r)));
    }
    templates.push(new Template("Spiral", spiralCW));

    // Counter-Spiral (Counter-Clockwise)
    const spiralCCW = [];
    for (let i = 720; i >= 0; i -= 10) {
        const r = -i * Math.PI / 180;
        const dist = i / 10;
        spiralCCW.push(new Point(100 + dist * Math.cos(r), 100 + dist * Math.sin(r)));
    }
    templates.push(new Template("Counter-Spiral", spiralCCW));

    return templates;
};
